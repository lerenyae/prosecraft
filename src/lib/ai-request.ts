/**
 * Thin wrapper around Anthropic messages.create that:
 *  - Falls back from DEEP (Opus) to CHAT (Sonnet) if the primary model errors
 *    (e.g. permission/not_found/overloaded). This keeps beta reader + feedback
 *    working even when Opus access is flaky.
 *  - Returns a normalized error surface so route handlers can show the real
 *    failure instead of an opaque "Internal server error".
 */
import Anthropic from '@anthropic-ai/sdk';
import { MODELS, type ModelTier } from './ai-models';

export interface AIRequestParams {
  tier: ModelTier;                 // 'DEEP' | 'CHAT' | 'FAST'
  system: string;
  userPrompt: string;
  maxTokens?: number;
  // If true (default for DEEP), fall back to CHAT on primary failure
  allowFallback?: boolean;
}

export interface AIRequestResult {
  text: string;
  modelUsed: string;
  fallbackUsed: boolean;
}

export class AIRequestError extends Error {
  status: number;
  publicMessage: string;
  constructor(publicMessage: string, status = 502, cause?: unknown) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
    if (cause) (this as any).cause = cause;
  }
}

function extractErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  if (err instanceof Error) {
    // Anthropic SDK errors often put useful info in message
    return err.message;
  }
  try {
    return JSON.stringify(err).slice(0, 500);
  } catch {
    return String(err);
  }
}

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AIRequestError(
      'Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart.',
      500
    );
  }
  return new Anthropic({ apiKey });
}

async function callOnce(
  client: Anthropic,
  model: string,
  system: string,
  userPrompt: string,
  maxTokens: number
): Promise<string> {
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const first = message.content[0];
  if (!first || first.type !== 'text') {
    throw new AIRequestError('AI returned a non-text response.', 502);
  }
  return first.text;
}

export async function runAIRequest(params: AIRequestParams): Promise<AIRequestResult> {
  const {
    tier,
    system,
    userPrompt,
    maxTokens = 4096,
    allowFallback = tier === 'DEEP',
  } = params;

  const client = getAnthropicClient();
  const primaryModel = MODELS[tier];

  try {
    const text = await callOnce(client, primaryModel, system, userPrompt, maxTokens);
    return { text, modelUsed: primaryModel, fallbackUsed: false };
  } catch (primaryErr) {
    const primaryMsg = extractErrorMessage(primaryErr);
    console.error(`[ai-request] primary model ${primaryModel} failed:`, primaryMsg);

    if (!allowFallback || tier === 'CHAT') {
      throw new AIRequestError(
        `AI call failed on ${primaryModel}: ${primaryMsg}`,
        502,
        primaryErr
      );
    }

    // Fall back to Sonnet
    const fallbackModel = MODELS.CHAT;
    try {
      const text = await callOnce(client, fallbackModel, system, userPrompt, maxTokens);
      console.warn(`[ai-request] fell back to ${fallbackModel} successfully`);
      return { text, modelUsed: fallbackModel, fallbackUsed: true };
    } catch (fallbackErr) {
      const fallbackMsg = extractErrorMessage(fallbackErr);
      console.error(`[ai-request] fallback ${fallbackModel} also failed:`, fallbackMsg);
      throw new AIRequestError(
        `AI call failed on both ${primaryModel} and ${fallbackModel}. Last error: ${fallbackMsg}`,
        502,
        fallbackErr
      );
    }
  }
}

/**
 * Strip ```json fences and parse. Throws AIRequestError on parse failure.
 */
export function parseAIJson<T = unknown>(raw: string): T {
  let s = raw.trim();
  if (s.startsWith('```json')) s = s.slice(7);
  else if (s.startsWith('```')) s = s.slice(3);
  if (s.endsWith('```')) s = s.slice(0, -3);
  try {
    return JSON.parse(s.trim()) as T;
  } catch (e) {
    console.error('[ai-request] JSON parse failed. First 500 chars:', s.slice(0, 500));
    throw new AIRequestError('AI returned invalid JSON. Try again.', 502, e);
  }
}
