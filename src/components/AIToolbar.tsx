'use client';

import { useState, useCallback } from 'react';
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

  // Accept suggestion — replace selected text in editor
  const handleAccept = useCallback(() => {
    if (!editor || !response || !('suggestedText' in response)) return;

    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContent(response.suggestedText).run();
    setResponse(null);
  }, [editor, response]);

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

      {/* Response: Diff View */}
      {response && 'suggestedText' in response && (
        <div className="mx-4 mb-3 rounded-lg border border-[var(--color-border)] overflow-hidden">
          <div className="p-3 space-y-2.5">
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase mb-1">Original</p>
              <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-[var(--color-text-secondary)] line-through leading-relaxed">
                {response.originalText}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase mb-1">Suggested</p>
              <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-xs text-[var(--color-text-primary)] font-medium leading-relaxed">
                {response.suggestedText}
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition-colors"
            >
              <Check size={14} />
              Accept
            </button>
            <button
              onClick={() => setResponse(null)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] rounded-md text-xs font-medium transition-colors"
            >
              <X size={14} />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Response: Feedback View (Dialogue Coach) */}
      {response && 'feedback' in response && (
        <div className="mx-4 mb-3 rounded-lg border border-[var(--color-border)] overflow-hidden">
          <div className="p-3">
            <p className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase mb-2">Dialogue Coach Feedback</p>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
              {response.feedback}
            </div>
          </div>
          <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
            <button
              onClick={() => setResponse(null)}
              className="w-full px-3 py-2 bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-secondary)] rounded-md text-xs font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIToolbar;
