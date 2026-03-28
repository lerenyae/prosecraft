'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Replace, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Editor as TipTapEditor } from '@tiptap/react';

interface SearchReplaceProps {
  editor: TipTapEditor | null;
  isOpen: boolean;
  onClose: () => void;
}

// Map flat text offset to ProseMirror position
// ProseMirror positions count block boundaries, so flat getText() offsets don't map 1:1
function textOffsetToPmPos(editor: TipTapEditor, textOffset: number): number {
  let charsSeen = 0;
  let pmPos = -1;

  editor.state.doc.descendants((node, pos) => {
    if (pmPos !== -1) return false; // already found
    if (node.isText) {
      const nodeText = node.text || '';
      if (charsSeen + nodeText.length > textOffset) {
        pmPos = pos + (textOffset - charsSeen);
        return false;
      }
      charsSeen += nodeText.length;
    }
    return true;
  });

  // Fallback if not found (end of doc)
  return pmPos !== -1 ? pmPos : editor.state.doc.content.size;
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

  // Find all matches in flat text
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

    if (found.length > 0) {
      highlightMatch(found[0], searchTerm.length);
    }
  }, [editor, searchTerm]);

  // Trigger search on term change
  useEffect(() => {
    const timer = setTimeout(findMatches, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, findMatches]);

  const highlightMatch = (textOffset: number, length: number) => {
    if (!editor) return;
    try {
      const from = textOffsetToPmPos(editor, textOffset);
      const to = textOffsetToPmPos(editor, textOffset + length);
      if (from >= 0 && to >= from) {
        editor.chain().focus().setTextSelection({ from, to }).run();
      }
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

    const textOffset = matches[currentMatch];
    const from = textOffsetToPmPos(editor, textOffset);
    const to = textOffsetToPmPos(editor, textOffset + searchTerm.length);

    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .deleteSelection()
      .insertContent(replaceTerm)
      .run();

    // Re-search after replace
    setTimeout(findMatches, 100);
  };

  const handleReplaceAll = () => {
    if (!editor || matches.length === 0) return;

    // Replace from end to start to maintain positions
    const sortedOffsets = [...matches].sort((a, b) => b - a);

    // Use a single transaction for atomicity
    const { tr } = editor.state;
    for (const textOffset of sortedOffsets) {
      const from = textOffsetToPmPos(editor, textOffset);
      const to = textOffsetToPmPos(editor, textOffset + searchTerm.length);
      tr.replaceWith(from, to, editor.state.schema.text(replaceTerm));
    }
    editor.view.dispatch(tr);

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
