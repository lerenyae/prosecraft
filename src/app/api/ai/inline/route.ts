import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { buildPersonalizationPrompt, type WriterProfile, type StyleProfile } from '@/lib/personalization';

type InlineAction =
  | 'improve'
  | 'show-dont-tell'
  | 'tighten'
  | 'expand'
  | 'change-tone'
  | 'fix-grammar'
  | 'dialogue-coach';

interface InlineEditRequest {
  action: InlineAction;
  selectedText: string;
  context: string;
  genre?: string;
  styleProfile?: string | StyleProfile | null;
  writerProfile?: WriterProfile | null;
  toneTarget?: string;
  writingRules?: string[] | null;
}

function buildWritingRulesBlock(rules?: string[] | null): string {
  if (!rules || rules.length === 0) return '';
  const cleaned = rules.map(r => r.trim()).filter(Boolean);
  if (!cleaned.length) return '';
  return `\n\n---\nWRITING RULES (hard constraints from the author — these override stylistic defaults):\n- ${cleaned.join('\n- ')}\n\nYour rewrite MUST respect these rules. If following a rule would break grammar or meaning, prefer rephrasing to dropping the rule.\n---\n`;
}

interface DialogueCoachFeedback {
  hasDialogue: boolean;
  dialogueSummary?: string;
  voiceConsistency: {
    rating: 1 | 2 | 3 | 4 | 5;
    notes: string;
    examples?: string[];
  };
  naturalism: {
    rating: 1 | 2 | 3 | 4 | 5;
    notes: string;
    examples?: string[];
  };
  subtext: {
    rating: 1 | 2 | 3 | 4 | 5;
    notes: string;
    examples?: string[];
  };
  infoDumping: {
    detected: boolean;
    notes: string;
    examples?: string[];
  };
  beats: {
    notes: string;
    examples?: string[];
  };
  topSuggestion: string;
}

const CHANGE_SUMMARY_INSTRUCTIONS = `

After the revised text, output this EXACT delimiter on its own line, then a concise change summary:
---CHANGES---
- [Category]: [Count] — [one-line description, cite one specific example from the text]
- (3-6 bullets total, covering the categories that actually apply)

Categories to use when relevant: Grammar, Punctuation, Tense, Word Choice, Clarity, Pacing, Show-vs-Tell, Redundancy, Dialogue, Sensory Detail, Tone.
Every bullet must describe a REAL change you made — do not list categories that were untouched. If you made no changes, output "- No changes: text already strong."

Example format:
[revised text here]
---CHANGES---
- Grammar: 3 — fixed subject-verb agreement ("the team were" → "the team was")
- Punctuation: 5 — added Oxford commas in list constructions
- Word Choice: 2 — replaced "walked quickly" with "strode" for precision`;

function getSystemPrompt(
  action: InlineAction,
  genre?: string,
  styleProfile?: string,
  toneTarget?: string
): string {
  const baseContext = genre ? `You are editing a ${genre} manuscript.` : 'You are editing a manuscript.';
  const styleContext = styleProfile
    ? `\n\nThe author's voice fingerprint is: ${styleProfile}\nPreserve this voice in all edits.`
    : '';

  const prompts: Record<InlineAction, string> = {
    improve: `${baseContext} You are an expert fiction editor. Your task is to improve the prose quality of the selected text while preserving the author's voice and style. Focus on clarity, vividity, and narrative impact. Return the revised text followed by the change summary.${CHANGE_SUMMARY_INSTRUCTIONS}${styleContext}`,

    'show-dont-tell': `${baseContext} Convert the selected text from telling into showing through action, dialogue, sensory detail, or body language. Make the reader experience the moment rather than being told about it. Return the revised text followed by the change summary.${CHANGE_SUMMARY_INSTRUCTIONS}${styleContext}`,

    tighten: `${baseContext} Remove unnecessary words and cut filler. Make every word count. Strengthen the prose by eliminating redundancy, weak adverbs, and verbose constructions. Return the revised text followed by the change summary.${CHANGE_SUMMARY_INSTRUCTIONS}${styleContext}`,

    expand: `${baseContext} Expand the passage with sensory detail, interiority, emotional depth, or richer description. Build atmosphere and immersion. Return the revised text followed by the change summary.${CHANGE_SUMMARY_INSTRUCTIONS}${styleContext}`,

    'change-tone': `${baseContext} Rewrite the selected text to match a ${toneTarget} tone. Adjust word choice, pacing, and emotional register accordingly. Return the revised text followed by the change summary.${CHANGE_SUMMARY_INSTRUCTIONS}${styleContext}`,

    'fix-grammar': `${baseContext} Fix all grammar, punctuation, and spelling errors in the selected text. Preserve the author's style and voice exactly. Return the revised text followed by the change summary.${CHANGE_SUMMARY_INSTRUCTIONS}${styleContext}`,

    'dialogue-coach': `${baseContext} You are a dialogue doctor. Critique the dialogue in the selected passage.

FIRST: determine if the selection actually contains dialogue (quoted speech between characters). Set "hasDialogue" accordingly.
- If hasDialogue is false, set "dialogueSummary" to a one-sentence explanation of what the selection is instead (e.g. "This passage is narration/description, not dialogue.") and return minimal rating objects (rating 0 with empty notes). Do NOT fabricate issues.
- If hasDialogue is true, analyze each dimension and GROUND every observation in the actual text. Every "notes" field must reference specific words, lines, or speakers from THIS selection — no generic platitudes.

Dimensions to analyze (only when hasDialogue is true):
1. voiceConsistency — Do speakers sound distinct? Rate 1-5. In "examples", quote 1-2 short lines that illustrate your rating (either a success or a failure).
2. naturalism — Does it sound like real speech? Rate 1-5. Flag stilted phrasing, over-formality, on-the-nose beats. Quote the offenders.
3. subtext — Is anything unsaid? Rate 1-5 (1 = all surface, 5 = rich subtext). Point to moments of implication or their absence.
4. infoDumping — Is dialogue used to deliver exposition? detected = true if yes. Quote the exposition-heavy lines.
5. beats — Comment on action beats, tags, and pacing between lines. Too many "he said"? Missing beats? Over-choreographed?

End with "topSuggestion": ONE specific, actionable change the author could make (e.g. "Cut 'she said angrily' on line 3 — her word choice already carries the anger.").

Return ONLY valid JSON (no markdown, no code blocks, no prose outside the JSON) with this exact structure:
{
  "hasDialogue": boolean,
  "dialogueSummary": "string",
  "voiceConsistency": { "rating": 1-5, "notes": "string", "examples": ["quoted line", ...] },
  "naturalism": { "rating": 1-5, "notes": "string", "examples": ["quoted line", ...] },
  "subtext": { "rating": 1-5, "notes": "string", "examples": ["quoted line", ...] },
  "infoDumping": { "detected": boolean, "notes": "string", "examples": ["quoted line", ...] },
  "beats": { "notes": "string", "examples": ["quoted line", ...] },
  "topSuggestion": "string"
}${styleContext}`,
  };

  return prompts[action];
}

function buildUserPrompt(action: InlineAction, selectedText: string, context: string): string {
  const contextSection = context ? `\n\nSurrounding context:\n${context}` : '';

  if (action === 'dialogue-coach') {
    return `Analyze this dialogue:\n\n${selectedText}${contextSection}`;
  }

  return `${action === 'change-tone' ? 'Edit this text:\n\n' : ''}${selectedText}${contextSection}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InlineEditRequest;
    const { action, selectedText, context, genre, styleProfile, writerProfile, toneTarget, writingRules } = body;

    // Normalize styleProfile â accept both legacy string and structured object
    const styleString = typeof styleProfile === 'string' ? styleProfile : styleProfile?.summary;
    const structuredStyle = typeof styleProfile === 'object' ? styleProfile : null;

    // Validate required fields
    if (!action || !selectedText) {
      return NextResponse.json(
        { error: 'Missing required fields: action and selectedText' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions: InlineAction[] = [
      'improve',
      'show-dont-tell',
      'tighten',
      'expand',
      'change-tone',
      'fix-grammar',
      'dialogue-coach',
    ];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate toneTarget for change-tone action
    if (action === 'change-tone' && !toneTarget) {
      return NextResponse.json(
        { error: 'toneTarget is required for change-tone action' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const systemPrompt =
      getSystemPrompt(action, genre, styleString, toneTarget) +
      buildPersonalizationPrompt(writerProfile, structuredStyle) +
      buildWritingRulesBlock(writingRules);
    const userPrompt = buildUserPrompt(action, selectedText, context);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract the text response
    const responseContent = message.content[0];
    if (responseContent.type !== 'text') {
      return NextResponse.json(
        { error: 'Unexpected response type from API' },
        { status: 500 }
      );
    }

    let result: string | DialogueCoachFeedback;
    let changeSummary: string[] | undefined;

    // Parse JSON response for dialogue-coach action
    if (action === 'dialogue-coach') {
      try {
        // Remove markdown code blocks if present
        let jsonString = responseContent.text.trim();
        if (jsonString.startsWith('```json')) {
          jsonString = jsonString.slice(7); // Remove ```json
        } else if (jsonString.startsWith('```')) {
          jsonString = jsonString.slice(3); // Remove ```
        }
        if (jsonString.endsWith('```')) {
          jsonString = jsonString.slice(0, -3); // Remove trailing ```
        }
        result = JSON.parse(jsonString.trim()) as DialogueCoachFeedback;
      } catch {
        // If parsing fails, return the raw text as result
        result = responseContent.text;
      }
    } else {
      // Rewrite actions: split revised text from optional change summary
      const raw = responseContent.text;
      const delimiter = '---CHANGES---';
      const idx = raw.indexOf(delimiter);
      if (idx >= 0) {
        result = raw.slice(0, idx).trim();
        const summaryBlock = raw.slice(idx + delimiter.length).trim();
        changeSummary = summaryBlock
          .split('\n')
          .map((line) => line.replace(/^[-*•]\s*/, '').trim())
          .filter((line) => line.length > 0);
      } else {
        result = raw;
      }
    }

    return NextResponse.json({
      result,
      action,
      changeSummary,
    });
  } catch (error) {
    console.error('Error in inline AI route:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
