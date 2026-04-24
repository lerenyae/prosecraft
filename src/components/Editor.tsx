'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent, Editor as TipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Minus,
  Search,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import AIToolbar from '@/components/AIToolbar';
import SearchReplace from '@/components/SearchReplace';

// ============================================================================
// Search Highlight Extension
// ============================================================================

const searchHighlightKey = new PluginKey('searchHighlight');

function createSearchHighlightExtension() {
  return Extension.create({
    name: 'searchHighlight',

    addStorage() {
      return {
        searchTerm: '' as string,
        activeIndex: 0,
        totalMatches: 0,
      };
    },

    addProseMirrorPlugins() {
      const ext = this;
      return [
        new Plugin({
          key: searchHighlightKey,
          state: {
            init() {
              return DecorationSet.empty;
            },
            apply(tr, oldSet) {
              const meta = tr.getMeta(searchHighlightKey);
              if (meta !== undefined) {
                const { searchTerm, activeIndex } = meta;
                if (!searchTerm) {
                  ext.storage.searchTerm = '';
                  ext.storage.totalMatches = 0;
                  ext.storage.activeIndex = 0;
                  return DecorationSet.empty;
                }
                ext.storage.searchTerm = searchTerm;
                const decorations: Decoration[] = [];
                const regex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                tr.doc.descendants((node, pos) => {
                  if (!node.isText || !node.text) return;
                  let match;
                  while ((match = regex.exec(node.text)) !== null) {
                    const from = pos + match.index;
                    const to = from + match[0].length;
                    decorations.push(
                      Decoration.inline(from, to, {
                        class: decorations.length === activeIndex
                          ? 'search-highlight-active'
                          : 'search-highlight',
                      })
                    );
                  }
                });
                ext.storage.totalMatches = decorations.length;
                ext.storage.activeIndex = Math.min(activeIndex, Math.max(0, decorations.length - 1));
                return DecorationSet.create(tr.doc, decorations);
              }

              // If doc changed, reapply
              if (tr.docChanged && ext.storage.searchTerm) {
                const searchTerm = ext.storage.searchTerm;
                const decorations: Decoration[] = [];
                const regex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                tr.doc.descendants((node, pos) => {
                  if (!node.isText || !node.text) return;
                  let match;
                  while ((match = regex.exec(node.text)) !== null) {
                    const from = pos + match.index;
                    const to = from + match[0].length;
                    decorations.push(
                      Decoration.inline(from, to, {
                        class: decorations.length === ext.storage.activeIndex
                          ? 'search-highlight-active'
                          : 'search-highlight',
                      })
                    );
                  }
                });
                ext.storage.totalMatches = decorations.length;
                return DecorationSet.create(tr.doc, decorations);
              }

              return tr.docChanged ? DecorationSet.empty : oldSet;
            },
          },
          props: {
            decorations(state) {
              return this.getState(state);
            },
          },
        }),
      ];
    },
  });
}

// ============================================================================
// Search Bar Component
// ============================================================================

function SearchBar({ editor, searchTerm, onClose }: { editor: TipTapEditor; searchTerm: string; onClose: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  // Apply search decorations, then read the resulting match count from storage.
  // This fixes the first-click no-op: previously we read storage at render time,
  // before the dispatch actually ran.
  useEffect(() => {
    if (!editor) return;
    const tr = editor.state.tr;
    tr.setMeta(searchHighlightKey, { searchTerm, activeIndex });
    editor.view.dispatch(tr);
    // After dispatch, storage is updated synchronously by the plugin's apply()
    const count = (editor.storage as any).searchHighlight?.totalMatches ?? 0;
    setTotalMatches(count);
    // If new term has fewer matches than activeIndex, reset to 0
    if (count > 0 && activeIndex >= count) {
      setActiveIndex(0);
    }
  }, [editor, searchTerm, activeIndex]);

  // Scroll to active match — runs after totalMatches is set so the first
  // highlight click actually jumps to the word.
  useEffect(() => {
    if (!editor || totalMatches === 0) return;
    const decorations = searchHighlightKey.getState(editor.state);
    if (!decorations) return;
    const found = decorations.find();
    if (found[activeIndex]) {
      const pos = found[activeIndex].from;
      // Defer to next frame so layout settles before scrolling
      requestAnimationFrame(() => {
        try {
          const domAtPos = editor.view.domAtPos(pos);
          if (domAtPos.node instanceof HTMLElement) {
            domAtPos.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (domAtPos.node.parentElement) {
            domAtPos.node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } catch {
          // domAtPos can throw if the doc mutated between dispatch and rAF; safe to ignore
        }
      });
    }
  }, [editor, activeIndex, totalMatches, searchTerm]);

  const goNext = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % Math.max(1, totalMatches));
  }, [totalMatches]);

  const goPrev = useCallback(() => {
    setActiveIndex(prev => (prev - 1 + Math.max(1, totalMatches)) % Math.max(1, totalMatches));
  }, [totalMatches]);

  const handleClose = useCallback(() => {
    const tr = editor.state.tr;
    tr.setMeta(searchHighlightKey, { searchTerm: '', activeIndex: 0 });
    editor.view.dispatch(tr);
    onClose();
  }, [editor, onClose]);

  if (!searchTerm) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0">
      <Search size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
      <span className="text-sm font-medium text-[var(--color-accent)]">&ldquo;{searchTerm}&rdquo;</span>
      <span className="text-xs text-[var(--color-text-muted)]">
        {totalMatches > 0 ? `${activeIndex + 1}/${totalMatches}` : 'No matches'}
      </span>
      <div className="flex items-center gap-0.5 ml-auto">
        <button onClick={goPrev} className="p-1 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]" title="Previous" disabled={totalMatches === 0}>
          <ChevronUp size={14} />
        </button>
        <button onClick={goNext} className="p-1 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]" title="Next" disabled={totalMatches === 0}>
          <ChevronDown size={14} />
        </button>
        <button onClick={handleClose} className="p-1 rounded hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]" title="Close search">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

const DEBOUNCE_MS = 2000;

// ============================================================================
// Toolbar Component
// ============================================================================

interface ToolbarProps {
  editor: TipTapEditor | null;
  isHidden?: boolean;
}

function Toolbar({ editor, isHidden = false }: ToolbarProps) {
  const [showBreakMenu, setShowBreakMenu] = useState(false);

  if (!editor || isHidden) return null;

  const handleLinkClick = () => {
    const url = prompt('Enter URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const btn = (isActive: boolean) =>
    `p-1.5 rounded transition-colors ${
      isActive
        ? 'bg-[var(--color-surface-alt)] text-[var(--color-text-primary)]'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]'
    }`;

  const divider = 'w-px h-5 bg-[var(--color-border)] mx-0.5';

  return (
    <div className="flex items-center gap-0.5 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] flex-shrink-0">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Bold" type="button">
        <Bold size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Italic" type="button">
        <Italic size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))} title="Underline" type="button">
        <UnderlineIcon size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))} title="Strikethrough" type="button">
        <Strikethrough size={16} />
      </button>

      <div className={divider} />

      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))} title="Heading 1" type="button">
        <Heading1 size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))} title="Heading 2" type="button">
        <Heading2 size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))} title="Heading 3" type="button">
        <Heading3 size={16} />
      </button>

      <div className={divider} />

      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} title="Blockquote" type="button">
        <Quote size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="Bullet List" type="button">
        <List size={16} />
      </button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} title="Ordered List" type="button">
        <ListOrdered size={16} />
      </button>

      <div className="relative">
        <button onClick={() => setShowBreakMenu(!showBreakMenu)} className={btn(false)} title="Scene Break" type="button">
          <Minus size={16} />
        </button>
        {showBreakMenu && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 min-w-[100px]">
            {['* * *', '- - -', '~ ~ ~', '. . .', '# # #'].map(label => (
              <button
                key={label}
                onClick={() => {
                  editor.chain().focus().insertContent({ type: 'horizontalRule', attrs: { separatorStyle: label } }).run();
                  setShowBreakMenu(false);
                }}
                type="button"
                className="w-full px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] text-center transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={divider} />

      <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btn(editor.isActive({ textAlign: 'left' }))} title="Align Left" type="button">
        <AlignLeft size={16} />
      </button>
      <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btn(editor.isActive({ textAlign: 'center' }))} title="Align Center" type="button">
        <AlignCenter size={16} />
      </button>
      <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btn(editor.isActive({ textAlign: 'right' }))} title="Align Right" type="button">
        <AlignRight size={16} />
      </button>

      <div className={divider} />

      <button onClick={handleLinkClick} className={btn(editor.isActive('link'))} title="Add Link" type="button">
        <LinkIcon size={16} />
      </button>

      <div className={divider} />

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={`p-1.5 rounded transition-colors ${
          editor.can().undo()
            ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]'
            : 'text-[var(--color-border)] cursor-not-allowed'
        }`}
        title="Undo"
        type="button"
      >
        <Undo2 size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={`p-1.5 rounded transition-colors ${
          editor.can().redo()
            ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]'
            : 'text-[var(--color-border)] cursor-not-allowed'
        }`}
        title="Redo"
        type="button"
      >
        <Redo2 size={16} />
      </button>
    </div>
  );
}

// ============================================================================
// Editor Component
// ============================================================================

interface EditorProps {
  onSelectionChange?: (text: string) => void;
  hasActiveSelection?: boolean;
}

const SearchHighlight = createSearchHighlightExtension();

export function Editor({ onSelectionChange, hasActiveSelection }: EditorProps) {
  const {
    currentScene,
    updateScene,
    focusMode,
    highlightWord,
    setHighlightWord,
  } = useStore();

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wordCountTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track selected text locally for AIToolbar
  const [selectedText, setSelectedText] = useState('');

  // Find & Replace panel
  const [searchReplaceOpen, setSearchReplaceOpen] = useState(false);

  // Save status indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  // Keyboard shortcut: Cmd/Ctrl+F opens Find & Replace
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchReplaceOpen(true);
      } else if (e.key === 'Escape' && searchReplaceOpen) {
        setSearchReplaceOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchReplaceOpen]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        paragraph: { HTMLAttributes: { class: 'prose-paragraph' } },
        heading: { HTMLAttributes: { class: 'prose-heading' } },
        hardBreak: { HTMLAttributes: { class: 'break' } },
        blockquote: { HTMLAttributes: { class: 'prose-blockquote' } },
      }),
      Placeholder.configure({
        placeholder: 'Begin writing...',
      }),
      CharacterCount.configure({ limit: null }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--color-accent)] underline hover:opacity-80',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      SearchHighlight,
      HorizontalRule.extend({
        addAttributes() {
          return {
            separatorStyle: {
              default: '* * *',
              parseHTML: (element: HTMLElement) => element.getAttribute('data-separator-style') || '* * *',
              renderHTML: (attributes: Record<string, string>) => ({
                'data-separator-style': attributes.separatorStyle || '* * *',
              }),
            },
          };
        },
        addNodeView() {
          return ({ node }: { node: { attrs: Record<string, string> } }) => {
            const dom = document.createElement('div');
            dom.classList.add('scene-break');
            dom.textContent = node.attrs.separatorStyle || '* * *';
            dom.contentEditable = 'false';
            return { dom };
          };
        },
      }),
    ],
    content: currentScene?.content || '',
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none max-w-none min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      // Immediate word count update (200ms) for responsive feel
      if (wordCountTimerRef.current) clearTimeout(wordCountTimerRef.current);
      wordCountTimerRef.current = setTimeout(() => {
        if (currentScene) {
          const text = editor.getText();
          const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
          updateScene(currentScene.id, { wordCount });
        }
      }, 200);

      // Show saving indicator
      setSaveStatus('saving');

      // Debounced full content save (2s)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (currentScene) {
          const html = editor.getHTML();
          const text = editor.getText();
          const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
          updateScene(currentScene.id, { content: html, wordCount });
          setSaveStatus('saved');
          // Reset to idle after showing "saved" briefly
          setTimeout(() => setSaveStatus('idle'), 1500);
        }
      }, DEBOUNCE_MS);
    },
    onSelectionUpdate: ({ editor }) => {
      // Debounce selection changes
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = setTimeout(() => {
        const { from, to } = editor.state.selection;
        if (from === to) {
          setSelectedText('');
          onSelectionChange?.('');
        } else {
          const text = editor.state.doc.textBetween(from, to);
          const trimmed = text.trim();
          setSelectedText(trimmed);
          onSelectionChange?.(trimmed);
        }
      }, 300);
    },
  });

  // Update editor content when scene changes
  useEffect(() => {
    if (editor && currentScene) {
      const currentContent = editor.getHTML();
      const newContent = currentScene.content || '';
      if (currentContent !== newContent) {
        editor.commands.setContent(newContent);
      }
    }
  }, [editor, currentScene?.id]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      if (wordCountTimerRef.current) clearTimeout(wordCountTimerRef.current);
    };
  }, []);

  return (
    <div className={`relative flex flex-col h-full bg-[var(--color-surface)] ${hasActiveSelection ? 'selection-focus-mode' : ''}`}>
      <Toolbar editor={editor} isHidden={focusMode} />

      {editor && highlightWord && (
        <SearchBar editor={editor} searchTerm={highlightWord} onClose={() => setHighlightWord(null)} />
      )}

      <SearchReplace
        editor={editor}
        isOpen={searchReplaceOpen}
        onClose={() => setSearchReplaceOpen(false)}
      />


      {/* Save status indicator */}
      {saveStatus !== 'idle' && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded text-[10px] font-medium transition-opacity duration-300"
          style={{ opacity: saveStatus === 'saved' ? 0.7 : 1 }}
        >
          <span className={saveStatus === 'saving' ? 'text-[var(--color-text-muted)]' : 'text-emerald-500'}>
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!currentScene ? (
          <div className="flex items-center justify-center h-full min-h-96">
            <p className="text-base text-[var(--color-text-muted)]">
              Select a scene to begin writing
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-[680px] px-4 py-12 sm:px-6 lg:px-8 relative">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>
      <AIToolbar editor={editor} selectedText={selectedText} />
    </div>
  );
}

export default Editor;
