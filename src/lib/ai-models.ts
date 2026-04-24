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
  DEEP: 'claude-opus-4-5-20250929',
  CHAT: 'claude-sonnet-4-20250514',
  FAST: 'claude-haiku-4-5-20251001',
} as const;

export type ModelTier = keyof typeof MODELS;
