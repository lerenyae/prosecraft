import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

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
    const { messages, chapterContent, chapterTitle, genre, chapterPosition, memoryContext } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const plainText = stripHtml(chapterContent || '');
    const g = genre ? `a ${genre} manuscript` : 'a manuscript';
    const chTitle = chapterTitle ? ` titled "${chapterTitle}"` : '';
    const pos = chapterPosition ? ` (${chapterPosition})` : '';
    const persona = getEditorialPersona(genre);

    // Build memory section if available
    const memorySection = memoryContext
      ? `\n\nPROJECT MEMORY (facts the author has established across sessions):\n${memoryContext}\n\nUse these facts to maintain consistency. Reference them when relevant but do not repeat them back verbatim unless asked.`
      : '';

    const systemPrompt = `${persona}

You are embedded in a writing studio, helping the author revise their chapter${chTitle}${pos} from ${g}.${memorySection}

CHAPTER TEXT:
---
${plainText.slice(0, 12000)}
${plainText.length > 12000 ? '\n[...chapter truncated]' : ''}
---

RULES:
- Keep responses SHORT. 2-4 focused paragraphs max. No filler.
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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: apiMessages,
    });

    const responseContent = message.content[0];
    if (responseContent.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    return NextResponse.json({ response: responseContent.text });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
