'use client'

import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent, Editor as TipTapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { Node, mergeAttributes } from '@tiptap/core'
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
} from 'lucide-react'
import { useStore } from '@/lib/store'

const DEBOUNCE_MS = 2000

// Scene Break styles
const SCENE_BREAK_STYLES = [
  { id: 'asterisks', label: '* * *', symbol: '* * *' },
  { id: 'dashes', label: '— — —', symbol: '— — —' },
  { id: 'dots', label: '• • •', symbol: '• • •' },
  { id: 'fleuron', label: '❧', symbol: '❧' },
  { id: 'ornament', label: '⁂', symbol: '⁂' },
]

// Custom Scene Break extension
const SceneBreak = Node.create({
  name: 'sceneBreak',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      style: {
        default: 'asterisks',
        parseHTML: element => element.getAttribute('data-scene-break-style') || 'asterisks',
        renderHTML: attributes => ({
          'data-scene-break-style': attributes.style,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-scene-break]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const style = HTMLAttributes['data-scene-break-style'] || 'asterisks'
    const found = SCENE_BREAK_STYLES.find(s => s.id === style)
    const symbol = found ? found.symbol : '* * *'
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-scene-break': '',
      'data-scene-break-style': style,
      class: 'scene-break',
      contenteditable: 'false',
    }), symbol]
  },

  addCommands() {
    return {
      setSceneBreak: (attrs = {}) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs,
        })
      },
    }
  },
})

/**
 * Toolbar Component
 */

interface ToolbarProps {
  editor: TipTapEditor | null
  isHidden?: boolean
}

function Toolbar({ editor, isHidden = false }: ToolbarProps) {
  if (!editor || isHidden) return null
  const [showBreakMenu, setShowBreakMenu] = useState(false)
  const breakMenuRef = useRef<HTMLDivElement>(null)

  // Close break menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (breakMenuRef.current && !breakMenuRef.current.contains(e.target as Node)) {
        setShowBreakMenu(false)
      }
    }
    if (showBreakMenu) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showBreakMenu])

  const handleLinkClick = () => {
    const url = prompt('Enter URL:')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  const btn = (isActive: boolean) =>
    `p-1.5 rounded transition-colors ${
    isActive
      ? 'bg-[var(--color-surface-alt)] text-[var(--color-text-primary)]'
      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
    }`

  const divider = 'w-px h-5 bg-[var(--color-border)] mx-0.5'

  return (
    <div className="flex items-center gap-0.5 px-4 py-2 border-b border-[var(--color-border)] flex-wrap">
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

      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} title="Quote" type="button">
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

      <button onClick={handleLinkClick} className={btn(editor.isActive('link'))} title="Link" type="button">
        <LinkIcon size={16} />
      </button>

      <div className={divider} />

      {/* Scene Break dropdown */}
      <div className="relative" ref={breakMenuRef}>
        <button
          onClick={() => setShowBreakMenu(!showBreakMenu)}
          className={btn(editor.isActive('sceneBreak'))}
          title="Scene Break"
          type="button"
        >
          <Minus size={16} />
        </button>
        {showBreakMenu && (
          <div className="absolute top-full left-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
            {SCENE_BREAK_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  (editor.chain().focus() as any).setSceneBreak({ style: style.id }).run()
                  setShowBreakMenu(false)
                }}
                className="w-full px-3 py-1.5 text-sm text-center hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] transition-colors"
                type="button"
              >
                {style.symbol}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={divider} />

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={`p-1.5 rounded transition-colors ${
          editor.can().undo()
            ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
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
            ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
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

/**
 * Editor Component
 */

interface EditorProps {
  onSelectionChange?: (text: string) => void
  hasActiveSelection?: boolean
  onEditorReady?: (editor: TipTapEditor) => void
}

export function Editor({ onSelectionChange, hasActiveSelection, onEditorReady }: EditorProps) {
  const {
    currentScene,
    updateScene,
    focusMode,
  } = useStore()

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const selectionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const wordCountTimerRef = useRef<NodeJS.Timeout | null>(null)

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
        horizontalRule: false,
      }),
      SceneBreak,
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
      /* Immediate word count update (200ms) for responsive feel */
      if (wordCountTimerRef.current) clearTimeout(wordCountTimerRef.current)
      wordCountTimerRef.current = setTimeout(() => {
        if (currentScene) {
          const text = editor.getText()
          const words = text.trim() ? text.trim().split(/\s+/).length : 0
          updateScene(currentScene.id, { wordCount: words })
        }
      }, 200)

      /* Debounced content save (2s) to avoid hammering store */
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        if (currentScene) {
          const html = editor.getHTML()
          const text = editor.getText()
          const words = text.trim() ? text.trim().split(/\s+/).length : 0
          updateScene(currentScene.id, {
            content: html,
            wordCount: words,
          })
        }
      }, DEBOUNCE_MS)
    },
    onSelectionUpdate: ({ editor }) => {
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current)
      selectionTimerRef.current = setTimeout(() => {
        const { from, to } = editor.state.selection
        if (from !== to) {
          const text = editor.state.doc.textBetween(from, to, ' ')
          onSelectionChange?.(text)
        } else {
          onSelectionChange?.('')
        }
      }, 150)
    },
  })

  // Sync content when scene changes
  useEffect(() => {
    if (editor && currentScene) {
      const currentContent = editor.getHTML()
      if (currentContent !== currentScene.content) {
        editor.commands.setContent(currentScene.content || '')
      }
    }
  }, [currentScene?.id, editor])

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor)
    }
  }, [editor, onEditorReady])

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current)
      if (wordCountTimerRef.current) clearTimeout(wordCountTimerRef.current)
    }
  }, [])

  return (
    <div className={`flex flex-col h-full bg-[var(--color-surface)] ${hasActiveSelection ? 'has-selection' : ''}`}>
      <Toolbar editor={editor} isHidden={focusMode} />

      <div className="flex-1 overflow-y-auto">
        {!currentScene ? (
          <div className="flex items-center justify-center h-full min-h-96">
            <p className="text-base text-[var(--color-text-muted)]">
              Select a scene to begin writing
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-[680px] px-4 py-12 sm:px-6 lg:px-8">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>
    </div>
  )
}

export default Editor
