/**
 * Story Intelligence Engine
 *
 * Assembles story context from characters, beats, chapters, and scenes.
 * Generates consistency alerts, tracks character arcs, and builds
 * narrative summaries for AI context injection.
 */

import {
  Character,
  Chapter,
  Scene,
  PlotBeat,
  StoryThread,
  StoryContext,
  ConsistencyAlert,
  ArcPhase,
  BeatSheetTemplate,
  BEAT_SHEET_TEMPLATES,
  CharacterChapterPresence,
} from '@/types';

// ============================================================================
// localStorage Keys
// ============================================================================

const STORAGE_KEYS = {
  characters: 'prosecraft-characters',
  plotBeats: 'prosecraft-plot-beats',
  threads: 'prosecraft-threads',
  charPresence: 'prosecraft-char-presence',
} as const;

// ============================================================================
// Storage Helpers (same pattern as store.tsx)
// ============================================================================

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch { /* noop */ }
}

// ============================================================================
// Data Accessors
// ============================================================================

export function getCharacters(projectId: string): Character[] {
  // Try centralized storage first
  const raw = safeGetItem(STORAGE_KEYS.characters);
  if (raw) {
    try {
      const all: Record<string, Character> = JSON.parse(raw);
      const filtered = Object.values(all).filter(c => c.projectId === projectId);
      if (filtered.length > 0) return filtered;
    } catch { /* fall through */ }
  }

  // Fall back to project-scoped storage (v2 format used by characters page)
  const v2Raw = safeGetItem(`prosecraft-characters-v2-${projectId}`);
  if (v2Raw) {
    try {
      const chars: Character[] = JSON.parse(v2Raw);
      // Auto-migrate to centralized storage
      if (chars.length > 0) {
        migrateCharactersToStorage(projectId, chars);
      }
      return chars;
    } catch { /* noop */ }
  }

  // Try legacy format
  const legacyRaw = safeGetItem(`prosecraft-characters-${projectId}`);
  if (legacyRaw) {
    try {
      return JSON.parse(legacyRaw);
    } catch { /* noop */ }
  }

  return [];
}

export function getPlotBeats(projectId: string): PlotBeat[] {
  // Try centralized storage first
  const raw = safeGetItem(STORAGE_KEYS.plotBeats);
  if (raw) {
    try {
      const all: Record<string, PlotBeat> = JSON.parse(raw);
      const filtered = Object.values(all)
        .filter(b => b.projectId === projectId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      if (filtered.length > 0) return filtered;
    } catch { /* fall through */ }
  }

  // Fall back to project-scoped storage (used by storyboard page)
  const projectRaw = safeGetItem(`prosecraft-beats-${projectId}`);
  if (projectRaw) {
    try {
      const beats: PlotBeat[] = JSON.parse(projectRaw);
      if (beats.length > 0) {
        migrateBeatsToStorage(projectId, beats);
      }
      return beats.sort((a, b) => a.sortOrder - b.sortOrder);
    } catch { /* noop */ }
  }

  return [];
}

export function getThreads(projectId: string): StoryThread[] {
  const raw = safeGetItem(STORAGE_KEYS.threads);
  if (!raw) return [];
  try {
    const all: Record<string, StoryThread> = JSON.parse(raw);
    return Object.values(all).filter(t => t.projectId === projectId);
  } catch { return []; }
}

export function getCharPresence(projectId: string): CharacterChapterPresence[] {
  const raw = safeGetItem(STORAGE_KEYS.charPresence);
  if (!raw) return [];
  try {
    const all: CharacterChapterPresence[] = JSON.parse(raw);
    return all.filter(p => {
      // Filter by checking if character belongs to this project
      const chars = getCharacters(projectId);
      return chars.some(c => c.id === p.characterId);
    });
  } catch { return []; }
}

// ============================================================================
// Data Mutators
// ============================================================================

export function saveThread(thread: StoryThread): void {
  const raw = safeGetItem(STORAGE_KEYS.threads);
  const all: Record<string, StoryThread> = raw ? JSON.parse(raw) : {};
  all[thread.id] = thread;
  safeSetItem(STORAGE_KEYS.threads, JSON.stringify(all));
}

export function deleteThread(threadId: string): void {
  const raw = safeGetItem(STORAGE_KEYS.threads);
  if (!raw) return;
  const all: Record<string, StoryThread> = JSON.parse(raw);
  delete all[threadId];
  safeSetItem(STORAGE_KEYS.threads, JSON.stringify(all));
}

export function saveCharPresence(presence: CharacterChapterPresence): void {
  const raw = safeGetItem(STORAGE_KEYS.charPresence);
  const all: CharacterChapterPresence[] = raw ? JSON.parse(raw) : [];
  const idx = all.findIndex(
    p => p.characterId === presence.characterId && p.chapterId === presence.chapterId
  );
  if (idx >= 0) {
    all[idx] = presence;
  } else {
    all.push(presence);
  }
  safeSetItem(STORAGE_KEYS.charPresence, JSON.stringify(all));
}

// ============================================================================
// Migrate existing character data into centralized storage
// ============================================================================

export function migrateCharactersToStorage(projectId: string, characters: Character[]): void {
  const raw = safeGetItem(STORAGE_KEYS.characters);
  const all: Record<string, Character> = raw ? JSON.parse(raw) : {};

  characters.forEach(char => {
    all[char.id] = { ...char, projectId };
  });

  safeSetItem(STORAGE_KEYS.characters, JSON.stringify(all));
}

export function migrateBeatsToStorage(projectId: string, beats: PlotBeat[]): void {
  const raw = safeGetItem(STORAGE_KEYS.plotBeats);
  const all: Record<string, PlotBeat> = raw ? JSON.parse(raw) : {};

  beats.forEach(beat => {
    all[beat.id] = { ...beat, projectId };
  });

  safeSetItem(STORAGE_KEYS.plotBeats, JSON.stringify(all));
}

// ============================================================================
// Arc Phase Detection
// ============================================================================

function detectArcPhase(
  storyProgress: number,
  _character: Character,
  _beatContext: { completedPercent: number; currentBeatAct?: number }
): ArcPhase {
  // Use story progress + beat act to determine arc phase
  // Future: use character arc description + beat act for more nuanced detection
  if (storyProgress < 15) return 'setup';
  if (storyProgress < 50) return 'rising';
  if (storyProgress < 75) return 'crisis';
  if (storyProgress < 90) return 'climax';
  return 'resolution';
}

// ============================================================================
// Beat Alignment
// ============================================================================

function findCurrentBeat(
  progressPercent: number,
  template: BeatSheetTemplate
): { current: typeof template.beats[0] | null; next: typeof template.beats[0] | null } {
  const beats = template.beats;

  let current = null;
  let next = null;

  for (let i = 0; i < beats.length; i++) {
    const beatPercent = beats[i].percentOfStory ?? 0;
    if (beatPercent <= progressPercent) {
      current = beats[i];
      next = beats[i + 1] || null;
    }
  }

  // If we haven't hit any beat yet, the first beat is "next"
  if (!current && beats.length > 0) {
    next = beats[0];
  }

  return { current, next };
}

// ============================================================================
// Consistency Alert Generation
// ============================================================================

function generateAlerts(
  characters: Character[],
  chapters: Chapter[],
  plotBeats: PlotBeat[],
  threads: StoryThread[],
  presenceData: CharacterChapterPresence[],
  progressPercent: number,
  template: BeatSheetTemplate | null
): ConsistencyAlert[] {
  const alerts: ConsistencyAlert[] = [];
  let alertId = 0;

  // 1. Character drift: protagonist/antagonist absent for 3+ chapters
  const protagonists = characters.filter(c => c.role === 'protagonist' || c.role === 'antagonist');
  const sortedChapters = [...chapters].sort((a, b) => a.sortOrder - b.sortOrder);

  protagonists.forEach(char => {
    const lastPresence = presenceData
      .filter(p => p.characterId === char.id && p.role !== 'absent')
      .map(p => {
        const chapterIdx = sortedChapters.findIndex(ch => ch.id === p.chapterId);
        return chapterIdx;
      })
      .sort((a, b) => b - a)[0];

    if (lastPresence !== undefined && sortedChapters.length - 1 - lastPresence >= 3) {
      alerts.push({
        id: `alert-${alertId++}`,
        type: 'character-drift',
        severity: 'warning',
        title: `${char.name} absent for ${sortedChapters.length - 1 - lastPresence} chapters`,
        description: `Your ${char.role} hasn't appeared since Chapter ${lastPresence + 1}. Consider bringing them back into the narrative.`,
        relatedCharacterId: char.id,
      });
    }
  });

  // 2. Dropped threads
  threads.forEach(thread => {
    if (thread.status === 'active' && thread.introducedChapterId) {
      const introIdx = sortedChapters.findIndex(ch => ch.id === thread.introducedChapterId);
      if (introIdx >= 0 && sortedChapters.length - 1 - introIdx >= 5) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'thread-dropped',
          severity: 'warning',
          title: `"${thread.name}" thread may be dropped`,
          description: `This ${thread.type} thread was introduced ${sortedChapters.length - 1 - introIdx} chapters ago without resolution. Address or resolve it.`,
          relatedThreadId: thread.id,
        });
      }
    }
  });

  // 3. Beat pacing alerts
  if (template) {
    const { current: _current } = findCurrentBeat(progressPercent, template);
    const expectedBeats = template.beats.filter(
      b => (b.percentOfStory ?? 0) <= progressPercent
    );
    const completedBeatTypes = new Set(plotBeats.filter(b => b.completed).map(b => b.beatType));

    expectedBeats.forEach(expected => {
      if (!completedBeatTypes.has(expected.beatType)) {
        alerts.push({
          id: `alert-${alertId++}`,
          type: 'beat-missing',
          severity: progressPercent - (expected.percentOfStory ?? 0) > 15 ? 'critical' : 'info',
          title: `"${expected.label}" beat not completed`,
          description: `At ${progressPercent}% progress, this beat should be addressed by now (expected at ${expected.percentOfStory}%).`,
          relatedBeatType: expected.beatType,
        });
      }
    });
  }

  // 4. Pacing alert - too many chapters without story progress
  if (progressPercent > 30 && plotBeats.filter(b => b.completed).length === 0) {
    alerts.push({
      id: `alert-${alertId++}`,
      type: 'pacing',
      severity: 'warning',
      title: 'No beats completed at 30%+ progress',
      description: 'Your story is progressing in word count but no structural beats are marked complete. Consider checking your beat sheet.',
    });
  }

  return alerts;
}

// ============================================================================
// Main Context Assembler
// ============================================================================

export function assembleStoryContext(
  projectId: string,
  chapters: Chapter[],
  scenes: Record<string, Scene>,
  currentChapterId: string | null,
  wordCountGoal: number,
  templateId?: string
): StoryContext {
  const characters = getCharacters(projectId);
  const plotBeats = getPlotBeats(projectId);
  const threads = getThreads(projectId);
  const presenceData = getCharPresence(projectId);

  const sortedChapters = [...chapters].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentChapterIndex = currentChapterId
    ? sortedChapters.findIndex(ch => ch.id === currentChapterId)
    : sortedChapters.length - 1;

  // Calculate total word count
  const totalWordCount = Object.values(scenes).reduce(
    (sum, s) => sum + (s.wordCount || 0),
    0
  );
  const progressPercent = wordCountGoal > 0
    ? Math.min(100, Math.round((totalWordCount / wordCountGoal) * 100))
    : Math.round((currentChapterIndex / Math.max(sortedChapters.length, 1)) * 100);

  // Find the template â check localStorage for user's choice if not passed
  const resolvedTemplateId = templateId || (() => {
    const saved = safeGetItem(`prosecraft-beat-template-${projectId}`);
    return saved ? saved.replace(/"/g, '') : undefined;
  })();
  const template = resolvedTemplateId
    ? BEAT_SHEET_TEMPLATES.find(t => t.id === resolvedTemplateId) || BEAT_SHEET_TEMPLATES[0]
    : BEAT_SHEET_TEMPLATES[0];

  // Beat alignment
  const { current: currentBeatDef, next: nextBeatDef } = findCurrentBeat(progressPercent, template);
  const completedBeats = plotBeats.filter(b => b.completed);

  // Active characters with arc tracking
  const activeCharacters = characters.map(char => {
    const charPresence = presenceData.filter(p => p.characterId === char.id);
    const lastSeenIdx = charPresence
      .map(p => sortedChapters.findIndex(ch => ch.id === p.chapterId))
      .filter(i => i >= 0)
      .sort((a, b) => b - a)[0];

    const lastSeenChapter = lastSeenIdx !== undefined
      ? sortedChapters[lastSeenIdx]?.title || 'Unknown'
      : 'Not yet introduced';

    const chaptersSince = lastSeenIdx !== undefined
      ? Math.max(0, currentChapterIndex - lastSeenIdx)
      : -1;

    const arcPhase = detectArcPhase(progressPercent, char, {
      completedPercent: progressPercent,
      currentBeatAct: currentBeatDef?.act,
    });

    return {
      character: char,
      arcPhase,
      lastSeenChapter,
      chaptersSinceLastAppearance: chaptersSince,
    };
  });

  // Thread status
  const activeThreads = threads.filter(t => t.status === 'active');
  const resolvedThreads = threads.filter(t => t.status === 'resolved');

  // Upcoming beats
  const upcomingBeats = template.beats
    .filter(b => (b.percentOfStory ?? 0) > progressPercent)
    .map(b => ({
      beatType: b.beatType,
      label: b.label,
      description: b.description,
      percentOfStory: b.percentOfStory ?? 0,
    }));

  // Alerts
  const alerts = generateAlerts(
    characters,
    sortedChapters,
    plotBeats,
    threads,
    presenceData,
    progressPercent,
    template
  );

  // Build narrative summary for AI injection
  const narrativeSummary = buildNarrativeSummary(
    characters,
    completedBeats,
    activeThreads,
    progressPercent,
    currentBeatDef,
    sortedChapters[currentChapterIndex]?.title
  );

  return {
    totalChapters: sortedChapters.length,
    currentChapterIndex,
    progressPercent,
    totalWordCount,
    activeCharacters,
    currentBeat: currentBeatDef ? {
      beatType: currentBeatDef.beatType,
      label: currentBeatDef.label,
      description: currentBeatDef.description,
      percentOfStory: currentBeatDef.percentOfStory ?? 0,
    } : null,
    nextBeat: nextBeatDef ? {
      beatType: nextBeatDef.beatType,
      label: nextBeatDef.label,
      description: nextBeatDef.description,
      percentOfStory: nextBeatDef.percentOfStory ?? 0,
    } : null,
    completedBeats,
    upcomingBeats,
    activeThreads,
    resolvedThreads,
    alerts,
    narrativeSummary,
  };
}

// ============================================================================
// Narrative Summary Builder (for AI context)
// ============================================================================

function buildNarrativeSummary(
  characters: Character[],
  completedBeats: PlotBeat[],
  activeThreads: StoryThread[],
  progressPercent: number,
  currentBeat: { label: string; description: string } | null,
  currentChapterTitle?: string
): string {
  const parts: string[] = [];

  parts.push(`Story is ${progressPercent}% complete.`);

  if (currentChapterTitle) {
    parts.push(`Currently writing: ${currentChapterTitle}.`);
  }

  if (currentBeat) {
    parts.push(`Current story beat: "${currentBeat.label}" -- ${currentBeat.description}.`);
  }

  if (characters.length > 0) {
    const protag = characters.find(c => c.role === 'protagonist');
    const antag = characters.find(c => c.role === 'antagonist');
    if (protag) {
      const arcInfo = protag.arc ? ` Arc: ${protag.arc}.` : '';
      const goalInfo = protag.goals ? ` Goals: ${protag.goals}.` : '';
      parts.push(`Protagonist: ${protag.name}.${arcInfo}${goalInfo}`);
    }
    if (antag) {
      parts.push(`Antagonist: ${antag.name}. Motivation: ${antag.motivation || 'unspecified'}.`);
    }

    const supporting = characters.filter(c => c.role !== 'protagonist' && c.role !== 'antagonist');
    if (supporting.length > 0) {
      parts.push(`Other characters: ${supporting.map(c => `${c.name} (${c.role})`).join(', ')}.`);
    }
  }

  if (completedBeats.length > 0) {
    parts.push(`Completed beats: ${completedBeats.map(b => b.title).join(', ')}.`);
  }

  if (activeThreads.length > 0) {
    parts.push(`Active story threads: ${activeThreads.map(t => t.name).join(', ')}.`);
  }

  return parts.join(' ');
}

// ============================================================================
// Arc Phase Labels & Colors
// ============================================================================

export const ARC_PHASE_CONFIG: Record<ArcPhase, { label: string; color: string; bgColor: string }> = {
  setup: { label: 'Setup', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)' },
  rising: { label: 'Rising', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
  crisis: { label: 'Crisis', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' },
  climax: { label: 'Climax', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)' },
  resolution: { label: 'Resolution', color: '#10b981', bgColor: 'rgba(16,185,129,0.15)' },
};

export const THREAD_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

export const ALERT_SEVERITY_CONFIG = {
  info: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: 'info' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: 'alert-triangle' },
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: 'alert-circle' },
} as const;
