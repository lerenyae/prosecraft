'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

export type StudioEditorHandle = {
  toggleBold: () => void;
  toggleItalic: () => void;
  undo: () => void;
};

type EditorProps = {
  eyebrow?: string;
  chapterTitle: string;
  initialContent: string;
  onTextChange?: (plain: string) => void;
  registerHandle?: (h: StudioEditorHandle) => void;
};

export function Editor({
  eyebrow = 'Chapter',
  chapterTitle,
  initialContent,
  onTextChange,
  registerHandle,
}: EditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'studio-prose font-display text-ink text-[18px] leading-[1.85] focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onTextChange?.(editor.getText());
    },
  });

  useEffect(() => {
    if (!editor || !registerHandle) return;
    registerHandle({
      toggleBold: () => editor.chain().focus().toggleBold().run(),
      toggleItalic: () => editor.chain().focus().toggleItalic().run(),
      undo: () => editor.chain().focus().undo().run(),
    });
  }, [editor, registerHandle]);

  return (
    <div className="flex-1 overflow-y-auto">
      <article className="max-w-[680px] mx-auto pt-[50px] pb-20 px-10">
        <header className="text-center mb-10">
          <p className="text-[11px] uppercase tracking-[2px] text-muted font-semibold mb-3">{eyebrow}</p>
          <h1 className="font-display text-bark text-[42px] font-medium leading-tight tracking-[-1px]">{chapterTitle}</h1>
        </header>
        <EditorContent editor={editor} />
      </article>
    </div>
  );
}
