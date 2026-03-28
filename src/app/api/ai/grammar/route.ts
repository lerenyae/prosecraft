import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

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
    const { content, genre } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const plainText = stripHtml(content);
    if (plainText.length < 50) {
      return NextResponse.json({ error: 'Not enough text to score' }, { status: 400 });
    }

    const g = genre || 'Fiction';

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a grammar and language expert scoring a passage from a ${g} manuscript. Rate it on two dimensions, adjusting your standards to the genre. For example, literary fiction demands richer prose while thrillers prioritize clarity and pace. Casual dialogue is fine in the right context.

Return ONLY valid JSON:
{
  "grammar": {
    "score": 0-100,
    "label": "Excellent" | "Strong" | "Good" | "Needs Work" | "Rough",
    "issues": ["specific issue 1", "specific issue 2"],
    "note": "1-sentence summary"
  },
  "language": {
    "score": 0-100,
    "label": "Excellent" | "Strong" | "Good" | "Needs Work" | "Rough",
    "qualities": ["specific quality 1", "specific quality 2"],
    "note": "1-sentence summary"
  }
}

Grammar: correctness, punctuation, agreement, tense consistency, sentence structure.
Language: vocabulary range, sentence variety, rhythm, genre-appropriate style, voice strength.

Be honest. 70 is competent. 85+ is strong. 95+ is exceptional. Adjust for genre expectations.`,
      messages: [{ role: 'user', content: plainText.slice(0, 5000) }],
    });

    const responseContent = message.content[0];
    if (responseContent.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    let jsonString = responseContent.text.trim();
    if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7);
    else if (jsonString.startsWith('```')) jsonString = jsonString.slice(3);
    if (jsonString.endsWith('```')) jsonString = jsonString.slice(0, -3);

    const result = JSON.parse(jsonString.trim());
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in grammar route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
