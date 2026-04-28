/**
 * Centralized model selection for Anthropic API calls.
 *
 * Use MODELS.DEEP for heavy analysis tasks (beta reader, deep story analysis,
 * character analysis) where reasoning quality matters most.
 *
 * Use MODELS.CHAT for conversational or moderately complex tasks (chat,
 * inline edits, quick scans).
 *
 * Use MODELS.FAST for narrow, low-variance tasks (grammar scoring, filter-word
 * analysis) where speed and cost matter.
 */
export const MODELS = {
  // DEEP runs on Sonnet 4.5 for healthier unit economics on heavy
  // operations (Beta Reader, Style Profile, Whole-Book chat, character gen).
  // Quality gap vs Opus on prose work is small; cost gap is ~5x.
  // Bump back to Opus only if quality complaints surface.
  DEEP: 'claude-sonnet-4-5',
  CHAT: 'claude-sonnet-4-20250514',
  FAST: 'claude-haiku-4-5-20251001',
} as const;

export type ModelTier = keyof typeof MODELS;
