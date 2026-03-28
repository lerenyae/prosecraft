'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Replace, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Editor as TipTapEditor } from '@tiptap/react';

interface SearchReplaceProps {
  editor: TipTapEditor | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchReplace({ editor, isOpen, onClose }: SearchReplaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matches, setMatches] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  // Find all matches
  const findMatches = useCallback(() => {
    if (!editor || !searchTerm) {
      setMatches([]);
      setCurrentMatch(-1);
      return;
    }

    const text = editor.getText();
    const term = searchTerm.toLowerCase();
    const found: number[] = [];
    let pos = 0;

    while (pos < text.length) {
      const idx = text.toLowerCase().indexOf(term, pos);
      if (idx === -1) break;
      found.push(idx);
      pos = idx + 1;
    }

    setMatches(found);
    setCurrentMatch(found.length > 0 ? 0 : -1);

    // Highlight first match
    if (found.length > 0) {
      highlightMatch(found[0], searchTerm.length);
    }
  }, [editor, searchTerm]);

  // Trigger search on term change
  useEffect(() => {
    const timer = setTimeout(findMatches, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, findMatches]);

  const highlightMatch = (textPos: number, length: number) => {
    if (!editor) return;

    // Simple approach: use the text offset directly with +1 for doc node
    // TipTap getText returns flat text, positions offset by 1
    try {
      const from = textPos + 1;
      const to = from + length;
      editor.chain().focus().setTextSelection({ from, to }).run();
    } catch {
      // Silently fail for position issues
    }
  };

  const goToNext = () => {
    if (matches.length === 0) return;
    const next = (currentMatch + 1) % matches.length;
    setCurrentMatch(next);
    highlightMatch(matches[next], searchTerm.length);
  };

  const goToPrev = () => {
    if (matches.length === 0) return;
    const prev = (currentMatch - 1 + matches.length) % matches.length;
    setCurrentMatch(prev);
    highlightMatch(matches[prev], searchTerm.length);
  };

  const handleReplace = () => {
    if (!editor || currentMatch < 0 || matches.length === 0) return;

    const pos = matches[currentMatch] + 1;
    editor
      .chain()
      .focus()
      .setTextSelection({ from: pos, to: pos + searchTerm.length })
      .deleteSelection()
      .insertContent(replaceTerm)
      .run();

    // Re-search after replace
    setTimeout(findMatches, 100);
  };

  const handleReplaceAll = () => {
    if (!editor || matches.length === 0) return;

    // Replace from end to start to maintain positions
    const sortedMatches = [...matches].sort((a, b) => b - a);
    const chain = editor.chain().focus();

    for (const pos of sortedMatches) {
      const from = pos + 1;
      const to = from + searchTerm.length;
      chain.setTextSelection({ from, to }).deleteSelection().insertContent(replaceTerm);
    }

    chain.run();
    setTimeout(findMatches, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) goToPrev();
      else goToNext();
    }
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-16 z-40 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-b-lg shadow-lg p-3 min-w-[320px]">
      <div className="flex items-center gap-2 mb-2">
        <Search size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
        <input
          ref={searchRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in manuscript..."
          className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
        />
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 min-w-[40px] text-center">
          {matches.length > 0 ? `${currentMatch + 1}/${matches.length}` : '0/0'}
        </span>
        <button onClick={goToPrev} className="p-1 hover:bg-[var(--color-surface-alt)] rounded" title="Previous (Shift+Enter)">
          <ChevronUp size={16} className="text-[var(--color-text-secondary)]" />
        </button>
        <button onClick={goToNext} className="p-1 hover:bg-[var(--color-surface-alt)] rounded" title="Next (Enter)">
          <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />
        </button>
        <button
          onClick={() => setShowReplace(!showReplace)}
          className={`p-1 rounded transition-colors ${showReplace ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}
          title="Toggle replace"
        >
          <Replace size={16} />
        </button>
        <button onClick={onClose} className="p-1 hover:bg-[var(--color-surface-alt)] rounded" title="Close (Esc)">
          <X size={16} className="text-[var(--color-text-muted)]" />
        </button>
      </div>

      {showReplace && (
        <div className="flex items-center gap-2">
          <Replace size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
          <input
            type="text"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Replace with..."
            className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
          />
          <button
            onClick={handleReplace}
            disabled={matches.length === 0}
            className="px-2 py-1 text-xs font-medium bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded disabled:opacity-50 text-[var(--color-text-primary)]"
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={matches.length === 0}
            className="px-2 py-1 text-xs font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded disabled:opacity-50"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}
