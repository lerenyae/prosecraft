import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

// Allow up to 60s for Whole Book chats. Default Vercel timeout of 10s was
// causing the Whole Book request to hang for minutes, then fail silently.
export const maxDuration = 60;
export const runtime = 'nodejs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  chapterContent: string;
  chapterTitle?: string;
  genre?: string;
  chapterPosition?: string;
  memoryContext?: string;
  wholeBookContext?: string;
  wholeBookMode?: 'full' | 'summaries' | 'off';
}

function stripHtml(html: string): string {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// Genre-to-persona mapping for tailored editorial feedback
function getEditorialPersona(genre?: string): string {
  const g = (genre || '').toLowerCase();

  if (g.includes('literary') || g.includes('lit fic'))
    return 'You are a seasoned literary fiction editor with a sharp eye for prose rhythm, subtext, and thematic resonance. You value precision of language and emotional authenticity.';
  if (g.includes('romance'))
    return 'You are an experienced romance editor who understands emotional beats, chemistry development, and reader expectations. You focus on tension, pacing of the relationship arc, and authentic emotional stakes.';
  if (g.includes('thriller') || g.includes('suspense') || g.includes('mystery'))
    return 'You are a thriller/suspense editor who prioritizes tension, pacing, and narrative momentum. You watch for information control, red herrings, and stakes escalation.';
  if (g.includes('fantasy') || g.includes('sci-fi') || g.includes('science fiction'))
    return 'You are a speculative fiction editor skilled in worldbuilding consistency, magic/tech system logic, and balancing exposition with narrative momentum.';
  if (g.includes('horror'))
    return 'You are a horror editor attuned to dread, atmosphere, and the psychology of fear. You focus on pacing the buildup, sensory detail, and knowing when to reveal vs. conceal.';
  if (g.includes('ya') || g.includes('young adult'))
    return 'You are a YA editor who understands authentic teen voice, coming-of-age arcs, and the balance between accessibility and depth.';
  if (g.includes('historical'))
    return 'You are a historical fiction editor who values period authenticity, grounded detail, and the balance between research and narrative drive.';
  if (g.includes('memoir') || g.includes('creative nonfiction'))
    return 'You are a memoir/creative nonfiction editor who focuses on narrative structure, emotional honesty, and the balance between reflection and scene.';

  return 'You are an expert fiction editor and writing coach with deep craft knowledge across genres.';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, chapterContent, chapterTitle, genre, chapterPosition, memoryContext, wholeBookContext, wholeBookMode } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const plainText = stripHtml(chapterContent || '');
    const g = genre ? `a ${genre} manuscript` : 'a manuscript';
    const chTitle = chapterTitle ? ` titled "${chapterTitle}"` : '';
    const pos = chapterPosition ? ` (${chapterPosition})` : '';
    const persona = getEditorialPersona(genre);

    const memorySection = memoryContext
      ? `\n\nPROJECT MEMORY (facts the author has established across sessions):\n${memoryContext}\n\nUse these facts to maintain consistency. Reference them when relevant but do not repeat them back verbatim unless asked.`
      : '';

    // Whole-book context block. Cap hard at ~120k chars (~30k tokens) so the
    // total prompt leaves plenty of headroom inside Sonnet's window and the
    // 60s function budget.
    let wholeBookSection = '';
    let wholeBookRule = '';
    if (wholeBookContext && wholeBookMode && wholeBookMode !== 'off') {
      const modeLabel =
        wholeBookMode === 'full'
          ? 'FULL MANUSCRIPT TEXT (all chapters verbatim)'
          : 'MANUSCRIPT CONTINUITY NOTES (per-chapter structured summaries)';
      const truncated = wholeBookContext.slice(0, 120000);
      wholeBookSection = `\n\n${modeLabel}:\n===\n${truncated}\n${wholeBookContext.length > 120000 ? '\n[...manuscript truncated to fit context]' : ''}\n===`;
      wholeBookRule =
        wholeBookMode === 'full'
          ? '\n- You have the full manuscript above. Cross-reference freely: name drift, timeline gaps, setup/payoff, thematic echoes, tonal consistency. Cite the chapter when pulling from outside the current one.'
          : '\n- You have continuity notes for every chapter above. Use them to check alignment, flag setup without payoff, and catch contradictions. Admit uncertainty when a note is vague rather than guessing.';
    }

    const systemPrompt = `${persona}

You are embedded in a writing studio, helping the author revise their chapter${chTitle}${pos} from ${g}.${memorySection}${wholeBookSection}

CURRENT CHAPTER TEXT:
---
${plainText.slice(0, 12000)}
${plainText.length > 12000 ? '\n[...chapter truncated]' : ''}
---

RULES:
- Keep responses SHORT. 2-4 focused paragraphs max. No filler.${wholeBookRule}
- Reference specific lines or passages when giving feedback.
- When suggesting a rewrite, quote the original then show the revision. Keep rewrites tight.
- Do NOT use markdown formatting. No asterisks for bold, no hashtags for headers, no bullet lists. Write in natural prose. Use quotation marks to highlight passages.
- Match the author's voice. Strengthen their style, do not impose yours.
- Give feedback calibrated to the genre and the author's apparent skill level.
- Be direct and professional. Say what works, say what does not, and why.
- If asked to rewrite, match the tone of the surrounding text.`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const apiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const maxTokens = wholeBookMode && wholeBookMode !== 'off' ? 1200 : 800;

    // Stream the response as plain text chunks. ChatPanel consumes the body
    // as a ReadableStream so the user sees tokens land progressively instead
    // of staring at a spinner for 60+ seconds on Whole Book prompts.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const aiStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: apiMessages,
          });

          for await (const event of aiStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }

          controller.close();
        } catch (err) {
          console.error('Chat stream error:', err);
          try {
            controller.enqueue(
              encoder.encode('\n\n[stream error — please retry]')
            );
          } catch {
            /* noop */
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
