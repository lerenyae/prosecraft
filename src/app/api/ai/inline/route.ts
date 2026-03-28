import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

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
  styleProfile?: string;
  toneTarget?: string;
}

interface DialogueCoachFeedback {
  voiceConsistency: {
    consistent: boolean;
    issues?: string[];
  };
  naturalism: {
    rating: 1 | 2 | 3 | 4 | 5;
    notes: string;
  };
  subtext: {
    present: boolean;
    examples?: string[];
  };
  infoDumping: {
    detected: boolean;
    issues?: string[];
  };
  overallNotes: string;
}

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
    improve: `${baseContext} You are an expert fiction editor. Your task is to improve the prose quality of the selected text while preserving the author's voice and style. Focus on clarity, vividity, and narrative impact. Return ONLY the revised text with no explanations or commentary.${styleContext}`,

    'show-dont-tell': `${baseContext} Convert the selected text from telling into showing through action, dialogue, sensory detail, or body language. Make the reader experience the moment rather than being told about it. Return ONLY the revised text with no explanations or commentary.${styleContext}`,

    tighten: `${baseContext} Remove unnecessary words and cut filler. Make every word count. Strengthen the prose by eliminating redundancy, weak adverbs, and verbose constructions. Return ONLY the revised text with no explanations or commentary.${styleContext}`,

    expand: `${baseContext} Expand the passage with sensory detail, interiority, emotional depth, or richer description. Build atmosphere and immersion. Return ONLY the revised text with no explanations or commentary.${styleContext}`,

    'change-tone': `${baseContext} Rewrite the selected text to match a ${toneTarget} tone. Adjust word choice, pacing, and emotional register accordingly. Return ONLY the revised text with no explanations or commentary.${styleContext}`,

    'fix-grammar': `${baseContext} Fix all grammar, punctuation, and spelling errors in the selected text. Preserve the author's style and voice exactly. Return ONLY the revised text with no explanations or commentary.${styleContext}`,

    'dialogue-coach': `${baseContext} Analyze the selected dialogue for:
1. Voice consistency - Does each character have a distinct, consistent voice?
2. Naturalism - Does the dialogue feel natural and authentic?
3. Subtext - Is there tension, conflict, or hidden meaning beneath the surface?
4. Info-dumping - Is the dialogue weighed down by exposition?

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "voiceConsistency": { "consistent": boolean, "issues": [strings] },
  "naturalism": { "rating": 1-5, "notes": "string" },
  "subtext": { "present": boolean, "examples": [strings] },
  "infoDumping": { "detected": boolean, "issues": [strings] },
  "overallNotes": "string"
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
    const { action, selectedText, context, genre, styleProfile, toneTarget } = body;

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

    const systemPrompt = getSystemPrompt(action, genre, styleProfile, toneTarget);
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
      result = responseContent.text;
    }

    return NextResponse.json({
      result,
      action,
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
