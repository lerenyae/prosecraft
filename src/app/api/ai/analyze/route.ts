import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

interface AnalyzeRequest {
  mode: 'chapter' | 'selection';
  chapterTitle?: string;
  chapterContent?: string;
  selectedText?: string;
  context?: string;
  genre?: string;
}

function stripHtml(html: string): string {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function getChapterPrompt(genre?: string): string {
  const g = genre ? `a ${genre} manuscript` : 'a manuscript';
  return `You are a sharp, experienced beta reader analyzing a chapter of ${g}. You read like a trusted friend who also happens to be a professional editor — honest, specific, and constructive.

Analyze the chapter and return annotations in this exact JSON format:
{
  "annotations": [
    {
      "type": "show-dont-tell" | "pacing" | "dialogue" | "pov" | "tension" | "prose" | "structure",
      "severity": "praise" | "suggestion" | "warning",
      "quote": "exact short quote from the text (max 80 chars)",
      "note": "your editorial observation — be specific and actionable"
    }
  ],
  "summary": {
    "overall": "2-3 sentence overall impression",
    "strengths": ["specific strength 1", "specific strength 2"],
    "focus": "the single most impactful thing the writer should work on"
  }
}

Rules:
- Return 5-12 annotations depending on chapter length
- Mix praise with suggestions — always acknowledge what works
- Quote the EXACT text when flagging issues (short quotes, max 80 chars)
- Be specific: "this dialogue tag slows the beat" not "dialogue could be improved"
- For show-dont-tell: flag emotional telling ("she felt angry") and suggest showing
- For pacing: flag rushed or dragging sections
- For dialogue: flag unnatural speech, info-dumping in dialogue, weak tags
- For tension: flag where stakes drop or conflict stalls
- For prose: flag overwriting, cliches, filter words, passive voice
- For structure: flag scene transitions, chapter arc, opening/closing strength
- Severity "praise" = something that works well, "suggestion" = could be better, "warning" = needs attention
- Return ONLY valid JSON, no markdown wrapping`;
}

function getSelectionPrompt(genre?: string): string {
  const g = genre ? `a ${genre} manuscript` : 'a manuscript';
  return `You are a sharp beta reader giving focused feedback on a specific passage from ${g}. The writer highlighted this text and asked "what do you think?"

Analyze the selected passage and return feedback in this exact JSON format:
{
  "annotations": [
    {
      "type": "show-dont-tell" | "pacing" | "dialogue" | "pov" | "tension" | "prose" | "structure",
      "severity": "praise" | "suggestion" | "warning",
      "quote": "exact short quote from the selection (max 80 chars)",
      "note": "your editorial observation — specific and actionable"
    }
  ],
  "summary": {
    "overall": "1-2 sentence focused assessment of this passage",
    "strengths": ["what works in this passage"],
    "focus": "the one thing that would most improve this passage"
  }
}

Rules:
- Return 2-5 annotations for the selection
- Be specific to the actual text — don't give generic writing advice
- Always include at least one "praise" annotation
- Quote from the selected text, not surrounding context
- Return ONLY valid JSON, no markdown wrapping`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { mode, genre } = body;

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === 'selection') {
      if (!body.selectedText) {
        return NextResponse.json({ error: 'Missing selectedText' }, { status: 400 });
      }
      systemPrompt = getSelectionPrompt(genre);
      userPrompt = body.context
        ? `Context (surrounding text):\n${body.context}\n\nSelected passage to analyze:\n${body.selectedText}`
        : `Selected passage to analyze:\n${body.selectedText}`;
    } else {
      if (!body.chapterContent) {
        return NextResponse.json({ error: 'Missing chapterContent' }, { status: 400 });
      }
      const plainText = stripHtml(body.chapterContent);
      if (plainText.length === 0) {
        return NextResponse.json({ error: 'Chapter content is empty' }, { status: 400 });
      }
      systemPrompt = getChapterPrompt(genre);
      userPrompt = body.chapterTitle
        ? `Chapter: "${body.chapterTitle}"\n\n${plainText}`
        : plainText;
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
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

    // Add IDs to annotations
    result.annotations = (result.annotations || []).map((a: any, i: number) => ({
      ...a,
      id: `ann-${Date.now()}-${i}`,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in analyze route:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
