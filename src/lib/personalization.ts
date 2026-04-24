/**
 * Client-side helpers for reading writer + style profiles from localStorage
 * and building a personalization block to inject into AI system prompts.
 */

export interface WriterProfile {
  experience: 'first-draft' | 'revising' | 'published' | 'pro';
  primaryGenre: string;
  dailyGoal: number;
  challenge: string;
  goals: string[];
  createdAt: string;
}

export interface StyleProfile {
  voice?: {
    tone?: string;
    formality?: string;
    personality?: string;
  };
  sentences?: {
    averageLength?: string;
    rhythm?: string;
    favoredStructures?: string[];
  };
  diction?: {
    vocabularyLevel?: string;
    goToWords?: string[];
    cliches?: string[];
    uniquePhrases?: string[];
  };
  techniques?: {
    strengths?: string[];
    tics?: string[];
    filterWords?: string[];
  };
  prose?: {
    showVsTellBalance?: string;
    descriptionStyle?: string;
    dialogueStyle?: string;
  };
  influences?: string[];
  summary?: string;
}

export function getWriterProfile(): WriterProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('prosecraft-profile');
    return raw ? (JSON.parse(raw) as WriterProfile) : null;
  } catch {
    return null;
  }
}

export function getStyleProfile(projectId: string): StyleProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`prosecraft-style-${projectId}`);
    return raw ? (JSON.parse(raw) as StyleProfile) : null;
  } catch {
    return null;
  }
}

/**
 * Per-project writing rules: hard constraints the author wants AI to respect.
 * Examples: "No em dashes", "No adverbs ending in -ly", "Never use 'very'".
 * Stored as a simple string[] under prosecraft-rules-<projectId>.
 */
export function getWritingRules(projectId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`prosecraft-rules-${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((r: unknown): r is string => typeof r === 'string' && r.trim().length > 0);
    }
    return [];
  } catch {
    return [];
  }
}

export function setWritingRules(projectId: string, rules: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = rules.map(r => r.trim()).filter(Boolean);
    localStorage.setItem(`prosecraft-rules-${projectId}`, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

/**
 * Build a compact personalization block for injection into AI system prompts.
 * Returns empty string if no profiles are set so AI routes stay agnostic.
 */
export function buildPersonalizationPrompt(
  writer?: WriterProfile | null,
  style?: StyleProfile | null
): string {
  const parts: string[] = [];

  if (writer) {
    const experienceMap: Record<WriterProfile['experience'], string> = {
      'first-draft': 'a writer working on their first draft',
      revising: 'a writer revising a manuscript',
      published: 'a self-published or indie author',
      pro: 'a traditionally-published professional author',
    };
    const who = experienceMap[writer.experience] || 'a writer';
    parts.push(
      `WRITER CONTEXT: You are critiquing work by ${who}. They primarily write ${writer.primaryGenre}. Their stated challenge: "${writer.challenge}". Calibrate feedback to this level and prioritize their challenge area.`
    );
  }

  if (style?.summary) {
    parts.push(
      `AUTHOR VOICE FINGERPRINT: ${style.summary}`
    );

    const fingerprintDetails: string[] = [];
    if (style.voice?.tone) fingerprintDetails.push(`Tone: ${style.voice.tone}`);
    if (style.sentences?.rhythm) fingerprintDetails.push(`Rhythm: ${style.sentences.rhythm}`);
    if (style.techniques?.tics?.length) {
      fingerprintDetails.push(`Known tics to flag: ${style.techniques.tics.join('; ')}`);
    }
    if (style.techniques?.filterWords?.length) {
      fingerprintDetails.push(`Crutch words: ${style.techniques.filterWords.join(', ')}`);
    }

    if (fingerprintDetails.length) {
      parts.push(fingerprintDetails.join(' | '));
    }

    parts.push(
      'When giving feedback or suggesting rewrites, preserve this voice. Do not flatten it into generic "good writing".'
    );
  }

  return parts.length ? `\n\n---\n${parts.join('\n\n')}\n---\n` : '';
}
