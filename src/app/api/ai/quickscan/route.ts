import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

interface QuickScanRequest {
  content: string;
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
    const body = (await request.json()) as QuickScanRequest;
    const { content, chapterTitle, genre, chapterPosition } = body;

    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const plainText = stripHtml(content);
    if (plainText.length < 50) {
      return NextResponse.json({ error: 'Need at least 50 words to scan' }, { status: 400 });
    }

    const g = genre ? `a ${genre} manuscript` : 'a manuscript';
    const posContext = chapterPosition ? ` This is ${chapterPosition}.` : '';

    const systemPrompt = `You are a fast, sharp manuscript scanner. You're scanning a chapter from ${g}.${posContext}

Give a QUICK health check — the writer wants a 10-second read, not a full critique. Be direct, specific, no filler.

Return this exact JSON:
{
  "verdict": "one punchy sentence — the single most important thing about this chapter",
  "scores": {
    "pacing": { "score": 1-10, "label": "one word: Breakneck|Swift|Steady|Measured|Slow|Dragging" },
    "prose": { "score": 1-10, "label": "one word: Polished|Clean|Solid|Rough|Bloated|Purple" },
    "dialogue": { "score": 1-10, "label": "one word: Natural|Sharp|Functional|Stiff|Wooden|None" },
    "tension": { "score": 1-10, "label": "one word: Electric|High|Building|Flat|Absent|Forced" },
    "clarity": { "score": 1-10, "label": "one word: Crystal|Clear|Good|Muddy|Confused|Lost" }
  },
  "flags": [
    "short actionable flag — max 60 chars each"
  ],
  "strengths": [
    "short specific strength — max 60 chars each"
  ]
}

Rules:
- Return 2-4 flags (things to fix) and 1-3 strengths (things working)
- Scores are 1-10 where 7+ is good, 5-6 is okay, below 5 needs work
- Be brutally specific — "too many filter words in paragraphs 3-5" not "prose could be tighter"
- If dialogue score is low because there IS no dialogue, label it "None" and flag it only if dialogue would help
- Return ONLY valid JSON, no markdown wrapping`;

    const userPrompt = chapterTitle
      ? `Chapter: "${chapterTitle}"\n\n${plainText}`
      : plainText;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
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
    console.error('Error in quickscan route:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
