'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Activity,
  Users,
  Target,
  GitBranch,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Check,
  Zap,
  TrendingUp,
  BookOpen,
  EyeOff,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import {
  assembleStoryContext,
  getThreads,
  saveThread,
  deleteThread,
  ARC_PHASE_CONFIG,
  THREAD_COLORS,
  ALERT_SEVERITY_CONFIG,
} from '@/lib/story-intel';
import type {
  StoryContext,
  StoryThread,
  ArcPhase,
  ConsistencyAlert,
} from '@/types';

// ============================================================================
// Sub-components
// ============================================================================

function InfoPopover({ text, title }: { text: string; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        aria-label={title || 'More info'}
      >
        <Info size={12} />
      </button>
      {open && (
        <span
          className="absolute left-5 top-1/2 -translate-y-1/2 z-50 w-64 p-2.5 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-lg text-[11px] text-[var(--color-text-secondary)] leading-snug text-left normal-case tracking-normal font-normal"
          role="tooltip"
        >
          {title && (
            <span className="block text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1 font-medium">
              {title}
            </span>
          )}
          {text}
        </span>
      )}
    </span>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  expanded,
  onToggle,
  info,
}: {
  icon: typeof Activity;
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  info?: { title?: string; text: string };
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--color-surface-alt)] transition-colors"
    >
      <Icon size={14} className="text-[var(--color-accent)] flex-shrink-0" />
      <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider text-left">
        {title}
      </span>
      {info && <InfoPopover title={info.title} text={info.text} />}
      <span className="flex-1" />
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white min-w-[20px] text-center">
          {count}
        </span>
      )}
      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    </button>
  );
}

// --- Story Progress Section ---

function StoryProgressSection({ ctx }: { ctx: StoryContext }) {
  const progressColor =
    ctx.progressPercent < 25 ? '#3b82f6' :
    ctx.progressPercent < 50 ? '#f59e0b' :
    ctx.progressPercent < 75 ? '#8b5cf6' :
    '#10b981';

  return (
    <div className="px-3 py-2 space-y-3">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-[11px] text-[var(--color-text-muted)]">Overall Progress</span>
          <span className="text-sm font-bold" style={{ color: progressColor }}>
            {ctx.progressPercent}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${ctx.progressPercent}%`, backgroundColor: progressColor }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {ctx.totalWordCount.toLocaleString()} words
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {ctx.totalChapters} chapters
          </span>
        </div>
      </div>

      {/* Current & Next Beat */}
      {ctx.currentBeat && (
        <div className="rounded-lg border border-[var(--color-border)] p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <Target size={12} className="text-[var(--color-accent)]" />
            <span className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Current Beat</span>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-primary)]">{ctx.currentBeat.label}</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
              {ctx.currentBeat.description}
            </p>
          </div>
        </div>
      )}

      {ctx.nextBeat && (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-2.5 opacity-70">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-[var(--color-text-muted)]" />
            <span className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Next Beat</span>
            <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">{ctx.nextBeat.percentOfStory}%</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)]">{ctx.nextBeat.label}</p>
        </div>
      )}
    </div>
  );
}

// --- Active Characters Section ---

function CharactersSection({ ctx }: { ctx: StoryContext }) {
  if (ctx.activeCharacters.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <Users size={20} className="mx-auto mb-2 text-[var(--color-text-muted)] opacity-50" />
        <p className="text-[11px] text-[var(--color-text-muted)]">
          No characters created yet.
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
          Add characters in the Characters tab to track arcs here.
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 space-y-1.5">
      {ctx.activeCharacters.map(({ character, arcPhase, chaptersSinceLastAppearance }) => {
        const phaseConfig = ARC_PHASE_CONFIG[arcPhase];
        const isAbsent = chaptersSinceLastAppearance >= 3;

        return (
          <div
            key={character.id}
            className="flex items-center gap-2 p-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: phaseConfig.bgColor, color: phaseConfig.color }}
            >
              {character.avatar || character.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                  {character.name}
                </span>
                {isAbsent && (
                  <EyeOff size={10} className="text-yellow-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: phaseConfig.bgColor, color: phaseConfig.color }}
                >
                  {phaseConfig.label}
                </span>
                <span className="text-[9px] text-[var(--color-text-muted)] capitalize">
                  {character.role}
                </span>
              </div>
            </div>

            {/* Arc phase indicator */}
            <div className="flex flex-col items-center gap-0.5">
              {(['setup', 'rising', 'crisis', 'climax', 'resolution'] as ArcPhase[]).map((phase) => (
                <div
                  key={phase}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: phase === arcPhase
                      ? ARC_PHASE_CONFIG[phase].color
                      : 'var(--color-surface-alt)',
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Beat Alignment Section ---

function BeatAlignmentSection({ ctx }: { ctx: StoryContext }) {
  return (
    <div className="px-3 py-2 space-y-2">
      {/* Completed beats */}
      {ctx.completedBeats.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">Completed</span>
          {ctx.completedBeats.map(beat => (
            <div key={beat.id} className="flex items-center gap-2 pl-1">
              <Check size={10} className="text-green-500 flex-shrink-0" />
              <span className="text-[11px] text-[var(--color-text-secondary)]">{beat.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming beats */}
      {ctx.upcomingBeats.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">Upcoming</span>
          {ctx.upcomingBeats.slice(0, 4).map((beat) => (
            <div key={beat.beatType} className="flex items-center gap-2 pl-1 opacity-60">
              <div className="w-2.5 h-2.5 rounded-full border border-[var(--color-border)] flex-shrink-0" />
              <span className="text-[11px] text-[var(--color-text-muted)]">{beat.label}</span>
              <span className="text-[9px] text-[var(--color-text-muted)] ml-auto">{beat.percentOfStory}%</span>
            </div>
          ))}
          {ctx.upcomingBeats.length > 4 && (
            <p className="text-[10px] text-[var(--color-text-muted)] pl-1">
              +{ctx.upcomingBeats.length - 4} more beats
            </p>
          )}
        </div>
      )}

      {ctx.completedBeats.length === 0 && ctx.upcomingBeats.length === 0 && (
        <div className="text-center py-3">
          <BookOpen size={16} className="mx-auto mb-1.5 text-[var(--color-text-muted)] opacity-50" />
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Set up your beat sheet in the Storyboard to track alignment.
          </p>
        </div>
      )}
    </div>
  );
}

// --- Thread Tracker Section ---

function ThreadTrackerSection({
  ctx,
  projectId,
  onRefresh,
}: {
  ctx: StoryContext;
  projectId: string;
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<StoryThread['type']>('plot');

  const handleAdd = () => {
    if (!newName.trim()) return;
    const usedColors = [...ctx.activeThreads, ...ctx.resolvedThreads].map(t => t.color);
    const nextColor = THREAD_COLORS.find(c => !usedColors.includes(c)) || THREAD_COLORS[0];

    saveThread({
      id: `thread-${Date.now()}`,
      projectId,
      name: newName.trim(),
      color: nextColor,
      type: newType,
      status: 'active',
      createdAt: new Date(),
    });
    setNewName('');
    setShowAdd(false);
    onRefresh();
  };

  const handleResolve = (threadId: string) => {
    const threads = getThreads(projectId);
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      saveThread({ ...thread, status: 'resolved' });
      onRefresh();
    }
  };

  const handleDelete = (threadId: string) => {
    deleteThread(threadId);
    onRefresh();
  };

  return (
    <div className="px-3 py-2 space-y-2">
      {/* Active threads */}
      {ctx.activeThreads.map(thread => (
        <div
          key={thread.id}
          className="flex items-center gap-2 p-2 rounded-lg border border-[var(--color-border)]"
        >
          <div
            className="w-2 h-full min-h-[24px] rounded-full flex-shrink-0"
            style={{ backgroundColor: thread.color }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-[var(--color-text-primary)] truncate">
              {thread.name}
            </p>
            <p className="text-[9px] text-[var(--color-text-muted)] capitalize">{thread.type}</p>
          </div>
          <button
            onClick={() => handleResolve(thread.id)}
            className="p-1 rounded hover:bg-green-500/10 text-green-500 transition-colors"
            title="Mark resolved"
          >
            <Check size={12} />
          </button>
          <button
            onClick={() => handleDelete(thread.id)}
            className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors"
            title="Remove"
          >
            <X size={10} />
          </button>
        </div>
      ))}

      {/* Resolved threads */}
      {ctx.resolvedThreads.length > 0 && (
        <div className="space-y-1 opacity-50">
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">Resolved</span>
          {ctx.resolvedThreads.map(thread => (
            <div key={thread.id} className="flex items-center gap-2 pl-1">
              <Check size={10} className="text-green-500" />
              <span className="text-[11px] text-[var(--color-text-muted)] line-through">{thread.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add thread */}
      {showAdd ? (
        <div className="space-y-2 p-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-surface-alt)]">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Thread name..."
            className="w-full text-xs p-1.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            autoFocus
          />
          <div className="flex gap-1">
            {(['plot', 'character', 'theme', 'subplot'] as const).map(type => (
              <button
                key={type}
                onClick={() => setNewType(type)}
                className={`text-[9px] px-2 py-0.5 rounded-full capitalize transition-colors ${
                  newType === type
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => setShowAdd(false)}
              className="text-[10px] px-2 py-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="text-[10px] px-2 py-1 rounded bg-[var(--color-accent)] text-white"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-[11px] text-[var(--color-accent)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <Plus size={12} /> Add Thread
        </button>
      )}
    </div>
  );
}

// --- Alerts Section ---

function AlertsSection({ ctx }: { ctx: StoryContext }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAlerts = ctx.alerts.filter(a => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) {
    return (
      <div className="px-3 py-3 text-center">
        <Zap size={16} className="mx-auto mb-1.5 text-green-500 opacity-70" />
        <p className="text-[11px] text-[var(--color-text-muted)]">All clear -- no consistency issues detected.</p>
      </div>
    );
  }

  const severityIcon = (severity: ConsistencyAlert['severity']) => {
    switch (severity) {
      case 'critical': return <AlertCircle size={12} />;
      case 'warning': return <AlertTriangle size={12} />;
      default: return <Info size={12} />;
    }
  };

  return (
    <div className="px-3 py-2 space-y-1.5">
      {visibleAlerts.map(alert => {
        const config = ALERT_SEVERITY_CONFIG[alert.severity];
        return (
          <div
            key={alert.id}
            className="p-2 rounded-lg border border-[var(--color-border)] flex gap-2"
            style={{ backgroundColor: config.bg }}
          >
            <div className="flex-shrink-0 mt-0.5" style={{ color: config.color }}>
              {severityIcon(alert.severity)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-[var(--color-text-primary)]">{alert.title}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                {alert.description}
              </p>
            </div>
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(alert.id))}
              className="flex-shrink-0 p-0.5 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"
              title="Dismiss"
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Panel
// ============================================================================

export default function StoryIntelPanel() {
  const {
    currentProjectId,
    currentProject,
    projectChapters,
    _dataVersion,
  } = useStore();

  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    progress: true,
    characters: true,
    beats: false,
    threads: true,
    alerts: true,
  });

  // Beat Sheet Mode: opt-in. When off, Beat Alignment and Consistency panels
  // are hidden — they're only useful if the author is tracking against a beat
  // sheet structure.
  const [beatSheetEnabled, setBeatSheetEnabled] = useState(false);

  useEffect(() => {
    if (!currentProjectId) return;
    try {
      const raw = localStorage.getItem(`prosecraft-beatsheet-${currentProjectId}`);
      setBeatSheetEnabled(raw === 'true');
    } catch {
      setBeatSheetEnabled(false);
    }
  }, [currentProjectId]);

  const toggleBeatSheetMode = useCallback(() => {
    if (!currentProjectId) return;
    const next = !beatSheetEnabled;
    setBeatSheetEnabled(next);
    try {
      localStorage.setItem(`prosecraft-beatsheet-${currentProjectId}`, String(next));
    } catch {
      // ignore
    }
  }, [beatSheetEnabled, currentProjectId]);

  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Get scenes from localStorage
  const scenes = useMemo(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('prosecraft-scenes');
      if (!raw) return {};
      const all = JSON.parse(raw);
      // Filter to current project's chapters
      const chapterIds = new Set(projectChapters.map(c => c.id));
      const filtered: Record<string, any> = {};
      Object.entries(all).forEach(([id, scene]: [string, any]) => {
        if (chapterIds.has(scene.chapterId)) {
          filtered[id] = scene;
        }
      });
      return filtered;
    } catch { return {}; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_dataVersion, projectChapters, refreshKey]);

  // Assemble story context
  const storyContext = useMemo(() => {
    if (!currentProjectId || !currentProject) return null;
    return assembleStoryContext(
      currentProjectId,
      projectChapters,
      scenes,
      null, // TODO: pass current chapter
      currentProject.wordCountGoal || 50000,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, currentProject, projectChapters, scenes, refreshKey]);

  if (!storyContext || !currentProjectId) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
        <div className="text-center px-4">
          <Activity size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs">Select a project to see story intelligence.</p>
        </div>
      </div>
    );
  }

  const alertCount = storyContext.alerts.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto text-[var(--color-text-primary)]">
      {/* Story Progress */}
      <div className="border-b border-[var(--color-border)]">
        <SectionHeader
          icon={Activity}
          title="Story Progress"
          expanded={expandedSections.progress}
          onToggle={() => toggleSection('progress')}
          info={{
            title: 'Story Progress',
            text: 'Where you are in the manuscript vs. your target word count, broken down by structural phase (setup, rising action, climax, resolution).',
          }}
        />
        {expandedSections.progress && <StoryProgressSection ctx={storyContext} />}
      </div>

      {/* Active Characters */}
      <div className="border-b border-[var(--color-border)]">
        <SectionHeader
          icon={Users}
          title="Characters"
          count={storyContext.activeCharacters.length}
          expanded={expandedSections.characters}
          onToggle={() => toggleSection('characters')}
          info={{
            title: 'Active Characters',
            text: 'Characters mentioned in the current chapter and their recent appearances. Useful for spotting who has gone missing from the page or who is overcrowding a scene.',
          }}
        />
        {expandedSections.characters && <CharactersSection ctx={storyContext} />}
      </div>

      {/* Thread Tracker */}
      <div className="border-b border-[var(--color-border)]">
        <SectionHeader
          icon={GitBranch}
          title="Story Threads"
          count={storyContext.activeThreads.length}
          expanded={expandedSections.threads}
          onToggle={() => toggleSection('threads')}
          info={{
            title: 'Story Threads',
            text: 'Subplots and running questions (romance, mystery, mentor arc, etc.). Track which chapter last touched each thread so nothing gets dropped.',
          }}
        />
        {expandedSections.threads && (
          <ThreadTrackerSection
            ctx={storyContext}
            projectId={currentProjectId}
            onRefresh={triggerRefresh}
          />
        )}
      </div>

      {/* Beat Sheet Mode — opt-in gate for Beat Alignment + Consistency */}
      {beatSheetEnabled ? (
        <>
          {/* Beat Alignment */}
          <div className="border-b border-[var(--color-border)]">
            <SectionHeader
              icon={Target}
              title="Beat Alignment"
              count={storyContext.completedBeats.length}
              expanded={expandedSections.beats}
              onToggle={() => toggleSection('beats')}
              info={{
                title: 'Beat Alignment',
                text: 'Compares your chapters against a classic story beat sheet (inciting incident, midpoint, climax, etc.) and flags when a beat is missing or off-position. Requires you to map your chapters to beats.',
              }}
            />
            {expandedSections.beats && <BeatAlignmentSection ctx={storyContext} />}
          </div>

          {/* Consistency Alerts */}
          <div className="border-b border-[var(--color-border)]">
            <SectionHeader
              icon={AlertTriangle}
              title="Consistency"
              count={alertCount}
              expanded={expandedSections.alerts}
              onToggle={() => toggleSection('alerts')}
              info={{
                title: 'Consistency Alerts',
                text: 'Warnings about beat/structure drift: scenes that fall outside their expected arc phase, dropped threads, or missing beats. Only useful if you\'re working to a beat sheet.',
              }}
            />
            {expandedSections.alerts && <AlertsSection ctx={storyContext} />}
          </div>
        </>
      ) : null}

      {/* Beat Sheet Mode Toggle */}
      <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50">
        <button
          onClick={toggleBeatSheetMode}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
        >
          {beatSheetEnabled ? (
            <>
              <EyeOff size={12} className="text-[var(--color-text-muted)] flex-shrink-0" />
              <span className="text-[11px] text-[var(--color-text-secondary)] flex-1">
                Hide Beat Sheet panels
              </span>
            </>
          ) : (
            <>
              <Target size={12} className="text-[var(--color-accent)] flex-shrink-0" />
              <span className="text-[11px] text-[var(--color-text-secondary)] flex-1">
                <span className="font-medium">Enable Beat Sheet Mode</span>
                <span className="block text-[10px] text-[var(--color-text-muted)] mt-0.5 normal-case">
                  Adds Beat Alignment + Consistency panels. For writers using a classic beat sheet structure.
                </span>
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
