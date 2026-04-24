'use client';

import { useEffect, useState, useCallback } from 'react';
import { Editor as TipTapEditor } from '@tiptap/react';
import { GitPullRequest, Check, X, ChevronUp, ChevronDown, CheckCheck } from 'lucide-react';
import {
  collectPendingChanges,
  acceptChange,
  rejectChange,
  acceptAllChanges,
  rejectAllChanges,
  PendingChange,
} from '@/lib/track-changes';

interface PendingChangesBarProps {
  editor: TipTapEditor | null;
}

export default function PendingChangesBar({ editor }: PendingChangesBarProps) {
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // Re-scan whenever the doc mutates — TipTap emits 'update' on every transaction.
  useEffect(() => {
    if (!editor) return;
    const refresh = () => {
      const next = collectPendingChanges(editor);
      setChanges(next);
      // Clamp active index if we just accepted/rejected past the end
      setActiveIdx((prev) => Math.min(prev, Math.max(0, next.length - 1)));
    };
    refresh();
    editor.on('update', refresh);
    editor.on('selectionUpdate', refresh);
    return () => {
      editor.off('update', refresh);
      editor.off('selectionUpdate', refresh);
    };
  }, [editor]);

  const scrollTo = useCallback((change: PendingChange) => {
    if (!editor) return;
    const pos = change.deleteFrom !== -1 ? change.deleteFrom : change.insertFrom;
    if (pos < 0) return;
    try {
      const domAtPos = editor.view.domAtPos(pos);
      const el = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      // position stale between scan and scroll — ignore
    }
  }, [editor]);

  const goNext = useCallback(() => {
    if (changes.length === 0) return;
    const next = (activeIdx + 1) % changes.length;
    setActiveIdx(next);
    scrollTo(changes[next]);
  }, [activeIdx, changes, scrollTo]);

  const goPrev = useCallback(() => {
    if (changes.length === 0) return;
    const prev = (activeIdx - 1 + changes.length) % changes.length;
    setActiveIdx(prev);
    scrollTo(changes[prev]);
  }, [activeIdx, changes, scrollTo]);

  const handleAccept = useCallback(() => {
    if (!editor || changes.length === 0) return;
    const target = changes[activeIdx];
    acceptChange(editor, target.changeId);
  }, [editor, changes, activeIdx]);

  const handleReject = useCallback(() => {
    if (!editor || changes.length === 0) return;
    const target = changes[activeIdx];
    rejectChange(editor, target.changeId);
  }, [editor, changes, activeIdx]);

  const handleAcceptAll = useCallback(() => {
    if (!editor) return;
    acceptAllChanges(editor);
  }, [editor]);

  const handleRejectAll = useCallback(() => {
    if (!editor) return;
    rejectAllChanges(editor);
  }, [editor]);

  // Keyboard: Cmd/Ctrl + Shift + Y = accept, Cmd/Ctrl + Shift + N = reject
  useEffect(() => {
    if (!editor || changes.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || !e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 'y') {
        e.preventDefault();
        handleAccept();
      } else if (k === 'n') {
        e.preventDefault();
        handleReject();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, changes, handleAccept, handleReject]);

  if (changes.length === 0) return null;

  const active = changes[Math.min(activeIdx, changes.length - 1)];
  const label = active?.source || 'AI edit';

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[var(--color-border)] bg-amber-500/10 flex-shrink-0">
      <GitPullRequest size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="text-xs font-medium text-[var(--color-text-primary)]">
        {changes.length} pending {changes.length === 1 ? 'change' : 'changes'}
      </span>
      <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[220px]" title={label}>
        &middot; {label}
      </span>

      <div className="flex items-center gap-0.5 ml-auto">
        <button
          onClick={goPrev}
          className="p-1 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"
          title="Previous change"
        >
          <ChevronUp size={14} />
        </button>
        <span className="text-[11px] text-[var(--color-text-muted)] px-1">
          {activeIdx + 1}/{changes.length}
        </span>
        <button
          onClick={goNext}
          className="p-1 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"
          title="Next change"
        >
          <ChevronDown size={14} />
        </button>

        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />

        <button
          onClick={handleReject}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded text-red-600 dark:text-red-400 hover:bg-red-500/10"
          title="Reject this change (Cmd/Ctrl+Shift+N)"
        >
          <X size={12} />
          Reject
        </button>
        <button
          onClick={handleAccept}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          title="Accept this change (Cmd/Ctrl+Shift+Y)"
        >
          <Check size={12} />
          Accept
        </button>

        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />

        <button
          onClick={handleRejectAll}
          className="text-xs px-1.5 py-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"
          title="Reject all"
        >
          Reject all
        </button>
        <button
          onClick={handleAcceptAll}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-[var(--color-accent-on)] hover:opacity-90"
          title="Accept all"
        >
          <CheckCheck size={12} />
          Accept all
        </button>
      </div>
    </div>
  );
}
