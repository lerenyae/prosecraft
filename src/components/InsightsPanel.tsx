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
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { getWritingRules, setWritingRules } from '@/lib/personalization';
import { Info, Plus, Shield } from 'lucide-react';

/**
 * Hover/click info tooltip. Pass `text` (short explanation) and optionally
 * `title`. Icon sits inline with section headers.
 */
function InfoTip({ text, title }: { text: string; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        aria-label={title || 'More info'}
      >
        <Info size={12} />
      </button>
      {open && (
        <span
          className="absolute left-5 top-1/2 -translate-y-1/2 z-50 w-64 p-2.5 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-lg text-[11px] text-[var(--color-text-secondary)] leading-snug"
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
    'said', 'like', 'didn', 'don', 'won', 'isn', 'wasn', 'aren', 'weren',
    'couldn', 'wouldn', 'shouldn', 'didn\'t', 'don\'t', 'won\'t', 'can\'t',
    'without', 'enough', 'before', 'while', 'because', 'until', 'again',
    'between', 'other', 'another', 'any', 'some', 'much', 'many', 'most',
    'only', 'same', 'too', 'now', 'one', 'two', 'new', 'way', 'get',
    'got', 'make', 'made', 'know', 'knew', 'come', 'came', 'take', 'took',
    'see', 'saw', 'been', 'going', 'went', 'want', 'tell', 'told',
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
    .filter(w => w.count >= 2)
    .sort((a, b) => b.count - a.count);
}

export default function InsightsPanel() {
  const {
    currentProject,
    currentChapter,
    projectChapters,
    chapterScenes,
    projectWordCount,
    setHighlightWord,
    updateProject,
  } = useStore();

  // Inline goal editing
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [draftGoal, setDraftGoal] = useState<number>(0);
  const [draftDeadline, setDraftDeadline] = useState<string>('');
  const [draftDailyGoal, setDraftDailyGoal] = useState<number>(0);

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

  // Style profile state
  const [styleProfile, setStyleProfile] = useState<any | null>(null);
  const [styleLoading, setStyleLoading] = useState(false);
  const [styleExpanded, setStyleExpanded] = useState(true);

  // Writing rules state (per-project hard constraints for AI)
  const [rules, setRules] = useState<string[]>([]);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [newRule, setNewRule] = useState('');

  // Load saved style profile for current project
  useEffect(() => {
    if (!currentProject) return;
    try {
      const raw = localStorage.getItem(`prosecraft-style-${currentProject.id}`);
      if (raw) setStyleProfile(JSON.parse(raw));
      else setStyleProfile(null);
    } catch {
      setStyleProfile(null);
    }
  }, [currentProject]);

  // Load writing rules for current project
  useEffect(() => {
    if (!currentProject) {
      setRules([]);
      return;
    }
    setRules(getWritingRules(currentProject.id));
  }, [currentProject]);

  const addRule = useCallback(() => {
    if (!currentProject) return;
    const trimmed = newRule.trim();
    if (!trimmed) return;
    const next = [...rules, trimmed];
    setRules(next);
    setWritingRules(currentProject.id, next);
    setNewRule('');
  }, [currentProject, newRule, rules]);

  const removeRule = useCallback((idx: number) => {
    if (!currentProject) return;
    const next = rules.filter((_, i) => i !== idx);
    setRules(next);
    setWritingRules(currentProject.id, next);
  }, [currentProject, rules]);

  const RULE_PRESETS = [
    'No em dashes',
    'No adverbs ending in -ly',
    'Never use the word "very"',
    'No semicolons',
    'Avoid filter words (felt, saw, heard, thought)',
    'Active voice only',
    'No rhetorical questions in narration',
  ];

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

  // Quick Scan â runs on current chapter
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

  // Style profile generator â full-manuscript sample to Opus
  const runStyleProfile = useCallback(async () => {
    if (!currentProject || !allText || allText.length < 200) return;
    setStyleLoading(true);
    try {
      const res = await fetch('/api/ai/style-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample: allText, genre: currentProject.genre }),
      });
      if (res.ok) {
        const data = await res.json();
        setStyleProfile(data.profile);
        try {
          localStorage.setItem(
            `prosecraft-style-${currentProject.id}`,
            JSON.stringify(data.profile)
          );
        } catch {
          /* quota */
        }
      }
    } catch {
      // silent fail
    } finally {
      setStyleLoading(false);
    }
  }, [currentProject, allText]);

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
            <InfoTip
              title="Quick Scan"
              text="Fast AI read of the current chapter. Returns a one-line verdict, scores pacing/tension/dialogue/prose, and flags issues. Uses the fast model — seconds, not minutes."
            />
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

      {/* Style Profile */}
      <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--color-accent)]" />
            <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Style Profile</p>
            <InfoTip
              title="Style Profile"
              text='Generates a "voice fingerprint" from your manuscript: tone, sentence rhythm, go-to words, tics, and influences. Once generated, every AI rewrite (inline edits, beta reader, feedback) is told to preserve this voice instead of flattening it into generic prose. Regenerate after major revisions.'
            />
          </div>
          <div className="flex items-center gap-1">
            {styleProfile && (
              <button
                onClick={() => setStyleExpanded(!styleExpanded)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {styleExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            <button
              onClick={runStyleProfile}
              disabled={styleLoading || !allText || allText.length < 200}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                styleLoading || !allText || allText.length < 200
                  ? 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] cursor-not-allowed'
                  : 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-dark)]'
              }`}
            >
              {styleLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  Profiling...
                </span>
              ) : styleProfile ? 'Regenerate' : 'Analyze'}
            </button>
          </div>
        </div>

        {!styleProfile && !styleLoading && (
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {!allText || allText.length < 200
              ? 'Write at least 200 characters to unlock style analysis.'
              : 'Generate a fingerprint of your voice â tone, rhythm, go-to words, tics, and influences. Helps the AI match your style.'}
          </p>
        )}

        {styleProfile && styleExpanded && (
          <div className="mt-3 space-y-3 text-[11px]">
            {/* Summary */}
            {styleProfile.summary && (
              <div className="p-2.5 rounded-md bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
                <p className="text-[var(--color-text-primary)] leading-relaxed italic">
                  &ldquo;{styleProfile.summary}&rdquo;
                </p>
              </div>
            )}

            {/* Voice */}
            {styleProfile.voice && (
              <div>
                <p className="text-[10px] uppercase font-medium text-[var(--color-text-muted)] mb-1">Voice</p>
                <p className="text-[var(--color-text-secondary)] leading-relaxed">
                  <span className="font-medium text-[var(--color-text-primary)]">{styleProfile.voice.tone}</span>
                  {styleProfile.voice.formality && ` Â· ${styleProfile.voice.formality}`}
                </p>
                {styleProfile.voice.personality && (
                  <p className="text-[var(--color-text-secondary)] leading-relaxed mt-1">
                    {styleProfile.voice.personality}
                  </p>
                )}
              </div>
            )}

            {/* Sentences */}
            {styleProfile.sentences && (
              <div>
                <p className="text-[10px] uppercase font-medium text-[var(--color-text-muted)] mb-1">Sentences</p>
                <p className="text-[var(--color-text-secondary)] leading-relaxed">
                  Length: <span className="font-medium">{styleProfile.sentences.averageLength}</span>
                </p>
                {styleProfile.sentences.rhythm && (
                  <p className="text-[var(--color-text-secondary)] leading-relaxed mt-0.5">
                    {styleProfile.sentences.rhythm}
                  </p>
                )}
                {styleProfile.sentences.favoredStructures?.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {styleProfile.sentences.favoredStructures.map((s: string, i: number) => (
                      <li key={i} className="text-[var(--color-text-secondary)] before:content-['Â·'] before:mr-1.5 before:text-[var(--color-accent)]">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Go-to words */}
            {styleProfile.diction?.goToWords?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-medium text-[var(--color-text-muted)] mb-1">Go-To Words</p>
                <div className="flex flex-wrap gap-1">
                  {styleProfile.diction.goToWords.map((w: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] text-[10px]">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Unique phrases */}
            {styleProfile.diction?.uniquePhrases?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-medium text-[var(--color-text-muted)] mb-1">Fresh Turns of Phrase</p>
                <ul className="space-y-0.5">
                  {styleProfile.diction.uniquePhrases.map((p: string, i: number) => (
                    <li key={i} className="text-[var(--color-text-secondary)] italic">&ldquo;{p}&rdquo;</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strengths */}
            {styleProfile.techniques?.strengths?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-medium text-[var(--color-text-muted)] mb-1">Strengths</p>
                <ul className="space-y-0.5">
                  {styleProfile.techniques.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-[var(--color-text-secondary)] flex gap-1.5">
                      <CheckCircle2 size={11} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tics */}
            {styleProfile.techniques?.tics?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-medium text-[var(--color-text-muted)] mb-1">Watch For</p>
                <ul className="space-y-0.5">
                  {styleProfile.techniques.tics.map((t: string, i: number) => (
                    <li key={i} className="text-[var(--color-text-secondary)] flex gap-1.5">
                      <AlertTriangle size={11} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Influences */}
            {styleProfile.influences?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-medium text-[var(--color-text-muted)] mb-1">Reminds Me Of</p>
                <p className="text-[var(--color-text-secondary)]">
                  {styleProfile.influences.join(' Â· ')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Writing Rules */}
      <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-[var(--color-accent)]" />
            <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
              Writing Rules
            </p>
            <InfoTip
              title="Writing Rules"
              text='Hard constraints the AI must respect in every rewrite, suggestion, and beta read. Examples: "No em dashes", "No adverbs ending in -ly", "Never use the word very". Rules are stored per project.'
            />
            {rules.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-medium">
                {rules.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setRulesExpanded(!rulesExpanded)}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            {rulesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {!rulesExpanded && rules.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)]">
            No rules set. Expand to add constraints the AI must follow.
          </p>
        )}

        {!rulesExpanded && rules.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {rules.slice(0, 3).map((r, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md text-[10px] bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]">
                {r}
              </span>
            ))}
            {rules.length > 3 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] text-[var(--color-text-muted)]">
                +{rules.length - 3} more
              </span>
            )}
          </div>
        )}

        {rulesExpanded && (
          <div className="flex flex-col gap-2.5 mt-2">
            {rules.length > 0 && (
              <div className="flex flex-col gap-1">
                {rules.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)]"
                  >
                    <span className="flex-1 text-xs text-[var(--color-text-secondary)]">{r}</span>
                    <button
                      onClick={() => removeRule(i)}
                      className="p-0.5 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                      title="Remove rule"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-1.5">
              <input
                type="text"
                value={newRule}
                onChange={e => setNewRule(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRule();
                  }
                }}
                placeholder='e.g. "No em dashes"'
                className="flex-1 px-2.5 py-1.5 text-xs rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <button
                onClick={addRule}
                disabled={!newRule.trim()}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                  newRule.trim()
                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-dark)]'
                    : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] cursor-not-allowed'
                }`}
              >
                <Plus size={12} />
                Add
              </button>
            </div>

            {rules.length === 0 && (
              <div>
                <p className="text-[10px] uppercase font-medium text-[var(--color-text-muted)] mb-1.5">
                  Common presets
                </p>
                <div className="flex flex-wrap gap-1">
                  {RULE_PRESETS.map(preset => (
                    <button
                      key={preset}
                      onClick={() => {
                        if (!currentProject) return;
                        const next = [...rules, preset];
                        setRules(next);
                        setWritingRules(currentProject.id, next);
                      }}
                      className="px-2 py-0.5 rounded-md text-[10px] bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)]/15 hover:text-[var(--color-accent)] border border-[var(--color-border)] transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manuscript Goal */}
      <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-[var(--color-accent)]" />
            <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Manuscript Goal</p>
          </div>
          {!isEditingGoal && (
            <button
              onClick={() => {
                setDraftGoal(goal);
                setDraftDeadline(goalDeadline);
                setDraftDailyGoal(dailyGoal);
                setIsEditingGoal(true);
              }}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              title="Edit goal"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>

        {!isEditingGoal ? (
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
        ) : (
          <div className="flex flex-col gap-3">
            {/* Presets */}
            <div className="flex gap-1.5">
              {[
                { label: 'Short', value: 7500 },
                { label: 'Novella', value: 30000 },
                { label: 'Novel', value: 80000 },
                { label: 'Epic', value: 120000 },
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setDraftGoal(p.value)}
                  className={`flex-1 px-1.5 py-1 rounded text-[10px] font-medium border transition-colors ${
                    draftGoal === p.value
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : 'bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Total Words</span>
              <input
                type="number"
                value={draftGoal}
                onChange={e => setDraftGoal(Number(e.target.value))}
                className="mt-1 w-full px-2 py-1.5 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </label>

            <label className="block">
              <span className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Deadline</span>
              <input
                type="date"
                value={draftDeadline}
                onChange={e => setDraftDeadline(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </label>

            <label className="block">
              <span className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Daily Goal</span>
              <input
                type="number"
                value={draftDailyGoal}
                onChange={e => setDraftDailyGoal(Number(e.target.value))}
                className="mt-1 w-full px-2 py-1.5 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setIsEditingGoal(false)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                <X size={12} /> Cancel
              </button>
              <button
                onClick={() => {
                  if (currentProject) {
                    updateProject(currentProject.id, {
                      wordCountGoal: draftGoal,
                      goalDeadline: draftDeadline || undefined,
                      dailyGoal: draftDailyGoal || undefined,
                    } as any);
                  }
                  setIsEditingGoal(false);
                }}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium bg-[var(--color-accent)] text-white hover:opacity-90 transition-colors"
              >
                <Check size={12} /> Save
              </button>
            </div>
          </div>
        )}
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

      {/* Filter Words â Chapter Scoped */}
      {overused.length > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
                Filter Words {chapterTitle ? `\u2014 ${chapterTitle}` : ''}
              </p>
              <InfoTip
                title="Filter Words"
                text='Words that distance the reader from the action — "felt", "looked", "seemed", "realized", "just", "very". Shows counts from this chapter. Click a badge to jump to the word in the editor; "Why these?" asks the AI to show concrete rewrites.'
              />
            </div>
            <button
              onClick={runFilterAnalysis}
              disabled={filterLoading}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                filterLoading
                  ? 'bg-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
                  : 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-300 dark:hover:bg-amber-800 border border-amber-400 dark:border-amber-700'
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
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 border border-amber-400 dark:border-amber-700 hover:bg-amber-300 dark:hover:bg-amber-800 transition-colors cursor-pointer"
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
