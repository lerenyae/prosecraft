'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, Editor as TipTapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
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
} from 'lucide-react';
import { useStore } from '@/lib/store';
import AIToolbar from '@/components/AIToolbar';

const DEBOUNCE_MS = 2000;

// ============================================================================
// Toolbar Component
// ============================================================================

interface ToolbarProps {
  editor: TipTapEditor | null;
  isHidden?: boolean;
}

function Toolbar({ editor, isHidden = false }: ToolbarProps) {
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
  onEditorReady?: (editor: TipTapEditor) => void;
}

export function Editor({ onSelectionChange, hasActiveSelection, onEditorReady }: EditorProps) {
  const {
    currentScene,
    updateScene,
    focusMode,
  } = useStore();

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wordCountTimerRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: { class: 'prose-paragraph' },
        },
        heading: {
          HTMLAttributes: { class: 'prose-heading' },
        },
        hardBreak: {
          HTMLAttributes: { class: 'break' },
        },
        blockquote: {
          HTMLAttributes: { class: 'prose-blockquote' },
        },
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

      // Debounced full content save (2s)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (currentScene) {
          const html = editor.getHTML();
          const text = editor.getText();
          const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
          updateScene(currentScene.id, { content: html, wordCount });
        }
      }, DEBOUNCE_MS);
    },
    onSelectionUpdate: ({ editor }) => {
      if (!onSelectionChange) return;

      // Debounce selection changes
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);

      selectionTimerRef.current = setTimeout(() => {
        const { from, to } = editor.state.selection;
        if (from === to) {
          onSelectionChange('');
        } else {
          const text = editor.state.doc.textBetween(from, to);
          onSelectionChange(text.trim());
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

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      if (wordCountTimerRef.current) clearTimeout(wordCountTimerRef.current);
    };
  }, []);

  return (
    <div className={`flex flex-col h-full bg-[var(--color-surface)] ${hasActiveSelection ? 'selection-focus-mode' : ''}`}>
      <Toolbar editor={editor} isHidden={focusMode} />

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
            <AIToolbar editor={editor} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Editor;
