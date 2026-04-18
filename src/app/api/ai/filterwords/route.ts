import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

interface FilterWordsRequest {
  content: string;
  filterWords: string[];
  genre?: string;
  chapterTitle?: string;
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
    const body = (await request.json()) as FilterWordsRequest;
    const { content, filterWords, genre, chapterTitle } = body;

    if (!content || !filterWords || filterWords.length === 0) {
      return NextResponse.json({ error: 'Missing content or filterWords' }, { status: 400 });
    }

    const plainText = stripHtml(content);
    if (plainText.length < 50) {
      return NextResponse.json({ error: 'Need at least 50 words to analyze' }, { status: 400 });
    }

    const g = genre ? `a ${genre} manuscript` : 'a manuscript';
    const chContext = chapterTitle ? ` The chapter is titled "${chapterTitle}".` : '';

    const systemPrompt = `You are a precise prose editor analyzing filter words and overused phrases in ${g}.${chContext}

For each flagged word/phrase, explain WHY it weakens the prose in the context of this specific chapter. Reference actual sentences from the text. Be concise and actionable.

Return this exact JSON:
{
  "analysis": [
    {
      "word": "the filter word",
      "count": number of occurrences,
      "severity": "high" | "medium" | "low",
      "explanation": "1-2 sentences explaining why this word is a problem HERE — reference a specific sentence from the chapter",
      "example": "an actual sentence from the text containing this word",
      "fix": "the same sentence rewritten without the filter word"
    }
  ]
}

Rules:
- Analyze ONLY the words provided in the list
- severity: "high" = 10+ uses or significantly weakens prose, "medium" = 5-9 uses, "low" = 3-4 uses
- Quote REAL sentences from the text — don't invent examples
- The fix should show how removing the filter word strengthens the sentence
- Be specific to this chapter's voice and content
- Return ONLY valid JSON, no markdown wrapping`;

    const userPrompt = `Filter words to analyze: ${filterWords.join(', ')}

Chapter text:
${plainText}`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
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
    console.error('Error in filterwords route:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
