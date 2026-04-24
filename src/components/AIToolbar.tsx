'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Editor as TipTapEditor } from '@tiptap/react';
import {
  Sparkles,
  Eye,
  Scissors,
  Maximize2,
  Palette,
  CheckCircle,
  MessageSquare,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { getWriterProfile, getStyleProfile, getWritingRules } from '@/lib/personalization';

// ============================================================================
// Types
// ============================================================================

type AIAction =
  | 'improve'
  | 'show-dont-tell'
  | 'tighten'
  | 'expand'
  | 'change-tone'
  | 'fix-grammar'
  | 'dialogue-coach';

type ToneOption = 'formal' | 'casual' | 'dark' | 'lyrical' | 'humorous';

interface AIToolbarProps {
  editor: TipTapEditor | null;
  selectedText: string;
}

interface DiffResponse {
  originalText: string;
  suggestedText: string;
  action: AIAction;
  changeSummary?: string[];
}

interface DialogueDimension {
  rating?: number;
  notes: string;
  examples?: string[];
  detected?: boolean;
}

interface DialogueCoachResult {
  hasDialogue: boolean;
  dialogueSummary?: string;
  voiceConsistency: DialogueDimension;
  naturalism: DialogueDimension;
  subtext: DialogueDimension;
  infoDumping: DialogueDimension;
  beats: DialogueDimension;
  topSuggestion: string;
}

interface FeedbackResponse {
  feedback: string | DialogueCoachResult;
  action: 'dialogue-coach';
}

type APIResponse = DiffResponse | FeedbackResponse;

interface RawAPIResponse {
  result: string | Record<string, unknown>;
  action: string;
  changeSummary?: string[];
}

/** Convert plain text with \n\n paragraph breaks into TipTap-compatible HTML */
function textToHTML(text: string): string {
  return text
    .split(/\n\n+/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// ============================================================================
// Action Buttons Config
// ============================================================================

const ACTION_BUTTONS: { icon: typeof Sparkles; label: string; action: AIAction; description: string }[] = [
  { icon: Sparkles, label: 'Improve Prose', action: 'improve', description: 'Elevate the writing quality' },
  { icon: Eye, label: "Show Don't Tell", action: 'show-dont-tell', description: 'Convert telling to showing' },
  { icon: Scissors, label: 'Tighten', action: 'tighten', description: 'Remove unnecessary words' },
  { icon: Maximize2, label: 'Expand', action: 'expand', description: 'Add detail and depth' },
  { icon: Palette, label: 'Change Tone', action: 'change-tone', description: 'Shift the emotional register' },
  { icon: CheckCircle, label: 'Fix Grammar', action: 'fix-grammar', description: 'Correct grammar issues' },
  { icon: MessageSquare, label: 'Dialogue Coach', action: 'dialogue-coach', description: 'Analyze dialogue quality' },
];

const TONE_OPTIONS: { label: string; value: ToneOption }[] = [
  { label: 'Formal', value: 'formal' },
  { label: 'Casual', value: 'casual' },
  { label: 'Dark', value: 'dark' },
  { label: 'Lyrical', value: 'lyrical' },
  { label: 'Humorous', value: 'humorous' },
];

// ============================================================================
// Dialogue Coach — structured view with ratings, quoted examples, top suggestion
// ============================================================================

function StarRating({ rating }: { rating?: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating ?? 0)));
  return (
    <span className="inline-flex items-center gap-0.5 ml-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= r ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] opacity-40'}
          style={{ fontSize: 11 }}
        >
          ●
        </span>
      ))}
      <span className="text-[10px] text-[var(--color-text-muted)] ml-1">{r}/5</span>
    </span>
  );
}

function DialogueCard({
  title,
  rating,
  notes,
  examples,
  flag,
}: {
  title: string;
  rating?: number;
  notes: string;
  examples?: string[];
  flag?: { label: string; tone: 'warn' | 'ok' };
}) {
  if (!notes && (!examples || examples.length === 0)) return null;
  return (
    <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">{title}</span>
          {typeof rating === 'number' && rating > 0 && <StarRating rating={rating} />}
        </div>
        {flag && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              flag.tone === 'warn'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                : 'bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-300'
            }`}
          >
            {flag.label}
          </span>
        )}
      </div>
      {notes && (
        <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{notes}</p>
      )}
      {examples && examples.length > 0 && (
        <div className="mt-2 space-y-1">
          {examples.map((ex, i) => (
            <div
              key={i}
              className="text-[12px] italic text-[var(--color-text-secondary)] pl-3 border-l-2 border-[var(--color-accent-light)]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {ex}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DialogueCoachView({ feedback }: { feedback: string | DialogueCoachResult }) {
  // If we got a plain string back (parse failed), render it in a simple block
  if (typeof feedback === 'string') {
    return (
      <div className="p-5">
        <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-2">Feedback</p>
        <div className="px-5 py-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-[1.8]">
          {feedback}
        </div>
      </div>
    );
  }

  // No dialogue detected — give the user clear guidance
  if (feedback.hasDialogue === false) {
    return (
      <div className="p-5">
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-1">
            No dialogue found
          </p>
          <p className="text-[13px] text-amber-900 dark:text-amber-200 leading-relaxed">
            {feedback.dialogueSummary || 'The selection does not appear to contain dialogue. Highlight a passage with quoted speech between characters and try again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-3">
      {/* Top suggestion — pinned at top as the single most actionable takeaway */}
      {feedback.topSuggestion && (
        <div className="p-4 rounded-lg bg-[var(--color-accent-light)]/30 border border-[var(--color-accent)]">
          <div className="flex items-start gap-2">
            <Sparkles size={14} className="text-[var(--color-accent)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-on)] mb-1">
                Top suggestion
              </p>
              <p className="text-[13px] text-[var(--color-text-primary)] leading-relaxed">
                {feedback.topSuggestion}
              </p>
            </div>
          </div>
        </div>
      )}

      <DialogueCard
        title="Voice Consistency"
        rating={feedback.voiceConsistency?.rating}
        notes={feedback.voiceConsistency?.notes ?? ''}
        examples={feedback.voiceConsistency?.examples}
      />
      <DialogueCard
        title="Naturalism"
        rating={feedback.naturalism?.rating}
        notes={feedback.naturalism?.notes ?? ''}
        examples={feedback.naturalism?.examples}
      />
      <DialogueCard
        title="Subtext"
        rating={feedback.subtext?.rating}
        notes={feedback.subtext?.notes ?? ''}
        examples={feedback.subtext?.examples}
      />
      <DialogueCard
        title="Info-Dumping"
        notes={feedback.infoDumping?.notes ?? ''}
        examples={feedback.infoDumping?.examples}
        flag={
          feedback.infoDumping?.detected
            ? { label: 'Detected', tone: 'warn' }
            : { label: 'Clean', tone: 'ok' }
        }
      />
      <DialogueCard
        title="Beats & Pacing"
        notes={feedback.beats?.notes ?? ''}
        examples={feedback.beats?.examples}
      />
    </div>
  );
}

// ============================================================================
// Centered Modal Overlay — fixed viewport, scrollable body, sticky footer
// ============================================================================

interface FloatingOverlayProps {
  response: APIResponse;
  editor: TipTapEditor;
  onAccept: () => void;
  onReject: () => void;
}

function FloatingOverlay({ response, editor: _editor, onAccept, onReject }: FloatingOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Escape key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onReject();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReject]);

  const isDiff = 'suggestedText' in response;
  const isFeedback = 'feedback' in response;

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onReject}
    >
      <div
        ref={overlayRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl flex flex-col overflow-hidden"
        style={{
          maxHeight: '85vh',
          boxShadow: '0 25px 60px -12px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header (sticky by virtue of flex) */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--color-accent)]" />
            <span className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
              {isDiff ? 'AI Suggestion' : 'Dialogue Coach'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--color-text-muted)] mr-2">Esc to dismiss</span>
            <button
              onClick={onReject}
              className="p-1 rounded-md hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] transition-colors"
              title="Dismiss (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Diff View — manuscript formatted */}
          {isDiff && (
            <div className="p-5 space-y-4">
              {/* Change summary — high-level recap of what's being flagged */}
              {(response as DiffResponse).changeSummary && (response as DiffResponse).changeSummary!.length > 0 && (
                <div className="p-4 rounded-lg bg-[var(--color-accent-light)]/20 border border-[var(--color-accent)]/40">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={12} className="text-[var(--color-accent)]" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
                      What's changing ({(response as DiffResponse).changeSummary!.length})
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {(response as DiffResponse).changeSummary!.map((bullet, i) => (
                      <li key={i} className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed flex gap-2">
                        <span className="text-[var(--color-accent)] flex-shrink-0">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-2">Original</p>
                <div
                  className="px-5 py-4 rounded-lg bg-red-50/50 dark:bg-red-950/10 border border-red-200/40 dark:border-red-900/30"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {(response as DiffResponse).originalText.split(/\n\n+/).map((para, i) => (
                    <p
                      key={i}
                      className="text-sm leading-[1.9] text-[var(--color-text-secondary)]"
                      style={{
                        marginTop: i > 0 ? '1em' : 0,
                        textIndent: i > 0 ? '2em' : 0,
                        textDecoration: 'line-through',
                        textDecorationColor: 'rgba(239,68,68,0.35)',
                      }}
                    >
                      {para.split(/\n/).map((line, j) => (
                        <span key={j}>
                          {j > 0 && <br />}
                          {line}
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-2">Suggested</p>
                <div
                  className="px-5 py-4 rounded-lg bg-green-50/50 dark:bg-green-950/10 border border-green-200/40 dark:border-green-900/30"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {(response as DiffResponse).suggestedText.split(/\n\n+/).map((para, i) => (
                    <p
                      key={i}
                      className="text-sm leading-[1.9] text-[var(--color-text-primary)]"
                      style={{
                        marginTop: i > 0 ? '1em' : 0,
                        textIndent: i > 0 ? '2em' : 0,
                      }}
                    >
                      {para.split(/\n/).map((line, j) => (
                        <span key={j}>
                          {j > 0 && <br />}
                          {line}
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Feedback View — structured Dialogue Coach */}
          {isFeedback && <DialogueCoachView feedback={(response as FeedbackResponse).feedback} />}
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 flex gap-3 px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          {isDiff && (
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Check size={16} />
              Accept Changes
            </button>
          )}
          <button
            onClick={onReject}
            className={`${isDiff ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm font-medium transition-colors`}
          >
            <X size={16} />
            {isDiff ? 'Reject' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(overlay, document.body);
  }
  return null;
}

// ============================================================================
// Vertical Side Rail — icon-only buttons on the right edge of the editor
// ============================================================================

export function AIToolbar({ editor, selectedText }: AIToolbarProps) {
  const { currentProject } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);

  // Get surrounding context from editor
  const getContext = useCallback((): string => {
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    const fullText = editor.state.doc.textContent;
    const contextBefore = Math.max(0, from - 500);
    const contextAfter = Math.min(fullText.length, to + 500);
    return fullText.substring(contextBefore, from) + selectedText + fullText.substring(to, contextAfter);
  }, [editor, selectedText]);

  // Call AI API
  const callAIAPI = useCallback(async (action: AIAction, toneTarget?: ToneOption) => {
    if (!selectedText || !currentProject || !editor) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setShowToneMenu(false);
    setActiveAction(action);

    try {
      const res = await fetch('/api/ai/inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          selectedText,
          context: getContext(),
          genre: currentProject.genre,
          toneTarget,
          writerProfile: getWriterProfile(),
          styleProfile: getStyleProfile(currentProject.id),
          writingRules: getWritingRules(currentProject.id),
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const raw: RawAPIResponse = await res.json();

      let data: APIResponse;
      if (action === 'dialogue-coach') {
        // Keep the structured object if it parsed as one; fall back to raw string
        const feedback = typeof raw.result === 'object'
          ? (raw.result as unknown as DialogueCoachResult)
          : (raw.result as string);
        data = { feedback, action: 'dialogue-coach' };
      } else {
        data = {
          originalText: selectedText,
          suggestedText: typeof raw.result === 'string' ? raw.result : String(raw.result),
          action,
          changeSummary: raw.changeSummary,
        };
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  }, [selectedText, currentProject, editor, getContext]);

  const handleAccept = useCallback(() => {
    if (!editor || !response || !('suggestedText' in response)) return;
    const { from, to } = editor.state.selection;
    const html = textToHTML(response.suggestedText);
    editor.chain().focus().deleteRange({ from, to }).insertContent(html).run();
    setResponse(null);
  }, [editor, response]);

  const handleReject = useCallback(() => {
    setResponse(null);
  }, []);

  const handleAction = useCallback((action: AIAction) => {
    if (action === 'change-tone') {
      setShowToneMenu((prev) => !prev);
    } else {
      callAIAPI(action);
    }
  }, [callAIAPI]);

  const hasSelection = selectedText.length > 5;

  return (
    <>
      {/* Vertical icon rail on the right edge of the editor */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 p-1.5 rounded-xl bg-[var(--color-bg-primary)]/95 backdrop-blur-sm border border-[var(--color-border)] shadow-sm">
        {ACTION_BUTTONS.map((btn) => {
          const Icon = btn.icon;
          const isActiveSpinner = isLoading && activeAction === btn.action;
          const isTone = btn.action === 'change-tone';
          const disabled = !hasSelection || isLoading;

          return (
            <div key={btn.action} className="relative group">
              <button
                onClick={() => handleAction(btn.action)}
                disabled={disabled}
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                  disabled
                    ? 'text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'
                    : isTone && showToneMenu
                      ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)]'
                }`}
                title={btn.label}
                aria-label={btn.label}
              >
                {isActiveSpinner ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Icon size={16} />
                )}
              </button>

              {/* Tooltip on hover (shows to the left) */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[11px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-sm z-30">
                <div className="font-medium">{btn.label}</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">{btn.description}</div>
              </div>

              {/* Tone submenu (appears to the left when expanded) */}
              {isTone && showToneMenu && (
                <div className="absolute right-full top-0 mr-2 flex flex-col gap-1 p-1.5 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-sm z-30">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => callAIAPI('change-tone', tone.value)}
                      disabled={disabled}
                      className="px-3 py-1.5 rounded-md text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)] transition-colors whitespace-nowrap text-left"
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error toast (centered at top of editor) */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 shadow-sm max-w-md">
          <div className="flex items-center gap-2">
            <p className="text-xs text-red-800 dark:text-red-300 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-700"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Centered scrollable modal for AI suggestions */}
      {response && editor && (
        <FloatingOverlay
          response={response}
          editor={editor}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </>
  );
}

export default AIToolbar;
