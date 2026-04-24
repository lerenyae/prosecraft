import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

interface SummarizeRequest {
  chapterTitle?: string;
  chapterContent: string;
  genre?: string;
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SummarizeRequest;
    const { chapterTitle, chapterContent, genre } = body;

    const plainText = stripHtml(chapterContent || '');
    if (!plainText || plainText.length < 200) {
      return NextResponse.json({ summary: plainText || '(empty chapter)' });
    }

    const g = genre ? ` (${genre})` : '';
    const titleLine = chapterTitle ? `Chapter: "${chapterTitle}"` : 'Chapter';

    const systemPrompt = `You compress manuscript chapters into structured notes another editor can use for continuity checks${g}.

Return 150-250 words in this exact shape, no markdown:

SETTING: [place, time, atmosphere]
CHARACTERS PRESENT: [names + one-clause state/role]
BEATS: [3-6 short sentences listing what actually happens, in order]
OPEN THREADS: [unresolved questions, promises, Chekhov's guns left loaded]
VOICE/POV: [narrator, tense, distance]
END STATE: [where characters emotionally and physically land]

Be specific. Name names. Quote 1-2 distinctive phrases if voice matters. Never editorialize — this is a continuity note, not a review.`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${titleLine}\n\n---\n${plainText.slice(0, 40000)}${plainText.length > 40000 ? '\n[...truncated]' : ''}`,
        },
      ],
    });

    const responseContent = message.content[0];
    if (responseContent.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    return NextResponse.json({ summary: responseContent.text.trim() });
  } catch (error) {
    console.error('Error in summarize route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
