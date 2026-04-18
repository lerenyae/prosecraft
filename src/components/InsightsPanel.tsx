'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  Clock,
  Target,
  BookOpen,
  Type,
  SpellCheck,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useStore } from '@/lib/store';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function getTopWords(text: string, count: number = 10): { word: string; count: number }[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'it', 'its', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him',
    'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'what',
    'which', 'who', 'whom', 'if', 'then', 'than', 'so', 'no', 'not',
    'just', 'as', 'from', 'up', 'out', 'about', 'into', 'over', 'after',
    'all', 'also', 'how', 'each', 'both', 'more', 'when', 'where', 'there',
    'here', 'very', 'even', 'back', 'down', 'still', 'through', 'own',
  ]);

  const words = text.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  const freq: Record<string, number> = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([word, count]) => ({ word, count }));
}

const OVERUSED_WORDS = [
  'very', 'really', 'just', 'quite', 'rather', 'somewhat', 'seemed',
  'felt', 'thought', 'realized', 'noticed', 'watched', 'looked',
  'suddenly', 'began to', 'started to', 'almost', 'slightly',
];

function getOverusedWords(text: string): { word: string; count: number }[] {
  const lower = text.toLowerCase();
  return OVERUSED_WORDS
    .map(word => ({
      word,
      count: (lower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length,
    }))
    .filter(w => w.count >= 3)
    .sort((a, b) => b.count - a.count);
}

export default function InsightsPanel({ onFilterWordClick }: { onFilterWordClick?: (word: string) => void }) {
  const {
    currentProject,
    currentChapter,
    projectChapters,
    chapterScenes,
    projectWordCount,
    chapterWordCount,
  } = useStore();

  const [sessionStartWords, setSessionStartWords] = useState<number | null>(null);
  const [grammarEnabled, setGrammarEnabled] = useState(false);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [grammarResult, setGrammarResult] = useState<{
    grammar: { score: number; label: string; issues: string[]; note: string };
    language: { score: number; label: string; qualities: string[]; note: string };
  } | null>(null);

  // Track session start word count
  useEffect(() => {
    if (sessionStartWords === null && projectWordCount > 0) {
      setSessionStartWords(projectWordCount);
    }
  }, [projectWordCount, sessionStartWords]);

  const sessionWords = sessionStartWords !== null ? projectWordCount - sessionStartWords : 0;

  // Aggregate all text for analysis
  const allText = useMemo(() => {
    if (!currentProject) return '';
    const texts: string[] = [];
    projectChapters.forEach(ch => {
      const scenes = chapterScenes(ch.id);
      scenes.forEach(s => {
        if (s.content) texts.push(stripHtml(s.content));
      });
    });
    return texts.join(' ');
  }, [currentProject, projectChapters, chapterScenes]);

  // Per-chapter text for word analysis (falls back to all text if no chapter selected)
  const chapterText = useMemo(() => {
    if (!currentChapter) return allText;
    const scenes = chapterScenes(currentChapter.id);
    return scenes.map(s => s.content ? stripHtml(s.content) : '').join(' ');
  }, [currentChapter, chapterScenes, allText]);

  const runGrammarCheck = useCallback(async () => {
    if (!currentProject || !allText || allText.length < 50) return;
    setGrammarLoading(true);
    try {
      const scenes: string[] = [];
      projectChapters.forEach(ch => {
        const s = chapterScenes(ch.id);
        s.forEach(sc => { if (sc.content) scenes.push(sc.content); });
      });
      const content = scenes.join('\n\n');

      const res = await fetch('/api/ai/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, genre: currentProject.genre }),
      });
      if (res.ok) {
        const data = await res.json();
        setGrammarResult(data);
      }
    } catch {
      // silent fail
    } finally {
      setGrammarLoading(false);
    }
  }, [currentProject, allText, projectChapters, chapterScenes]);

  const topWords = useMemo(() => getTopWords(chapterText, 8), [chapterText]);
  const overused = useMemo(() => getOverusedWords(chapterText), [chapterText]);
  const maxWordCount = topWords[0]?.count || 1;

  const readingTime = Math.max(1, Math.round(projectWordCount / 250));
  const paragraphCount = allText.split(/\n\n|\.\s+/).filter(p => p.trim().length > 0).length;
  const sentenceCount = (allText.match(/[.!?]+/g) || []).length;

  const goal = currentProject?.wordCountGoal || 50000;
  const dailyGoal = (currentProject as any)?.dailyGoal || 0;
  const goalDeadline = (currentProject as any)?.goalDeadline || '';
  const progress = Math.min(100, Math.round((projectWordCount / goal) * 100));

  // Calculate days remaining
  const daysRemaining = goalDeadline
    ? Math.max(0, Math.ceil((new Date(goalDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // SVG circle for progress ring
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (!currentProject) return null;

  return (
    <div className="flex flex-col gap-5 p-4 h-full overflow-y-auto">
      {/* Session Stats */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--color-surface-alt)]">
          <TrendingUp size={16} className="text-[var(--color-accent)]" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">This Session</p>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">
            {sessionWords >= 0 ? '+' : ''}{sessionWords.toLocaleString()} words
          </p>
        </div>
      </div>

      {/* Manuscript Goal */}
      <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-[var(--color-accent)]" />
          <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Manuscript Goal</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <svg width="84" height="84" viewBox="0 0 84 84">
              <circle
                cx="42" cy="42" r={radius}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="6"
              />
              <circle
                cx="42" cy="42" r={radius}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 42 42)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-[var(--color-accent)]">{progress}%</span>
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--color-text-primary)]">
              {projectWordCount.toLocaleString()}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              of {goal.toLocaleString()} words
            </p>
            {projectWordCount < goal && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {(goal - projectWordCount).toLocaleString()} remaining
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Daily Goal & Deadline */}
      {(dailyGoal > 0 || goalDeadline) && (
        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          {dailyGoal > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Today&apos;s Goal</p>
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {sessionWords}/{dailyGoal.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    sessionWords >= dailyGoal ? 'bg-emerald-500' : 'bg-[var(--color-accent)]'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((sessionWords / dailyGoal) * 100))}%` }}
                />
              </div>
              {sessionWords >= dailyGoal && (
                <p className="text-xs text-emerald-500 font-medium mt-1.5">Daily goal reached!</p>
              )}
            </div>
          )}
          {daysRemaining !== null && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--color-text-muted)]">Deadline</p>
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                {daysRemaining === 0 ? 'Today!' : `${daysRemaining} days left`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reading Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
          <Clock size={14} className="text-[var(--color-accent)] mx-auto mb-1" />
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{readingTime}m</p>
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Read Time</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
          <BookOpen size={14} className="text-[var(--color-accent)] mx-auto mb-1" />
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{paragraphCount}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Paragraphs</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
          <Type size={14} className="text-[var(--color-accent)] mx-auto mb-1" />
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{sentenceCount}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Sentences</p>
        </div>
      </div>

      {/* Chapter Summary */}
      {projectChapters.length > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide mb-3">Chapters</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">{projectChapters.length}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Total</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                {projectChapters.length > 0 ? Math.round(projectWordCount / projectChapters.length).toLocaleString() : 0}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Avg Words</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                {Math.max(...projectChapters.map(ch => chapterWordCount(ch.id)), 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Longest</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                {projectChapters.length > 0 ? Math.min(...projectChapters.map(ch => chapterWordCount(ch.id))).toLocaleString() : 0}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Shortest</p>
            </div>
          </div>
        </div>
      )}

      {/* Most Used Words */}
      {topWords.length > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide mb-3">
            Most Used Words {currentChapter ? `\u2014 ${currentChapter.title}` : '\u2014 All Chapters'}
          </p>
          <div className="flex flex-col gap-1.5">
            {topWords.map(({ word, count }) => (
              <div key={word} className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-secondary)] w-16 truncate flex-shrink-0 font-mono">{word}</span>
                <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-accent-light)] rounded-full"
                    style={{ width: `${(count / maxWordCount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] w-8 text-right flex-shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grammar Score */}
      <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SpellCheck size={14} className="text-[var(--color-accent)]" />
            <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Grammar Score</p>
          </div>
          <button
            onClick={() => {
              setGrammarEnabled(!grammarEnabled);
              if (!grammarEnabled && !grammarResult) runGrammarCheck();
            }}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            title={grammarEnabled ? 'Disable grammar check' : 'Enable grammar check'}
          >
            {grammarEnabled ? <ToggleRight size={20} className="text-[var(--color-accent)]" /> : <ToggleLeft size={20} />}
          </button>
        </div>

        {grammarEnabled && grammarLoading && (
          <div className="flex items-center gap-2 py-3">
            <Loader2 size={14} className="animate-spin text-[var(--color-accent)]" />
            <span className="text-xs text-[var(--color-text-muted)]">Analyzing...</span>
          </div>
        )}

        {grammarEnabled && grammarResult && !grammarLoading && (() => {
          const unified = Math.round((grammarResult.grammar.score + grammarResult.language.score) / 2);
          const label = unified >= 90 ? 'Excellent' : unified >= 80 ? 'Strong' : unified >= 70 ? 'Good' : unified >= 55 ? 'Needs Work' : 'Rough';
          const allIssues = [...grammarResult.grammar.issues, ...grammarResult.language.qualities].slice(0, 4);
          return (
          <div className="flex flex-col gap-3">
            {/* Unified Score */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="var(--color-border)" strokeWidth="4" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 22} strokeDashoffset={2 * Math.PI * 22 * (1 - unified / 100)}
                    transform="rotate(-90 28 28)" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-[var(--color-accent)]">{unified}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed mt-0.5">{grammarResult.grammar.note}</p>
              </div>
            </div>

            {/* Tags */}
            {allIssues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {allIssues.map((item, i) => (
                  <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">{item}</span>
                ))}
              </div>
            )}

            {grammarResult.language.note && (
              <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">{grammarResult.language.note}</p>
            )}

            {/* Re-run button */}
            <button
              onClick={runGrammarCheck}
              className="text-[10px] text-[var(--color-accent)] hover:underline self-end"
            >
              Re-analyze
            </button>
          </div>
          );
        })()}

        {grammarEnabled && !grammarResult && !grammarLoading && projectWordCount < 50 && (
          <p className="text-xs text-[var(--color-text-muted)]">Write at least 50 words to get a score.</p>
        )}
      </div>

      {/* Overused Words Warning */}
      {overused.length > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide mb-3">
            Filter Words to Watch {currentChapter ? `\u2014 ${currentChapter.title}` : ''}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {overused.map(({ word, count }) => (
              <button
                key={word}
                onClick={() => onFilterWordClick?.(word)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
              >
                {word}
                <span className="text-[10px] font-bold bg-[var(--color-border)] text-[var(--color-text-muted)] px-1 rounded">x{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
