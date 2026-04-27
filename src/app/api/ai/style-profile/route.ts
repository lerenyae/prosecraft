import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { MODELS } from '@/lib/ai-models';

export const maxDuration = 60;
export const runtime = 'nodejs';

interface StyleProfileRequest {
  sample: string;
  genre?: string;
}

export interface StyleProfile {
  voice: {
    tone: string;
    formality: 'casual' | 'conversational' | 'literary' | 'formal';
    personality: string;
  };
  sentences: {
    averageLength: 'short' | 'medium' | 'long' | 'varied';
    rhythm: string;
    favoredStructures: string[];
  };
  diction: {
    vocabularyLevel: 'plain' | 'moderate' | 'elevated' | 'specialized';
    goToWords: string[];
    cliches: string[];
    uniquePhrases: string[];
  };
  techniques: {
    strengths: string[];
    tics: string[];
    filterWords: string[];
  };
  prose: {
    showVsTellBalance: string;
    descriptionStyle: string;
    dialogueStyle: string;
  };
  influences: string[];
  summary: string;
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

function getSystemPrompt(genre?: string): string {
  const g = genre ? `The writer works primarily in ${genre}.` : '';
  return `You are a literary style analyst. You read a writing sample and produce a precise, usable fingerprint of the author's voice.

${g}

Return a JSON object with this exact structure:
{
  "voice": {
    "tone": "single evocative descriptor (e.g., 'wry and observational', 'lyrical and melancholic')",
    "formality": "casual" | "conversational" | "literary" | "formal",
    "personality": "1-2 sentences describing the narrator/author's personality as it shows up on the page"
  },
  "sentences": {
    "averageLength": "short" | "medium" | "long" | "varied",
    "rhythm": "1 sentence on pacing and cadence",
    "favoredStructures": ["specific sentence patterns they reach for, e.g., 'compound with em-dash asides', 'fragment-then-expansion'"]
  },
  "diction": {
    "vocabularyLevel": "plain" | "moderate" | "elevated" | "specialized",
    "goToWords": ["6-10 distinctive words or phrases this writer genuinely uses often"],
    "cliches": ["any cliches or overused phrases to watch out for"],
    "uniquePhrases": ["3-5 fresh, ownable turns of phrase from their writing"]
  },
  "techniques": {
    "strengths": ["2-4 craft strengths — what they do well"],
    "tics": ["2-4 unconscious habits, e.g., 'over-uses dialogue tags', 'repeats sentence openers'"],
    "filterWords": ["filter words or crutch words they default to — felt, saw, seemed, just, really, etc."]
  },
  "prose": {
    "showVsTellBalance": "1 sentence on how they balance showing vs telling",
    "descriptionStyle": "1 sentence on sensory/descriptive approach",
    "dialogueStyle": "1 sentence on how dialogue lands"
  },
  "influences": ["2-4 authors or styles this writing evokes — be specific, not generic"],
  "summary": "2 sentences: the distilled essence of this writer's voice, usable as a prompt directive"
}

Rules:
- Be specific and grounded in the actual sample. Do NOT give generic writing advice.
- Quote or paraphrase from the sample when choosing goToWords, cliches, and uniquePhrases.
- For influences, pick authors whose work genuinely resembles this — don't default to the biggest names in the genre.
- The "summary" field must be concrete enough that another AI could use it to mimic this voice.
- Return ONLY valid JSON, no markdown wrapping.`;
}

export async function POST(request: NextRequest) {
  try {
    let body: StyleProfileRequest;
    try {
      body = (await request.json()) as StyleProfileRequest;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { sample, genre } = body;
    if (!sample || typeof sample !== 'string') {
      return NextResponse.json({ error: 'Missing sample text' }, { status: 400 });
    }

    const plainText = stripHtml(sample);
    if (plainText.length < 200) {
      return NextResponse.json(
        { error: 'Need at least 200 characters of writing to profile' },
        { status: 400 }
      );
    }

    // Cap sample at ~30k chars to keep latency reasonable
    const cappedSample = plainText.slice(0, 30000);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: MODELS.DEEP,
      max_tokens: 2048,
      system: getSystemPrompt(genre),
      messages: [
        {
          role: 'user',
          content: `Analyze this writing sample and produce a style fingerprint:\n\n${cappedSample}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    let jsonStr = content.text.trim();
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();

    try {
      const profile = JSON.parse(jsonStr) as StyleProfile;
      return NextResponse.json({ profile, sampleLength: plainText.length });
    } catch (err) {
      console.error('Failed to parse style profile JSON:', err, jsonStr.substring(0, 400));
      return NextResponse.json(
        { error: 'AI returned invalid response format. Please try again.' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Error in style-profile route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
