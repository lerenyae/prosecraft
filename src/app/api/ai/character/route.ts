import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

interface GenerateRequest {
  action: 'generate';
  prompt: string;
  genre?: string;
  role?: string;
  existingNames?: string[];
}

interface ExpandRequest {
  action: 'expand';
  character: Record<string, unknown>;
  genre?: string;
  manuscriptExcerpt?: string;
}

type CharacterRequest = GenerateRequest | ExpandRequest;

function getGenreContext(genre?: string): string {
  const g = (genre || '').toLowerCase();
  if (g.includes('fantasy') || g.includes('sci-fi') || g.includes('science fiction'))
    return 'Consider worldbuilding elements: magic systems, technology, species, factions, and how they shape this character.';
  if (g.includes('romance'))
    return 'Focus on emotional depth: attachment style, love language, romantic history, and what makes them compelling as a romantic lead or interest.';
  if (g.includes('thriller') || g.includes('suspense') || g.includes('mystery'))
    return 'Emphasize secrets, tactical skills, moral ambiguity, and what this character stands to lose. Every character should feel like they could be hiding something.';
  if (g.includes('horror'))
    return 'Lean into psychological depth: deepest fears, dark secrets, survival instincts, and their relationship with the unknown or the monstrous.';
  if (g.includes('literary') || g.includes('lit fic'))
    return 'Prioritize interiority: worldview, central tensions, symbolic resonance, and the kind of quiet revelations that drive literary fiction.';
  if (g.includes('historical'))
    return 'Ground the character in their historical period: social class, period-specific details, historical events that shaped them, and the constraints of their time.';
  if (g.includes('ya') || g.includes('young adult'))
    return 'Capture authentic voice for the age group: identity formation, peer dynamics, the intensity of first experiences, and the tension between who they are and who they want to be.';
  return 'Create a well-rounded character with believable motivations and internal contradictions.';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CharacterRequest;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    if (body.action === 'generate') {
      const { prompt, genre, role, existingNames } = body;
      const genreCtx = getGenreContext(genre);
      const genreLabel = genre || 'general fiction';
      const roleHint = role && role !== 'supporting' ? `\nAssigned role: ${role}.` : '';
      const namesNote = existingNames?.length
        ? `\nExisting characters in this project: ${existingNames.join(', ')}. Do NOT reuse these names.`
        : '';

      const systemPrompt = `You are a character creation engine for fiction writers working in ${genreLabel}. ${genreCtx}

Generate a detailed, original character based on the author's prompt. Return ONLY a valid JSON object with these fields:
{
  "name": "Full name",
  "role": "protagonist|antagonist|deuteragonist|mentor|love-interest|sidekick|supporting|minor",
  "age": "Age or age range",
  "gender": "Gender",
  "occupation": "Occupation or role in their world",
  "physicalDescription": "2-3 sentences: height, build, distinguishing features, how they carry themselves",
  "description": "2-3 sentences: who they are and why they matter to a story",
  "personality": "2-3 sentences: core traits, temperament, how others perceive them",
  "strengths": "2-3 key strengths",
  "flaws": "2-3 meaningful flaws that create conflict",
  "fears": "1-2 deep fears (not just surface phobias)",
  "desires": "What they want consciously and what they need unconsciously",
  "backstory": "3-4 sentences: key events that shaped them",
  "goals": "What they are trying to achieve",
  "motivation": "Why they want what they want",
  "internalConflict": "The war inside them",
  "externalConflict": "What outside forces oppose them",
  "arc": "How they might change over the course of a story",
  "speechPatterns": "How they talk: vocabulary, rhythm, verbal tics",
  "mannerisms": "Physical habits, gestures, body language",
  "notes": ""
}

Rules:
- Be specific and original. No generic fantasy/sci-fi tropes without a twist.
- Internal contradictions make characters real. Give them at least one.
- Every field should feel like it belongs to the same person.
- Keep each field concise: 1-4 sentences max.${roleHint}${namesNote}`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0];
      if (text.type !== 'text') {
        return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });
      }

      let jsonStr = text.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      const character = JSON.parse(jsonStr);
      return NextResponse.json({ character });

    } else if (body.action === 'expand') {
      const { character, genre, manuscriptExcerpt } = body;
      const genreCtx = getGenreContext(genre);
      const genreLabel = genre || 'general fiction';

      const filled: string[] = [];
      const empty: string[] = [];
      const fieldLabels: Record<string, string> = {
        name: 'Name', age: 'Age', gender: 'Gender', occupation: 'Occupation',
        physicalDescription: 'Physical Description', description: 'Overview',
        personality: 'Personality', strengths: 'Strengths', flaws: 'Flaws',
        fears: 'Fears', desires: 'Desires', backstory: 'Backstory',
        goals: 'Goals', motivation: 'Motivation', internalConflict: 'Internal Conflict',
        externalConflict: 'External Conflict', arc: 'Character Arc',
        speechPatterns: 'Speech Patterns', mannerisms: 'Mannerisms'
      };

      for (const [key, label] of Object.entries(fieldLabels)) {
        const val = character[key];
        if (val && typeof val === 'string' && val.trim()) {
          filled.push(`${label}: ${val}`);
        } else {
          empty.push(key);
        }
      }

      if (empty.length === 0) {
        return NextResponse.json({ character: {} });
      }

      const manuscriptCtx = manuscriptExcerpt
        ? `\n\nMANUSCRIPT EXCERPT (use this to inform the character details):\n---\n${manuscriptExcerpt.slice(0, 6000)}\n---`
        : '';

      const systemPrompt = `You are a character development engine for fiction writers working in ${genreLabel}. ${genreCtx}

A character has been partially created. Based on the existing details, generate content ONLY for the empty fields. Return a JSON object with ONLY the empty field keys and their generated values.

EXISTING CHARACTER DETAILS:
${filled.join('\n')}
${manuscriptCtx}

EMPTY FIELDS TO FILL: ${empty.join(', ')}

Rules:
- Only return fields that are currently empty. Do not modify existing fields.
- Make every new field consistent with the existing character details.
- Be specific and concise: 1-4 sentences per field.
- Return ONLY valid JSON with the empty field keys.`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Fill in the empty fields for this character.' }],
      });

      const text = message.content[0];
      if (text.type !== 'text') {
        return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });
      }

      let jsonStr = text.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      const updates = JSON.parse(jsonStr);
      return NextResponse.json({ character: updates });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Character AI error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
