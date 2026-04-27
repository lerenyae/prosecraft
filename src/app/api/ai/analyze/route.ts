import { NextRequest, NextResponse } from 'next/server';
import { buildPersonalizationPrompt, type WriterProfile, type StyleProfile } from '@/lib/personalization';
import { runAIRequest, parseAIJson, AIRequestError } from '@/lib/ai-request';
import { getCurrentTier, upgradeRequired } from '@/lib/userTier';

export const maxDuration = 60;
export const runtime = 'nodejs';

interface AnalyzeRequest {
  mode: 'chapter' | 'selection';
  chapterTitle?: string;
  chapterContent?: string;
  selectedText?: string;
  context?: string;
  genre?: string;
  chapterNumber?: number;
  totalChapters?: number;
  writerProfile?: WriterProfile | null;
  styleProfile?: StyleProfile | null;
  writingRules?: string[] | null;
}

function stripHtml(html: string): string {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function buildWritingRulesBlock(rules?: string[] | null): string {
  if (!rules || rules.length === 0) return '';
  const cleaned = rules.map(r => r.trim()).filter(Boolean);
  if (!cleaned.length) return '';
  return `\n\n---\nWRITING RULES (hard constraints from the author):\n- ${cleaned.join('\n- ')}\n\nAny suggestion or rewrite you produce MUST respect these rules. If the author's own prose already violates a rule, flag it as a warning annotation.\n---\n`;
}

function getChapterPrompt(genre?: string): string {
  const g = genre ? `a ${genre} manuscript` : 'a manuscript';
  return `You are a sharp, experienced beta reader analyzing a chapter of ${g}.

You read like a trusted friend who also happens to be a professional editor: honest, specific, and constructive.

Analyze the chapter and return annotations in this exact JSON format:

{
  "annotations": [
    {
      "type": "show-dont-tell" | "pacing" | "dialogue" | "pov" | "tension" | "prose" | "structure",
      "severity": "praise" | "suggestion" | "warning",
      "quote": "exact short quote from the text (max 80 chars)",
      "note": "your editorial observation, be specific and actionable",
      "suggestion": "ONLY the replacement text itself, a direct rewrite the writer can copy-paste into their manuscript. No labels, no 'Consider:', no explanation. Just the new prose."
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
- Mix praise with suggestions, always acknowledge what works
- Quote the EXACT text when flagging issues (short quotes, max 80 chars)
- Be specific: "this dialogue tag slows the beat" not "dialogue could be improved"
- For show-dont-tell: flag emotional telling ("she felt angry") and suggest showing
- For pacing: flag rushed or dragging sections
- For dialogue: flag unnatural speech, info-dumping in dialogue, weak tags
- For tension: flag where stakes drop or conflict stalls
- For prose: flag overwriting, cliches, filter words, passive voice
- For structure: flag scene transitions, chapter arc, opening/closing strength
- Severity "praise" = something that works well, "suggestion" = could be better, "warning" = needs attention
- For suggestions and warnings, include a "suggestion" field with ONLY the replacement prose. No labels like "Consider:", no explanations, just the rewrite ready to paste
- For praise, omit the "suggestion" field
- Return ONLY valid JSON, no markdown wrapping`;
}

function getSelectionPrompt(genre?: string): string {
  const g = genre ? `a ${genre} manuscript` : 'a manuscript';
  return `You are a sharp beta reader giving focused feedback on a specific passage from ${g}.

The writer highlighted this text and asked "what do you think?"

Analyze the selected passage and return feedback in this exact JSON format:

{
  "annotations": [
    {
      "type": "show-dont-tell" | "pacing" | "dialogue" | "pov" | "tension" | "prose" | "structure",
      "severity": "praise" | "suggestion" | "warning",
      "quote": "exact short quote from the selection (max 80 chars)",
      "note": "your editorial observation, specific and actionable",
      "suggestion": "ONLY the replacement text, a direct rewrite ready to copy-paste. No labels, no explanation. Just the new prose."
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
- Be specific to the actual text, don't give generic writing advice
- Always include at least one "praise" annotation
- Quote from the selected text, not surrounding context
- Return ONLY valid JSON, no markdown wrapping`;
}

export async function POST(request: NextRequest) {
  if ((await getCurrentTier()) === 'free') {
    return upgradeRequired(
      'Deep chapter analysis (Beta Reader / Story Intelligence) is an Author-plan feature.'
    );
  }

  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const { mode, genre, writerProfile, styleProfile, writingRules } = body;

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
    const positionContext = body.chapterNumber && body.totalChapters
      ? `[This is chapter ${body.chapterNumber} of ${body.totalChapters} in the manuscript]\n\n`
      : '';
    userPrompt = body.chapterTitle
      ? `${positionContext}Chapter: "${body.chapterTitle}"\n\n${plainText}`
      : `${positionContext}${plainText}`;
  }

  const fullSystem =
    systemPrompt +
    buildPersonalizationPrompt(writerProfile, styleProfile) +
    buildWritingRulesBlock(writingRules);

  try {
    const { text, modelUsed, fallbackUsed } = await runAIRequest({
      tier: 'DEEP',
      system: fullSystem,
      userPrompt,
      maxTokens: 4096,
    });

    const result = parseAIJson<{ annotations?: any[]; summary?: unknown }>(text);
    result.annotations = (result.annotations || []).map((a: any, i: number) => ({
      ...a,
      id: `ann-${Date.now()}-${i}`,
    }));

    return NextResponse.json({ ...result, _meta: { modelUsed, fallbackUsed } });
  } catch (error) {
    if (error instanceof AIRequestError) {
      return NextResponse.json({ error: error.publicMessage }, { status: error.status });
    }
    console.error('Error in analyze route:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Analyze failed: ${msg}` }, { status: 500 });
  }
}
