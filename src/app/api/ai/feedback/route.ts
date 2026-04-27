import { NextRequest, NextResponse } from 'next/server';
import { buildPersonalizationPrompt, type WriterProfile, type StyleProfile } from '@/lib/personalization';
import { runAIRequest, parseAIJson, AIRequestError } from '@/lib/ai-request';
import { getCurrentTier, upgradeRequired } from '@/lib/userTier';

export const maxDuration = 60;
export const runtime = 'nodejs';

interface FeedbackRequest {
  chapterTitle: string;
  chapterContent: string;
  genre?: string;
  priorChaptersSummary?: string;
  writerProfile?: WriterProfile | null;
  styleProfile?: StyleProfile | null;
  writingRules?: string[] | null;
}

interface ShowDontTellViolation {
  text: string;
  suggestion: string;
}

interface DevelopmentalFeedback {
  pacing: {
    rating: 'slow' | 'balanced' | 'fast';
    notes: string;
  };
  tension: {
    rating: number;
    arc_description: string;
  };
  dialogue: {
    quality: number;
    issues: string[];
  };
  pov_consistency: {
    consistent: boolean;
    issues: string[];
  };
  show_dont_tell: {
    violations: ShowDontTellViolation[];
  };
  strengths: string[];
  priorities: string[];
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

function buildWritingRulesBlock(rules?: string[] | null): string {
  if (!rules || rules.length === 0) return '';
  const cleaned = rules.map(r => r.trim()).filter(Boolean);
  if (!cleaned.length) return '';
  return `\n\n---\nWRITING RULES (hard constraints from the author):\n- ${cleaned.join('\n- ')}\n\nAny rewrite you produce MUST respect these rules. Flag violations in the author's own prose under "priorities".\n---\n`;
}

function getSystemPrompt(genre?: string): string {
  const genreContext = genre
    ? `You are a developmental editor analyzing a chapter of a ${genre} manuscript.`
    : 'You are a developmental editor analyzing a chapter of a manuscript.';

  return `${genreContext}

Provide structured feedback in valid JSON format with this exact structure:
{
  "pacing": {
    "rating": "slow" | "balanced" | "fast",
    "notes": "specific observations about pacing and scene rhythm"
  },
  "tension": {
    "rating": 1-10,
    "arc_description": "description of the tension arc throughout the chapter"
  },
  "dialogue": {
    "quality": 1-10,
    "issues": ["specific dialogue problems or strengths"]
  },
  "pov_consistency": {
    "consistent": true or false,
    "issues": ["any POV shifts or consistency problems"]
  },
  "show_dont_tell": {
    "violations": [
      {
        "text": "exact quoted text from the chapter",
        "suggestion": "how to rewrite this as showing instead of telling"
      }
    ]
  },
  "strengths": ["list of what works well in this chapter"],
  "priorities": ["top 3 most important things to revise or fix"]
}

Be specific and quote text when flagging issues. Be encouraging but honest in your feedback.`;
}

function buildUserPrompt(
  chapterTitle: string,
  chapterContent: string,
  priorChaptersSummary?: string
): string {
  let prompt = `Chapter Title: "${chapterTitle}"\n\nChapter Content:\n${chapterContent}`;
  if (priorChaptersSummary) {
    prompt = `Prior Chapters Summary:\n${priorChaptersSummary}\n\n${prompt}`;
  }
  prompt += '\n\nPlease provide developmental feedback on this chapter.';
  return prompt;
}

export async function POST(request: NextRequest) {
  if ((await getCurrentTier()) === 'free') {
    return upgradeRequired(
      'Beta Reader chapter feedback is an Author-plan feature.'
    );
  }

  let body: FeedbackRequest;
  try {
    body = (await request.json()) as FeedbackRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const { chapterTitle, chapterContent, genre, priorChaptersSummary, writerProfile, styleProfile, writingRules } = body;

  if (!chapterTitle || !chapterContent) {
    return NextResponse.json(
      { error: 'Missing required fields: chapterTitle and chapterContent' },
      { status: 400 }
    );
  }

  const plainTextContent = stripHtml(chapterContent);

  if (plainTextContent.length === 0) {
    return NextResponse.json(
      { error: 'Chapter content is empty after HTML stripping' },
      { status: 400 }
    );
  }

  const systemPrompt =
    getSystemPrompt(genre) +
    buildPersonalizationPrompt(writerProfile, styleProfile) +
    buildWritingRulesBlock(writingRules);
  const userPrompt = buildUserPrompt(chapterTitle, plainTextContent, priorChaptersSummary);

  try {
    const { text, modelUsed, fallbackUsed } = await runAIRequest({
      tier: 'DEEP',
      system: systemPrompt,
      userPrompt,
      maxTokens: 4096,
    });

    const feedback = parseAIJson<DevelopmentalFeedback>(text);
    return NextResponse.json({ ...feedback, _meta: { modelUsed, fallbackUsed } });
  } catch (error) {
    if (error instanceof AIRequestError) {
      return NextResponse.json({ error: error.publicMessage }, { status: error.status });
    }
    console.error('Error in feedback AI route:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Feedback failed: ${msg}` }, { status: 500 });
  }
}
