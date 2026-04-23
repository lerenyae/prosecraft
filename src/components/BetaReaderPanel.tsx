'use client';

import { useState, useCallback } from 'react';
import {
  Brain,
  Loader2,
  RefreshCw,
  Eye,
  Zap,
  MessageCircle,
  Activity,
  BookOpen,
  Pen,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MousePointerClick,
  Target,
  Copy,
  Check,
} from 'lucide-react';
import { useStore } from '@/lib/store';

// ============================================================================
// Types
// ============================================================================

interface Annotation {
  id: string;
  type: 'show-dont-tell' | 'pacing' | 'dialogue' | 'pov' | 'tension' | 'prose' | 'structure';
  severity: 'praise' | 'suggestion' | 'warning';
  quote: string;
  note: string;
  suggestion?: string;
}

interface AnalysisResult {
  annotations: Annotation[];
  summary: {
    overall: string;
    strengths: string[];
    focus: string;
  };
}

interface BetaReaderPanelProps {
  selectedText?: string;
  onAnnotationClick?: (quote: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_CONFIG: Record<string, { icon: typeof Eye; label: string; color: string }> = {
  'show-dont-tell': { icon: Eye, label: 'Show vs Tell', color: 'text-purple-500' },
  pacing: { icon: Activity, label: 'Pacing', color: 'text-blue-500' },
  dialogue: { icon: MessageCircle, label: 'Dialogue', color: 'text-emerald-500' },
  pov: { icon: Layers, label: 'POV', color: 'text-orange-500' },
  tension: { icon: Zap, label: 'Tension', color: 'text-red-500' },
  prose: { icon: Pen, label: 'Prose', color: 'text-cyan-500' },
  structure: { icon: BookOpen, label: 'Structure', color: 'text-amber-500' },
};

const SEVERITY_CONFIG: Record<string, { icon: typeof CheckCircle2; bg: string; border: string }> = {
  praise: { icon: CheckCircle2, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  suggestion: { icon: Sparkles, bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};

// ============================================================================
// BetaReaderPanel
// ============================================================================

export default function BetaReaderPanel({ selectedText, onAnnotationClick }: BetaReaderPanelProps) {
  const { currentChapter, chapterScenes, currentProject } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSelectionLoading, setIsSelectionLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectionResult, setSelectionResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  const analyzeChapter = useCallback(async () => {
    if (!currentChapter || !currentProject) {
      setError('Select a chapter first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectionResult(null);

    try {
      const scenes = chapterScenes(currentChapter.id);
      const content = scenes.map(s => s.content).join('\n\n');

      if (!content.trim()) {
        setError('Chapter is empty — write something first');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chapter',
          chapterTitle: currentChapter.title,
          chapterContent: content,
          genre: currentProject.genre,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

      // Auto-expand all types
      const types: Record<string, boolean> = {};
      (data.annotations || []).forEach((a: Annotation) => { types[a.type] = true; });
      setExpandedTypes(types);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  }, [currentChapter, currentProject, chapterScenes]);

  const analyzeSelection = useCallback(async () => {
    if (!selectedText || !currentProject) return;

    setIsSelectionLoading(true);
    setSelectionResult(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'selection',
          selectedText,
          genre: currentProject.genre,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      setSelectionResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsSelectionLoading(false);
    }
  }, [selectedText, currentProject]);

  const toggleType = (type: string) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Group annotations by type
  const grouped = (result?.annotations || []).reduce<Record<string, Annotation[]>>((acc, ann) => {
    if (!acc[ann.type]) acc[ann.type] = [];
    acc[ann.type].push(ann);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Selection Feedback Bar */}
      {selectedText && selectedText.length > 3 && (
        <div className="flex-shrink-0 p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick size={14} className="text-[var(--color-accent)]" />
            <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
              Selected Text
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-2 italic">
            &ldquo;{selectedText.slice(0, 120)}{selectedText.length > 120 ? '...' : ''}&rdquo;
          </p>
          <button
            onClick={analyzeSelection}
            disabled={isSelectionLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-dark)] transition-colors disabled:opacity-50"
          >
            {isSelectionLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain size={14} />
                Get Feedback on Selection
              </>
            )}
          </button>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
      {/* Selection Result */}
      {selectionResult && (
        <div className="p-3 border-b border-[var(--color-border)] bg-blue-500/5">
          <p className="text-xs font-medium text-[var(--color-text-primary)] mb-2">Selection Feedback</p>
          <p className="text-xs text-[var(--color-text-secondary)] mb-3 leading-relaxed">
            {selectionResult.summary.overall}
          </p>
          {selectionResult.annotations.map(ann => (
            <AnnotationCard key={ann.id} annotation={ann} onQuoteClick={onAnnotationClick} />
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="p-4">
        {/* Empty State */}
        {!result && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mb-4">
              <Brain size={24} className="text-[var(--color-accent)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Beta Reader</p>
            <p className="text-xs text-[var(--color-text-muted)] mb-5 max-w-[200px] leading-relaxed">
              Get editorial feedback on your chapter like having a sharp reader looking over your shoulder.
            </p>
            <button
              onClick={analyzeChapter}
              disabled={!currentChapter}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Brain size={16} />
              Analyze Chapter
            </button>
            {!currentChapter && (
              <p className="text-[10px] text-[var(--color-text-muted)] mt-2">Select a chapter first</p>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 size={28} className="animate-spin text-[var(--color-accent)] mb-3" />
            <p className="text-sm text-[var(--color-text-secondary)]">Reading your chapter...</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">This takes 10-20 seconds</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              onClick={analyzeChapter}
              className="text-xs text-[var(--color-accent)] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {result && !isLoading && (
          <div className="flex flex-col gap-4">
            {/* Summary */}
            <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-3">
                {result.summary.overall}
              </p>
              <div className="flex flex-col gap-1.5 mb-3">
                {result.summary.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-[var(--color-text-secondary)]">{s}</span>
                  </div>
                ))}
              </div>
              <div className="p-2 rounded-md bg-amber-500/8 border border-amber-500/15">
                <div className="flex items-start gap-2">
                  <Target size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wide mb-0.5">Focus Area</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{result.summary.focus}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Annotations by type */}
            {Object.entries(grouped).map(([type, annotations]) => {
              const config = TYPE_CONFIG[type] || TYPE_CONFIG.prose;
              const Icon = config.icon;
              const isExpanded = expandedTypes[type] !== false;

              return (
                <div key={type} className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
                  <button
                    onClick={() => toggleType(type)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--color-surface-alt)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={config.color} />
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">{config.label}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] px-1.5 py-0.5 rounded-full">
                        {annotations.length}
                      </span>
                    </div>
                    {isExpanded
                      ? <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
                      : <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
                    }
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 flex flex-col gap-2">
                      {annotations.map(ann => (
                        <AnnotationCard key={ann.id} annotation={ann} onQuoteClick={onAnnotationClick} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Refresh */}
            <button
              onClick={analyzeChapter}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors"
            >
              <RefreshCw size={12} />
              Re-analyze Chapter
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ============================================================================
// Annotation Card
// ============================================================================

function AnnotationCard({
  annotation,
  onQuoteClick,
}: {
  annotation: Annotation;
  onQuoteClick?: (quote: string) => void;
}) {
  const severity = SEVERITY_CONFIG[annotation.severity] || SEVERITY_CONFIG.suggestion;
  const SeverityIcon = severity.icon;
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    // Save current selection before clipboard write clears it
    const sel = window.getSelection();
    const savedRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);

      // Restore selection so the writer knows where to paste
      if (savedRange && sel) {
        requestAnimationFrame(() => {
          sel.removeAllRanges();
          sel.addRange(savedRange);
        });
      }
    });
  };

  return (
    <div
      className={`p-2.5 rounded-md border ${severity.bg} ${severity.border} cursor-pointer hover:opacity-90 transition-opacity`}
      onClick={() => onQuoteClick?.(annotation.quote)}
    >
      <div className="flex items-start gap-2">
        <SeverityIcon size={12} className="mt-0.5 flex-shrink-0 opacity-60" />
        <div className="flex-1 min-w-0">
          {annotation.quote && (
            <p className="text-[11px] text-[var(--color-text-muted)] italic mb-1 line-clamp-2">
              &ldquo;{annotation.quote}&rdquo;
            </p>
          )}
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {annotation.note}
          </p>
          {/* Suggestion with copy button */}
          {annotation.suggestion && (
            <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-[var(--color-bg-primary)]/50 border border-[var(--color-border)]">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide mb-0.5">Consider</p>
                <p className="text-xs text-[var(--color-text-primary)] leading-relaxed">{annotation.suggestion}</p>
              </div>
              <button
                onClick={(e) => handleCopy(e, annotation.suggestion!)}
                className="flex-shrink-0 p-1 rounded hover:bg-[var(--color-surface-alt)] transition-colors"
                title="Copy suggestion"
              >
                {copied ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} className="text-[var(--color-text-muted)]" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
