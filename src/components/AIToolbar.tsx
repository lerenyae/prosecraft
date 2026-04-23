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
  ChevronDown,
} from 'lucide-react';
import { useStore } from '@/lib/store';

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
}

interface FeedbackResponse {
  feedback: string;
  action: 'dialogue-coach';
}

type APIResponse = DiffResponse | FeedbackResponse;

interface RawAPIResponse {
  result: string | Record<string, unknown>;
  action: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDialogueFeedback(result: Record<string, unknown>): string {
  const lines: string[] = [];
  const vc = result.voiceConsistency as Record<string, unknown> | undefined;
  const nat = result.naturalism as Record<string, unknown> | undefined;
  const sub = result.subtext as Record<string, unknown> | undefined;
  const info = result.infoDumping as Record<string, unknown> | undefined;

  if (vc) {
    lines.push(`Voice Consistency: ${vc.consistent ? 'Consistent' : 'Inconsistent'}`);
    if (Array.isArray(vc.issues) && vc.issues.length) lines.push(`  Issues: ${vc.issues.join(', ')}`);
  }
  if (nat) {
    lines.push(`Naturalism: ${nat.rating}/5 — ${nat.notes}`);
  }
  if (sub) {
    lines.push(`Subtext: ${sub.present ? 'Present' : 'Missing'}`);
    if (Array.isArray(sub.examples) && sub.examples.length) lines.push(`  Examples: ${sub.examples.join(', ')}`);
  }
  if (info) {
    lines.push(`Info-Dumping: ${info.detected ? 'Detected' : 'Not detected'}`);
    if (Array.isArray(info.issues) && info.issues.length) lines.push(`  Issues: ${info.issues.join(', ')}`);
  }
  if (result.overallNotes) lines.push(`\n${result.overallNotes}`);
  return lines.join('\n');
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
  { icon: Eye, label: 'Show Don\'t Tell', action: 'show-dont-tell', description: 'Convert telling to showing' },
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
// Floating Overlay Component (portaled to body, positioned near selection)
// ============================================================================

interface FloatingOverlayProps {
  response: APIResponse;
  editor: TipTapEditor;
  onAccept: () => void;
  onReject: () => void;
}

function FloatingOverlay({ response, editor, onAccept, onReject }: FloatingOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Position the overlay near the selection
  useEffect(() => {
    const editorEl = editor.view.dom.closest('.mx-auto') as HTMLElement | null;
    if (!editorEl) {
      setPosition({ top: 200, left: window.innerWidth / 2 - 320, width: 640 });
      return;
    }

    const containerRect = editorEl.getBoundingClientRect();

    try {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const endCoords = editor.view.coordsAtPos(to);
        // Place below the selection end, aligned to the editor column
        const top = endCoords.bottom + 12;
        setPosition({
          top: Math.min(top, window.innerHeight - 400),
          left: containerRect.left,
          width: containerRect.width,
        });
        return;
      }
    } catch {
      // Fall through to fallback
    }

    // Fallback: center on editor column, partway down viewport
    setPosition({
      top: containerRect.top + 120,
      left: containerRect.left,
      width: containerRect.width,
    });
  }, [editor]);

  // Escape key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onReject();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReject]);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onReject();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 200);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onReject]);

  if (!position) return null;

  const isDiff = 'suggestedText' in response;
  const isFeedback = 'feedback' in response;

  const overlay = (
    <div
      ref={overlayRef}
      className="fixed z-[9999]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/10 -z-10" />

      <div
        className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl overflow-hidden"
        style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.06)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
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

        {/* Diff View — manuscript formatted */}
        {isDiff && (
          <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto">
            {/* Original */}
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

            {/* Suggested */}
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

        {/* Feedback View */}
        {isFeedback && (
          <div className="p-5 max-h-[50vh] overflow-y-auto">
            <p className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-2">Feedback</p>
            <div className="px-5 py-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/40 dark:border-blue-900/30 text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-[1.8]">
              {(response as FeedbackResponse).feedback}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
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

  // Portal to body so it's not clipped by any parent overflow
  if (typeof document !== 'undefined') {
    return createPortal(overlay, document.body);
  }
  return null;
}

// ============================================================================
// AI Panel Component (lives in right sidebar)
// ============================================================================

export function AIToolbar({ editor, selectedText }: AIToolbarProps) {
  const { currentProject } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToneMenu, setShowToneMenu] = useState(false);

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
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const raw: RawAPIResponse = await res.json();

      let data: APIResponse;
      if (action === 'dialogue-coach') {
        const feedbackText = typeof raw.result === 'string'
          ? raw.result
          : (raw.result as Record<string, unknown>).overallNotes
            ? formatDialogueFeedback(raw.result as Record<string, unknown>)
            : JSON.stringify(raw.result, null, 2);
        data = { feedback: feedbackText, action: 'dialogue-coach' };
      } else {
        data = {
          originalText: selectedText,
          suggestedText: typeof raw.result === 'string' ? raw.result : String(raw.result),
          action,
        };
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [selectedText, currentProject, editor, getContext]);

  // Accept suggestion — replace selected text with proper paragraph formatting
  const handleAccept = useCallback(() => {
    if (!editor || !response || !('suggestedText' in response)) return;

    const { from, to } = editor.state.selection;
    // Convert plain text paragraph breaks into proper HTML paragraphs for TipTap
    const html = textToHTML(response.suggestedText);
    editor.chain().focus().deleteRange({ from, to }).insertContent(html).run();
    setResponse(null);
  }, [editor, response]);

  const handleReject = useCallback(() => {
    setResponse(null);
  }, []);

  const handleAction = useCallback((action: AIAction) => {
    if (action === 'change-tone') {
      setShowToneMenu(!showToneMenu);
    } else {
      callAIAPI(action);
    }
  }, [callAIAPI, showToneMenu]);

  const hasSelection = selectedText.length > 5;

  return (
    <div className="flex flex-col overflow-y-auto">
      {/* Selection Preview */}
      <div className="p-4 border-b border-[var(--color-border)]">
        {hasSelection ? (
          <div>
            <p className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide mb-2">Selected Text</p>
            <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] leading-relaxed max-h-24 overflow-y-auto">
              {selectedText.length > 300 ? selectedText.slice(0, 300) + '...' : selectedText}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Sparkles size={20} className="text-[var(--color-text-muted)] mx-auto mb-2" />
            <p className="text-xs text-[var(--color-text-muted)]">
              Highlight text in the editor to use AI tools
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 flex flex-col gap-1">
        {ACTION_BUTTONS.map((btn) => {
          const Icon = btn.icon;
          const isTone = btn.action === 'change-tone';

          return (
            <div key={btn.action}>
              <button
                onClick={() => handleAction(btn.action)}
                disabled={!hasSelection || isLoading}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                  hasSelection && !isLoading
                    ? 'hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)] opacity-50 cursor-not-allowed'
                }`}
              >
                <Icon size={15} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{btn.label}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">{btn.description}</p>
                </div>
                {isTone && hasSelection && <ChevronDown size={12} className={`flex-shrink-0 transition-transform ${showToneMenu ? 'rotate-180' : ''}`} />}
              </button>

              {/* Tone submenu */}
              {isTone && showToneMenu && (
                <div className="ml-8 mt-1 mb-1 flex flex-wrap gap-1.5">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => callAIAPI('change-tone', tone.value)}
                      disabled={!hasSelection || isLoading}
                      className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:border-[var(--color-accent)] transition-colors"
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

      {/* Loading State */}
      {isLoading && (
        <div className="px-4 py-6 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-[var(--color-accent)]" />
          <span className="text-xs text-[var(--color-text-muted)]">Processing...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mx-4 mb-3 p-3 rounded-lg bg-red-100 dark:bg-red-950/30 border border-red-300 dark:border-red-800">
          <p className="text-xs text-red-800 dark:text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-1 text-[10px] text-red-600 dark:text-red-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Floating Overlay — portaled to body so it's not clipped */}
      {response && editor && (
        <FloatingOverlay
          response={response}
          editor={editor}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

export default AIToolbar;
