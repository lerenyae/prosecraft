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
}

function stripHtml(html: string): string {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, chapterContent, chapterTitle, genre, chapterPosition } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const plainText = stripHtml(chapterContent || '');
    const g = genre ? `a ${genre} manuscript` : 'a manuscript';
    const chTitle = chapterTitle ? ` titled "${chapterTitle}"` : '';
    const pos = chapterPosition ? ` (${chapterPosition})` : '';

    const systemPrompt = `You are an expert fiction editor and writing coach embedded in a writing studio. You are helping the author revise and improve their chapter${chTitle}${pos} from ${g}.

CHAPTER TEXT (for reference — the author may ask you about specific passages, characters, pacing, dialogue, or anything else):
---
${plainText.slice(0, 12000)}
${plainText.length > 12000 ? '\n[...chapter continues, truncated for context window]' : ''}
---

Guidelines:
- Be specific. Reference actual sentences and passages from the chapter when giving feedback.
- Be concise and actionable — this is a working session, not a lecture.
- When suggesting rewrites, show the original and the revised version.
- Respect the author's voice. Suggest improvements that strengthen their style, don't impose yours.
- If the author asks you to rewrite a passage, match the tone and style of the surrounding text.
- You can discuss plot, character motivation, pacing, dialogue, prose style, word choice, or any craft element.
- If the author pastes new text, analyze it in context of the full chapter.`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const apiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
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
