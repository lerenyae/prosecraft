'use client';

import { useEffect, useRef, useState } from 'react';
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

// ============================================================================
// Types
// ============================================================================

type AIAction =
  | 'improve-prose'
  | 'show-dont-tell'
  | 'tighten'
  | 'expand'
  | 'change-tone'
  | 'fix-grammar'
  | 'dialogue-coach';

type ToneOption = 'formal' | 'casual' | 'dark' | 'lyrical' | 'humorous';

interface AIToolbarProps {
  editor: TipTapEditor | null;
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

// ============================================================================
// Toolbar Component
// ============================================================================

export function AIToolbar({ editor }: AIToolbarProps) {
  const { currentProject } = useStore();

  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<APIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeToneMenu, setActiveToneMenu] = useState(false);
  const [_selectedTone, setSelectedTone] = useState<ToneOption | null>(null);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Get editor container reference
  useEffect(() => {
    if (editor) {
      const editorElement = document.querySelector('.ProseMirror');
      if (editorElement) {
        editorRef.current = editorElement as HTMLDivElement;
      }
    }
  }, [editor]);

  // Handle selection updates
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;

      if (from === to) {
        // No selection, just cursor
        setIsVisible(false);
        setSelectedText('');
        return;
      }

      const text = editor.state.doc.textBetween(from, to);

      if (!text.trim()) {
        // Selection is empty or whitespace only
        setIsVisible(false);
        setSelectedText('');
        return;
      }

      setSelectedText(text);
      setResponse(null);
      setError(null);
      setActiveToneMenu(false);

      // Get position using TipTap's coordsAtPos
      const coords = editor.view.coordsAtPos(to);

      if (editorRef.current) {
        const editorRect = editorRef.current.getBoundingClientRect();
        const scrollParent = editorRef.current.parentElement;
        const scrollOffset = scrollParent?.scrollTop || 0;

        setPosition({
          top: coords.top - editorRect.top + scrollOffset + 8,
          left: coords.left - editorRect.left,
        });
      } else {
        setPosition({
          top: coords.top + 8,
          left: coords.left,
        });
      }

      setIsVisible(true);
    };

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor]);

  // Dismiss toolbar on click elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible]);

  // Get surrounding context
  const getContext = (text: string): string => {
    if (!editor) return '';

    const { from, to } = editor.state.selection;
    const fullText = editor.state.doc.textContent;

    const contextBefore = Math.max(0, from - 500);
    const contextAfter = Math.min(fullText.length, to + 500);

    const before = fullText.substring(contextBefore, from);
    const after = fullText.substring(to, contextAfter);

    return before + text + after;
  };

  // Call AI API
  const callAIAPI = async (action: AIAction, toneTarget?: ToneOption) => {
    if (!selectedText || !currentProject) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/inline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          selectedText,
          context: getContext(selectedText),
          genre: currentProject.genre,
          toneTarget,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: APIResponse = await response.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setTimeout(() => {
        setError(null);
        setIsVisible(false);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle action button clicks
  const handleAction = (action: AIAction, tone?: ToneOption) => {
    if (action === 'change-tone') {
      if (!activeToneMenu) {
        setActiveToneMenu(true);
      } else if (tone) {
        setSelectedTone(tone);
        callAIAPI(action, tone);
      }
    } else {
      callAIAPI(action);
    }
  };

  // Accept suggestion
  const handleAccept = () => {
    if (!editor || !response || !('suggestedText' in response)) return;

    const { from, to } = editor.state.selection;
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent(response.suggestedText)
      .run();

    setIsVisible(false);
    setResponse(null);
  };

  // Reject suggestion
  const handleReject = () => {
    setResponse(null);
  };

  if (!isVisible || !editor) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        ref={toolbarRef}
        className="fixed z-50 bg-slate-800 rounded-lg shadow-lg p-4 flex items-center gap-3"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <Loader2 className="animate-spin text-slate-200" size={20} />
        <span className="text-sm text-slate-200">Processing...</span>
      </div>
    );
  }

  // Diff/Feedback view state
  if (response) {
    if ('suggestedText' in response) {
      // Text diff view
      return (
        <div
          ref={toolbarRef}
          className="fixed z-50 bg-white dark:bg-slate-900 rounded-lg shadow-lg overflow-hidden"
          style={{
            top: `${position.top + 40}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)',
            minWidth: '300px',
            maxWidth: '500px',
          }}
        >
          {/* Diff content */}
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">
                Original
              </p>
              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded text-sm text-slate-700 dark:text-slate-300 line-through">
                {response.originalText}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">
                Suggested
              </p>
              <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded text-sm text-slate-700 dark:text-slate-300 font-semibold">
                {response.suggestedText}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
            >
              <Check size={16} />
              Accept
            </button>
            <button
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-50 rounded text-sm font-medium transition-colors"
            >
              <X size={16} />
              Reject
            </button>
          </div>
        </div>
      );
    } else {
      // Feedback view for dialogue-coach
      return (
        <div
          ref={toolbarRef}
          className="fixed z-50 bg-white dark:bg-slate-900 rounded-lg shadow-lg overflow-hidden"
          style={{
            top: `${position.top + 40}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)',
            minWidth: '300px',
            maxWidth: '500px',
          }}
        >
          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">
              Dialogue Coach Feedback
            </p>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {response.feedback}
            </div>
          </div>

          <div className="flex px-4 pb-4">
            <button
              onClick={() => setResponse(null)}
              className="flex-1 px-3 py-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-50 rounded text-sm font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }
  }

  // Error state
  if (error) {
    return (
      <div
        ref={toolbarRef}
        className="fixed z-50 bg-red-100 dark:bg-red-950/30 rounded-lg shadow-lg p-3"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
      </div>
    );
  }

  // Normal toolbar state
  const toneOptions: { label: string; value: ToneOption }[] = [
    { label: 'Formal', value: 'formal' },
    { label: 'Casual', value: 'casual' },
    { label: 'Dark', value: 'dark' },
    { label: 'Lyrical', value: 'lyrical' },
    { label: 'Humorous', value: 'humorous' },
  ];

  const actionButtons = [
    {
      icon: Sparkles,
      label: 'Improve Prose',
      action: 'improve-prose' as AIAction,
    },
    { icon: Eye, label: 'Show Don\'t Tell', action: 'show-dont-tell' as AIAction },
    { icon: Scissors, label: 'Tighten', action: 'tighten' as AIAction },
    { icon: Maximize2, label: 'Expand', action: 'expand' as AIAction },
    { icon: Palette, label: 'Change Tone', action: 'change-tone' as AIAction },
    { icon: CheckCircle, label: 'Fix Grammar', action: 'fix-grammar' as AIAction },
    {
      icon: MessageSquare,
      label: 'Dialogue Coach',
      action: 'dialogue-coach' as AIAction,
    },
  ];

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 bg-slate-800 rounded-lg shadow-lg p-2 flex items-center gap-1"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {/* AI action buttons */}
      {actionButtons.map((btn) => (
        <div key={btn.action} className="relative">
          <button
            onClick={() => handleAction(btn.action)}
            className="p-2 rounded hover:bg-slate-700 transition-colors text-slate-200 hover:text-slate-50 relative group"
            title={btn.label}
            type="button"
          >
            <btn.icon size={18} />

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-slate-50 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {btn.label}
            </div>
          </button>

          {/* Tone submenu */}
          {btn.action === 'change-tone' && activeToneMenu && (
            <div className="absolute top-full left-0 mt-2 bg-slate-900 rounded-lg shadow-xl border border-slate-700 p-1 z-50">
              {toneOptions.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => handleAction('change-tone', tone.value)}
                  className="block w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded transition-colors"
                  type="button"
                >
                  {tone.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Close button */}
      <button
        onClick={() => {
          setIsVisible(false);
          setActiveToneMenu(false);
        }}
        className="p-2 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200 ml-1"
        title="Close"
        type="button"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export default AIToolbar;
