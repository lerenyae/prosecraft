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
  if (!editor || isHidden) {
    return null;
  }

  const handleLinkClick = () => {
    const url = prompt('Enter URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded transition-colors ${
      isActive
        ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-50'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <div className="flex items-center gap-1 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      {/* Text formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive('bold'))}
        title="Bold (Ctrl+B)"
        type="button"
      >
        <Bold size={18} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive('italic'))}
        title="Italic (Ctrl+I)"
        type="button"
      >
        <Italic size={18} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={buttonClass(editor.isActive('underline'))}
        title="Underline (Ctrl+U)"
        type="button"
      >
        <UnderlineIcon size={18} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={buttonClass(editor.isActive('strike'))}
        title="Strikethrough"
        type="button"
      >
        <Strikethrough size={18} />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

      {/* Headings */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 1 }))}
        title="Heading 1"
        type="button"
      >
        <Heading1 size={18} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 2 }))}
        title="Heading 2"
        type="button"
      >
        <Heading2 size={18} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 3 }))}
        title="Heading 3"
        type="button"
      >
        <Heading3 size={18} />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

      {/* Blockquote & Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={buttonClass(editor.isActive('blockquote'))}
        title="Blockquote"
        type="button"
      >
        <Quote size={18} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive('bulletList'))}
        title="Bullet List"
        type="button"
      >
        <List size={18} />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={buttonClass(editor.isActive('orderedList'))}
        title="Ordered List"
        type="button"
      >
        <ListOrdered size={18} />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

      {/* Text alignment */}
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={buttonClass(editor.isActive({ textAlign: 'left' }))}
        title="Align Left"
        type="button"
      >
        <AlignLeft size={18} />
      </button>

      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={buttonClass(editor.isActive({ textAlign: 'center' }))}
        title="Align Center"
        type="button"
      >
        <AlignCenter size={18} />
      </button>

      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={buttonClass(editor.isActive({ textAlign: 'right' }))}
        title="Align Right"
        type="button"
      >
        <AlignRight size={18} />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

      {/* Link */}
      <button
        onClick={handleLinkClick}
        className={buttonClass(editor.isActive('link'))}
        title="Add Link"
        type="button"
      >
        <LinkIcon size={18} />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

      {/* Undo/Redo */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={`p-2 rounded transition-colors ${
          editor.can().undo()
            ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
        }`}
        title="Undo (Ctrl+Z)"
        type="button"
      >
        <Undo2 size={18} />
      </button>

      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={`p-2 rounded transition-colors ${
          editor.can().redo()
            ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
        }`}
        title="Redo (Ctrl+Y)"
        type="button"
      >
        <Redo2 size={18} />
      </button>
    </div>
  );
}

// ============================================================================
// Editor Component
// ============================================================================

export function Editor() {
  const {
    currentScene,
    updateScene,
    focusMode,
  } = useStore();

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'leading-relaxed',
          },
        },
        heading: {
          HTMLAttributes: {
            class: 'font-serif font-bold leading-snug mt-6 mb-3',
          },
        },
        hardBreak: {
          HTMLAttributes: {
            class: 'break',
          },
        },
      }),
      Placeholder.configure({
        placeholder: 'Begin writing...',
      }),
      CharacterCount.configure({
        limit: null,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: currentScene?.content || '',
    editorProps: {
      attributes: {
        class:
          'font-serif text-base leading-relaxed focus:outline-none prose dark:prose-invert prose-slate max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        if (currentScene) {
          const html = editor.getHTML();
          const text = editor.getText();
          const wordCount = text
            .trim()
            .split(/\s+/)
            .filter((word) => word.length > 0).length;

          updateScene(currentScene.id, {
            content: html,
            wordCount: wordCount,
          });
        }
      }, DEBOUNCE_MS);
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

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Toolbar - hidden in focus mode */}
      <Toolbar editor={editor} isHidden={focusMode} />

      {/* Editor container */}
      <div className="flex-1 overflow-y-auto px-4 py-12 sm:px-6 lg:px-8">
        {!currentScene ? (
          // Empty state
          <div className="flex items-center justify-center h-full min-h-96">
            <p className="text-lg text-slate-400 dark:text-slate-600">
              Select a scene to begin writing
            </p>
          </div>
        ) : (
          // Editor
          <div className="mx-auto max-w-[720px] relative">
            <EditorContent
              editor={editor}
              className="prose dark:prose-invert prose-slate max-w-none"
            />
            {/* AI Toolbar - appears on text selection */}
            <AIToolbar editor={editor} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Editor;
