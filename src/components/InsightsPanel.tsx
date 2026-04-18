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
  Zap,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  ArrowRight,
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

export default function InsightsPanel() {
  const {
    currentProject,
    currentChapter,
    projectChapters,
    chapterScenes,
    projectWordCount,
    chapterWordCount,
    setHighlightWord,
  } = useStore();

  const [sessionStartWords, setSessionStartWords] = useState<number | null>(null);
  const [grammarEnabled, setGrammarEnabled] = useState(false);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [grammarResult, setGrammarResult] = useState<{
    grammar: { score: number; label: string; issues: string[]; note: string };
    language: { score: number; label: string; qualities: string[]; note: string };
  } | null>(null);

  // Quick Scan state
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{
    verdict: string;
    scores: Record<string, { score: number; label: string }>;
    flags: string[];
    strengths: string[];
  } | null>(null);
  const [scanExpanded, setScanExpanded] = useState(true);

  // Filter words analysis state
  const [filterAnalysis, setFilterAnalysis] = useState<{
    word: string;
    count: number;
    severity: string;
    explanation: string;
    example: string;
    fix: string;
  }[] | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState<string | null>(null);

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

  // Quick Scan — runs on current chapter
  const runQuickScan = useCallback(async () => {
    if (!currentProject) return;
    const chapter = currentChapter || projectChapters[0];
    if (!chapter) return;

    const scenes = chapterScenes(chapter.id);
    const content = scenes.map(s => s.content || '').join('\n\n');
    if (stripHtml(content).length < 50) return;

    setScanLoading(true);
    setScanResult(null);
    try {
      const chapterIndex = projectChapters.findIndex(ch => ch.id === chapter.id);
      const position = projectChapters.length > 1
        ? `chapter ${chapterIndex + 1} of ${projectChapters.length}`
        : undefined;

      const res = await fetch('/api/ai/quickscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          chapterTitle: chapter.title,
          genre: currentProject.genre,
          chapterPosition: position,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
        setScanExpanded(true);
      }
    } catch {
      // silent fail
    } finally {
      setScanLoading(false);
    }
  }, [currentProject, currentChapter, projectChapters, chapterScenes]);

  // Chapter-scoped text for per-chapter analysis
  const chapterText = useMemo(() => {
    const chapter = currentChapter || projectChapters[0];
    if (!chapter) return '';
    const scenes = chapterScenes(chapter.id);
    return scenes.map(s => s.content ? stripHtml(s.content) : '').join(' ');
  }, [currentChapter, projectChapters, chapterScenes]);

  const chapterTitle = (currentChapter || projectChapters[0])?.title || '';

  const topWords = useMemo(() => getTopWords(chapterText, 8), [chapterText]);
  const overused = useMemo(() => getOverusedWords(chapterText), [chapterText]);
  const maxWordCount = topWords[0]?.count || 1;

  // Run AI analysis on filter words
  const runFilterAnalysis = useCallback(async () => {
    if (!currentProject || overused.length === 0) return;
    const chapter = currentChapter || projectChapters[0];
    if (!chapter) return;

    const scenes = chapterScenes(chapter.id);
    const content = scenes.map(s => s.content || '').join('\n\n');

    setFilterLoading(true);
    setFilterAnalysis(null);
    try {
      const res = await fetch('/api/ai/filterwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          filterWords: overused.map(w => w.word),
          genre: currentProject.genre,
          chapterTitle: chapter.title,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFilterAnalysis(data.analysis || []);
      }
    } catch {
      // silent fail
    } finally {
      setFilterLoading(false);
    }
  }, [currentProject, currentChapter, projectChapters, chapterScenes, overused]);

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

      {/* Quick Scan */}
      <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-[var(--color-accent)]" />
            <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Quick Scan</p>
          </div>
          <div className="flex items-center gap-1">
            {scanResult && (
              <button
                onClick={() => setScanExpanded(!scanExpanded)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {scanExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            <button
              onClick={runQuickScan}
              disabled={scanLoading || projectWordCount < 50}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                scanLoading || projectWordCount < 50
                  ? 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
                  : 'bg-[var(--color-accent)] text-white hover:opacity-90'
              }`}
            >
              {scanLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" />
                  Scanning...
                </span>
              ) : scanResult ? 'Re-scan' : 'Scan Chapter'}
            </button>
          </div>
        </div>

        {!scanResult && !scanLoading && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {projectWordCount < 50
              ? 'Write at least 50 words to scan.'
              : 'One-click health check on your current chapter.'}
          </p>
        )}

        {scanResult && scanExpanded && (
          <div className="flex flex-col gap-3 mt-1">
            {/* Verdict */}
            <p className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
              {scanResult.verdict}
            </p>

            {/* Score bars */}
            <div className="flex flex-col gap-2">
              {Object.entries(scanResult.scores).map(([key, { score, label }]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase w-14 flex-shrink-0">{key}</span>
                  <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        score >= 7 ? 'bg-emerald-500' :
                        score >= 5 ? 'bg-[var(--color-accent)]' :
                        'bg-amber-500'
                      }`}
                      style={{ width: `${score * 10}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium w-16 text-right flex-shrink-0 ${
                    score >= 7 ? 'text-emerald-500' :
                    score >= 5 ? 'text-[var(--color-text-secondary)]' :
                    'text-amber-500'
                  }`}>{label}</span>
                </div>
              ))}
            </div>

            {/* Flags */}
            {scanResult.flags.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <AlertTriangle size={10} className="text-amber-500" />
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-medium">Fix</span>
                </div>
                <div className="flex flex-col gap-1">
                  {scanResult.flags.map((flag, i) => (
                    <p key={i} className="text-xs text-[var(--color-text-secondary)] pl-3 border-l-2 border-amber-500/30">
                      {flag}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {scanResult.strengths.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <CheckCircle2 size={10} className="text-emerald-500" />
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-medium">Working</span>
                </div>
                <div className="flex flex-col gap-1">
                  {scanResult.strengths.map((s, i) => (
                    <p key={i} className="text-xs text-[var(--color-text-secondary)] pl-3 border-l-2 border-emerald-500/30">
                      {s}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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

      {/* Chapter Breakdown */}
      <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide mb-3">Chapters</p>
        <div className="flex flex-col gap-2">
          {projectChapters.map(ch => {
            const wc = chapterWordCount(ch.id);
            const chPct = goal > 0 ? Math.min(100, Math.round((wc / (goal / Math.max(projectChapters.length, 1))) * 100)) : 0;
            return (
              <div key={ch.id} className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-secondary)] w-24 truncate flex-shrink-0">{ch.title}</span>
                <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, chPct)}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--color-text-muted)] w-12 text-right flex-shrink-0">
                  {wc.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Most Used Words */}
      {topWords.length > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide mb-3">Most Used Words {chapterTitle ? `\u2014 ${chapterTitle}` : ''}</p>
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

      {/* Grammar & Language Score */}
      <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SpellCheck size={14} className="text-[var(--color-accent)]" />
            <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Grammar & Language</p>
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

        {grammarEnabled && grammarResult && !grammarLoading && (
          <div className="flex flex-col gap-3">
            {/* Grammar Score */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Grammar</span>
                <span className={`text-xs font-semibold ${
                  grammarResult.grammar.score >= 85 ? 'text-emerald-500' :
                  grammarResult.grammar.score >= 70 ? 'text-[var(--color-accent)]' :
                  'text-amber-500'
                }`}>{grammarResult.grammar.score}/100</span>
              </div>
              <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    grammarResult.grammar.score >= 85 ? 'bg-emerald-500' :
                    grammarResult.grammar.score >= 70 ? 'bg-[var(--color-accent)]' :
                    'bg-amber-500'
                  }`}
                  style={{ width: `${grammarResult.grammar.score}%` }}
                />
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)]">{grammarResult.grammar.note}</p>
              {grammarResult.grammar.issues.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {grammarResult.grammar.issues.slice(0, 3).map((issue, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15">{issue}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Language Score */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Language</span>
                <span className={`text-xs font-semibold ${
                  grammarResult.language.score >= 85 ? 'text-emerald-500' :
                  grammarResult.language.score >= 70 ? 'text-[var(--color-accent)]' :
                  'text-amber-500'
                }`}>{grammarResult.language.score}/100</span>
              </div>
              <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    grammarResult.language.score >= 85 ? 'bg-emerald-500' :
                    grammarResult.language.score >= 70 ? 'bg-[var(--color-accent)]' :
                    'bg-amber-500'
                  }`}
                  style={{ width: `${grammarResult.language.score}%` }}
                />
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)]">{grammarResult.language.note}</p>
              {grammarResult.language.qualities.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {grammarResult.language.qualities.slice(0, 3).map((q, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">{q}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Re-run button */}
            <button
              onClick={runGrammarCheck}
              className="text-[10px] text-[var(--color-accent)] hover:underline self-end"
            >
              Re-analyze
            </button>
          </div>
        )}

        {grammarEnabled && !grammarResult && !grammarLoading && projectWordCount < 50 && (
          <p className="text-xs text-[var(--color-text-muted)]">Write at least 50 words to get a score.</p>
        )}
      </div>

      {/* Filter Words — Chapter Scoped */}
      {overused.length > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
                Filter Words {chapterTitle ? `\u2014 ${chapterTitle}` : ''}
              </p>
            </div>
            <button
              onClick={runFilterAnalysis}
              disabled={filterLoading}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                filterLoading
                  ? 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
              }`}
            >
              {filterLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  Analyzing...
                </span>
              ) : filterAnalysis ? (
                <span className="flex items-center gap-1">
                  <Sparkles size={10} />
                  Re-analyze
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Sparkles size={10} />
                  Why these?
                </span>
              )}
            </button>
          </div>

          {/* Clickable word badges */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {overused.map(({ word, count }) => (
              <button
                key={word}
                onClick={() => setHighlightWord(word)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer"
                title={`Click to find "${word}" in editor`}
              >
                <Search size={10} className="opacity-50" />
                {word}
                <span className="text-[10px] opacity-70">x{count}</span>
              </button>
            ))}
          </div>

          {/* AI Analysis Results */}
          {filterAnalysis && filterAnalysis.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-[var(--color-border)]">
              {filterAnalysis.map((item) => (
                <div key={item.word} className="rounded-md overflow-hidden">
                  {/* Collapsed row */}
                  <button
                    onClick={() => setFilterExpanded(filterExpanded === item.word ? null : item.word)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-[var(--color-surface-alt)] transition-colors rounded-md"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      item.severity === 'high' ? 'bg-red-500' :
                      item.severity === 'medium' ? 'bg-amber-500' :
                      'bg-yellow-400'
                    }`} />
                    <span className="text-xs font-medium text-[var(--color-text-secondary)] flex-1">{item.word}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">x{item.count}</span>
                    {filterExpanded === item.word ? <ChevronUp size={12} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={12} className="text-[var(--color-text-muted)]" />}
                  </button>

                  {/* Expanded detail */}
                  {filterExpanded === item.word && (
                    <div className="px-2.5 pb-2.5 flex flex-col gap-2">
                      <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                        {item.explanation}
                      </p>
                      {item.example && (
                        <div className="pl-2.5 border-l-2 border-amber-500/30">
                          <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-medium mb-0.5">Original</p>
                          <p className="text-[11px] text-[var(--color-text-secondary)] italic">&ldquo;{item.example}&rdquo;</p>
                        </div>
                      )}
                      {item.fix && (
                        <div className="pl-2.5 border-l-2 border-emerald-500/30">
                          <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-medium mb-0.5">Suggested fix</p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 italic">&ldquo;{item.fix}&rdquo;</p>
                        </div>
                      )}
                      <button
                        onClick={() => setHighlightWord(item.word)}
                        className="self-start flex items-center gap-1 text-[10px] text-[var(--color-accent)] hover:underline"
                      >
                        <Search size={10} />
                        Find in editor
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
