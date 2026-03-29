'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  GripVertical,
  MoreHorizontal,
  BookOpen,
  FileText,
  Folder,
  Download,
  Users,
  Map,
  Trash2,
  Edit3,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@/lib/store';
import { Chapter, Scene } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface ExpandedChapters {
  [chapterId: string]: boolean;
}

interface MenuOpen {
  [key: string]: boolean;
}

type SidebarSection = 'chapters' | 'characters' | 'storyboard';

// ============================================================================
// Character & Storyboard types (stored in localStorage for now)
// ============================================================================

interface Character {
  id: string;
  name: string;
  role: string;
  notes: string;
}

interface StoryboardNote {
  id: string;
  title: string;
  content: string;
  color: string;
}

// ============================================================================
// Sortable Chapter Item
// ============================================================================

function SortableChapterItem({
  chapter,
  isExpanded,
  showScenes: _showScenes,
  onToggleExpand,
  onAddScene,
  onSelectChapter,
  onSelectScene,
  onShowMenu,
  isActive,
  scenes,
  currentSceneId,
  chapterWordCount,
}: {
  chapter: Chapter;
  isExpanded: boolean;
  showScenes: boolean;
  onToggleExpand: (chapterId: string) => void;
  onAddScene: (chapterId: string) => void;
  onSelectChapter: (chapterId: string) => void;
  onSelectScene: (chapterId: string, sceneId: string) => void;
  onShowMenu: (key: string) => void;
  isActive: boolean;
  scenes: Scene[];
  currentSceneId: string | null;
  chapterWordCount: (chapterId: string) => number;
}) {
  const sortable = useSortable({ id: chapter.id });
  const { isDragging } = sortable;

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div
        className={`flex items-center gap-1 px-3 py-2 text-sm rounded group cursor-pointer transition-colors ${
          isActive
            ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-dark)]'
            : 'hover:bg-[var(--color-surface)] text-[var(--color-text-primary)]'
        }`}
        onClick={() => onSelectChapter(chapter.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          onShowMenu(`chapter-${chapter.id}`);
        }}
      >
        {/* Drag handle */}
        <button
          {...sortable.listeners}
          {...sortable.attributes}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 -ml-1"
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} className="text-[var(--color-text-muted)]" />
        </button>

        {/* Expand toggle (only if multiple scenes) */}
        {scenes.length > 1 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(chapter.id);
            }}
            className="p-0.5 hover:bg-[var(--color-surface-alt)] rounded"
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
            ) : (
              <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <Folder size={14} className={isActive ? 'text-[var(--color-accent)] flex-shrink-0' : 'text-[var(--color-text-muted)] flex-shrink-0'} />

        <span className="flex-1 font-medium truncate">
          {chapter.title}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">
          {chapterWordCount(chapter.id).toLocaleString()}
        </span>

        {/* Menu button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowMenu(`chapter-${chapter.id}`);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--color-surface-alt)] rounded"
        >
          <MoreHorizontal size={14} className="text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Scenes (only shown when expanded and multiple scenes exist) */}
      {isExpanded && scenes.length > 1 && (
        <div className="pl-8 space-y-0">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => onSelectScene(chapter.id, scene.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                onShowMenu(`scene-${scene.id}`);
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors group ${
                currentSceneId === scene.id
                  ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-dark)] font-medium'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
              }`}
            >
              <FileText size={12} className={currentSceneId === scene.id ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'} />
              <span className="flex-1 truncate text-left">{scene.title || 'Untitled'}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">{scene.wordCount}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onShowMenu(`scene-${scene.id}`); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[var(--color-surface-alt)] rounded"
              >
                <MoreHorizontal size={12} className="text-[var(--color-text-muted)]" />
              </button>
            </button>
          ))}
          <button
            onClick={() => onAddScene(chapter.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] rounded transition-colors"
          >
            <Plus size={10} />
            Add Scene
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Context Menu
// ============================================================================

function ContextMenu({
  isOpen,
  onClose,
  onRename,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-2 mt-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 min-w-[120px] overflow-hidden">
      <button
        onClick={() => { onRename(); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
      >
        <Edit3 size={12} /> Rename
      </button>
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50/50"
      >
        <Trash2 size={12} /> Delete
      </button>
    </div>
  );
}

// ============================================================================
// Rename Modal
// ============================================================================

function RenameModal({
  title,
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-bg-primary)] rounded-lg shadow-lg p-4 max-w-sm w-full mx-4">
        <h3 className="font-semibold mb-3 text-sm text-[var(--color-text-primary)]">{title}</h3>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm();
            if (e.key === 'Escape') onCancel();
          }}
          autoFocus
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg mb-3 bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <div className="flex gap-2">
          <button onClick={onConfirm} className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-dark)] text-xs font-medium">Save</button>
          <button onClick={onCancel} className="px-4 py-2 bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-border)] text-xs font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Characters Panel
// ============================================================================

function CharactersPanel({ projectId }: { projectId: string }) {
  const storageKey = `prosecraft-characters-${projectId}`;
  const [characters, setCharacters] = useState<Character[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const save = (chars: Character[]) => {
    setCharacters(chars);
    localStorage.setItem(storageKey, JSON.stringify(chars));
  };

  const handleAdd = () => {
    const id = Date.now().toString();
    const newChar: Character = { id, name: 'New Character', role: '', notes: '' };
    save([...characters, newChar]);
    setEditingId(id);
    setEditName(newChar.name);
    setEditRole('');
    setEditNotes('');
  };

  const handleSave = () => {
    if (!editingId) return;
    save(characters.map(c => c.id === editingId ? { ...c, name: editName, role: editRole, notes: editNotes } : c));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    save(characters.filter(c => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="space-y-1">
      {characters.map(char => (
        <div key={char.id}>
          {editingId === char.id ? (
            <div className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" autoFocus
                className="w-full px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none" />
              <input value={editRole} onChange={e => setEditRole(e.target.value)} placeholder="Role (e.g., Protagonist, Antagonist)"
                className="w-full px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none" />
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes, backstory, traits..."
                className="w-full px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none resize-none h-16" />
              <div className="flex gap-1">
                <button onClick={handleSave} className="px-2 py-1 text-[10px] font-medium bg-[var(--color-accent)] text-white rounded">Save</button>
                <button onClick={() => setEditingId(null)} className="px-2 py-1 text-[10px] font-medium bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] rounded">Cancel</button>
                <button onClick={() => handleDelete(char.id)} className="px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 rounded ml-auto">Delete</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setEditingId(char.id); setEditName(char.name); setEditRole(char.role); setEditNotes(char.notes); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-[var(--color-surface)] transition-colors text-left"
            >
              <Users size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{char.name}</p>
                {char.role && <p className="text-[10px] text-[var(--color-text-muted)] truncate">{char.role}</p>}
              </div>
            </button>
          )}
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] rounded transition-colors"
      >
        <Plus size={12} /> Add Character
      </button>
    </div>
  );
}

// ============================================================================
// Storyboard Panel
// ============================================================================

const NOTE_COLORS = ['bg-yellow-100 dark:bg-yellow-900/30', 'bg-blue-100 dark:bg-blue-900/30', 'bg-green-100 dark:bg-green-900/30', 'bg-pink-100 dark:bg-pink-900/30', 'bg-purple-100 dark:bg-purple-900/30'];

function StoryboardPanel({ projectId }: { projectId: string }) {
  const storageKey = `prosecraft-storyboard-${projectId}`;
  const [notes, setNotes] = useState<StoryboardNote[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const save = (n: StoryboardNote[]) => {
    setNotes(n);
    localStorage.setItem(storageKey, JSON.stringify(n));
  };

  const handleAdd = () => {
    const id = Date.now().toString();
    const color = NOTE_COLORS[notes.length % NOTE_COLORS.length];
    const note: StoryboardNote = { id, title: 'New Note', content: '', color };
    save([...notes, note]);
    setEditingId(id);
    setEditTitle(note.title);
    setEditContent('');
  };

  const handleSave = () => {
    if (!editingId) return;
    save(notes.map(n => n.id === editingId ? { ...n, title: editTitle, content: editContent } : n));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    save(notes.filter(n => n.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="space-y-1">
      {notes.map(note => (
        <div key={note.id}>
          {editingId === note.id ? (
            <div className={`p-2 rounded-lg border border-[var(--color-border)] space-y-2 ${note.color}`}>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" autoFocus
                className="w-full px-2 py-1 text-xs bg-white/50 dark:bg-black/20 border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none" />
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Plot point, theme, note..."
                className="w-full px-2 py-1 text-xs bg-white/50 dark:bg-black/20 border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none resize-none h-20" />
              <div className="flex gap-1">
                <button onClick={handleSave} className="px-2 py-1 text-[10px] font-medium bg-[var(--color-accent)] text-white rounded">Save</button>
                <button onClick={() => setEditingId(null)} className="px-2 py-1 text-[10px] font-medium bg-white/50 dark:bg-black/20 text-[var(--color-text-secondary)] rounded">Cancel</button>
                <button onClick={() => handleDelete(note.id)} className="px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 rounded ml-auto">Delete</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setEditingId(note.id); setEditTitle(note.title); setEditContent(note.content); }}
              className={`w-full text-left px-3 py-2 rounded-lg hover:opacity-80 transition-opacity ${note.color}`}
            >
              <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{note.title}</p>
              {note.content && <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-2 mt-0.5">{note.content}</p>}
            </button>
          )}
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] rounded transition-colors"
      >
        <Plus size={12} /> Add Note
      </button>
    </div>
  );
}

// ============================================================================
// Main Sidebar
// ============================================================================

export default function Sidebar({ onExport }: { onExport?: () => void }) {
  const {
    currentProject,
    currentChapterId,
    currentSceneId,
    projectChapters,
    chapterScenes,
    sidebarOpen,
    focusMode,
    setCurrentChapter,
    setCurrentScene,
    createChapter,
    createScene,
    updateChapter,
    updateScene,
    deleteChapter,
    deleteScene,
    reorderChapters,
    chapterWordCount,
  } = useStore();

  const [expandedChapters, setExpandedChapters] = useState<ExpandedChapters>({});
  const [menuOpen, setMenuOpen] = useState<MenuOpen>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [activeSection, setActiveSection] = useState<SidebarSection>('chapters');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const chaptersWithScenes = useMemo(
    () => projectChapters.map((chapter) => ({ chapter, scenes: chapterScenes(chapter.id) })),
    [projectChapters, chapterScenes]
  );

  // Handlers
  const handleToggleExpand = (chapterId: string) => {
    setExpandedChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const handleAddChapter = () => {
    if (!currentProject) return;
    const newChapter = createChapter(currentProject.id, `Chapter ${projectChapters.length + 1}`);
    setCurrentChapter(newChapter.id);
    // Auto-select first scene
    const scenes = chapterScenes(newChapter.id);
    if (scenes.length > 0) setCurrentScene(scenes[0].id);
  };

  const handleAddScene = (chapterId: string) => {
    const newScene = createScene(chapterId);
    setCurrentScene(newScene.id);
    setCurrentChapter(chapterId);
    setExpandedChapters((prev) => ({ ...prev, [chapterId]: true }));
  };

  // Clicking a chapter selects it, its first scene, and expands scenes if multiple
  const handleSelectChapter = (chapterId: string) => {
    setCurrentChapter(chapterId);
    const scenes = chapterScenes(chapterId);
    if (scenes.length > 0) setCurrentScene(scenes[0].id);
    // Auto-expand if chapter has multiple scenes
    if (scenes.length > 1) {
      setExpandedChapters((prev) => ({ ...prev, [chapterId]: true }));
    }
  };

  const handleSelectScene = (chapterId: string, sceneId: string) => {
    setCurrentChapter(chapterId);
    setCurrentScene(sceneId);
  };

  const handleRenameChapter = (chapterId: string) => {
    const chapter = projectChapters.find((c) => c.id === chapterId);
    if (chapter) { setRenamingId(chapterId); setRenameValue(chapter.title); }
  };

  const handleRenameScene = (sceneId: string) => {
    for (const { scenes } of chaptersWithScenes) {
      const scene = scenes.find((s) => s.id === sceneId);
      if (scene) { setRenamingId(sceneId); setRenameValue(scene.title || ''); break; }
    }
  };

  const handleConfirmRename = () => {
    if (!renamingId || !renameValue.trim()) return;
    const isChapter = projectChapters.some((c) => c.id === renamingId);
    if (isChapter) updateChapter(renamingId, { title: renameValue });
    else updateScene(renamingId, { title: renameValue });
    setRenamingId(null);
    setRenameValue('');
  };

  const handleShowMenu = useCallback((key: string) => {
    setMenuOpen((prev) => {
      const isCurrentlyOpen = prev[key];
      // Close all menus, then toggle the requested one
      const reset: MenuOpen = {};
      if (!isCurrentlyOpen) reset[key] = true;
      return reset;
    });
  }, []);

  // Close context menu on any outside click
  useEffect(() => {
    const hasOpenMenu = Object.values(menuOpen).some(Boolean);
    if (!hasOpenMenu) return;
    const handleClickOutside = () => setMenuOpen({});
    // Use a slight delay so the toggle click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuOpen]);

  const handleChapterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = projectChapters.findIndex((c) => c.id === active.id);
      const newIndex = projectChapters.findIndex((c) => c.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && currentProject) {
        reorderChapters(currentProject.id, arrayMove(projectChapters.map((c) => c.id), oldIndex, newIndex));
      }
    }
  };

  if (!sidebarOpen || focusMode) return null;

  if (!currentProject) {
    return (
      <div className="w-full bg-[var(--color-bg-secondary)] p-4 text-center text-[var(--color-text-muted)]">
        <p className="text-sm">No project selected</p>
      </div>
    );
  }

  const isRenameScene = renamingId && !projectChapters.some((c) => c.id === renamingId);

  return (
    <aside className="w-full h-full bg-[var(--color-bg-secondary)] flex flex-col overflow-hidden">
      {/* Project header */}
      <div className="flex-shrink-0 p-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[var(--color-accent)]" />
          <h2 className="text-xs font-semibold text-[var(--color-text-primary)] truncate flex-1">
            {currentProject.title}
          </h2>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex-shrink-0 flex border-b border-[var(--color-border)]">
        {([
          { id: 'chapters' as SidebarSection, icon: Folder, label: 'Chapters' },
          { id: 'characters' as SidebarSection, icon: Users, label: 'Characters' },
          { id: 'storyboard' as SidebarSection, icon: Map, label: 'Storyboard' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[10px] font-medium uppercase tracking-wide transition-colors ${
              activeSection === tab.id
                ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeSection === 'chapters' && (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChapterDragEnd}>
              <SortableContext items={projectChapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {chaptersWithScenes.map(({ chapter, scenes }) => (
                  <div key={chapter.id} className="relative">
                    <SortableChapterItem
                      chapter={chapter}
                      isExpanded={expandedChapters[chapter.id] || false}
                      showScenes={scenes.length > 1}
                      onToggleExpand={handleToggleExpand}
                      onAddScene={handleAddScene}
                      onSelectChapter={handleSelectChapter}
                      onSelectScene={handleSelectScene}
                      onShowMenu={handleShowMenu}
                      isActive={currentChapterId === chapter.id}
                      scenes={scenes}
                      currentSceneId={currentSceneId}
                      chapterWordCount={chapterWordCount}
                    />
                    {menuOpen[`chapter-${chapter.id}`] && (
                      <ContextMenu isOpen={true} onClose={() => handleShowMenu(`chapter-${chapter.id}`)} onRename={() => handleRenameChapter(chapter.id)} onDelete={() => deleteChapter(chapter.id)} />
                    )}
                    {scenes.map((scene) =>
                      menuOpen[`scene-${scene.id}`] ? (
                        <ContextMenu key={`menu-${scene.id}`} isOpen={true} onClose={() => handleShowMenu(`scene-${scene.id}`)} onRename={() => handleRenameScene(scene.id)} onDelete={() => deleteScene(scene.id)} />
                      ) : null
                    )}
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          </>
        )}

        {activeSection === 'characters' && (
          <div className="p-4 space-y-4">
            <div className="text-center py-6">
              <Users size={32} className="mx-auto mb-3 text-[var(--color-text-muted)] opacity-50" />
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Full character profiles with genre-specific fields, relationships, and arc tracking.
              </p>
              <Link
                href={`/project/${currentProject.id}/characters`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-colors text-xs font-medium"
              >
                <Users size={14} />
                Open Characters
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        )}
        {activeSection === 'storyboard' && (
          <div className="p-4 space-y-4">
            <div className="text-center py-6">
              <Map size={32} className="mx-auto mb-3 text-[var(--color-text-muted)] opacity-50" />
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Visual corkboard and beat sheet templates (3-Act, Save the Cat, Hero&apos;s Journey).
              </p>
              <Link
                href={`/project/${currentProject.id}/storyboard`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs font-medium"
              >
                <Map size={14} />
                Open Storyboard
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex-shrink-0 px-2 py-2 border-t border-[var(--color-border)] space-y-1.5">
        {activeSection === 'chapters' && (
          <button
            onClick={handleAddChapter}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-colors text-xs font-medium"
          >
            <Plus size={14} />
            Add Chapter
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] rounded-lg transition-colors text-xs"
          >
            <Download size={12} />
            Export
          </button>
        )}
      </div>

      {/* Rename Modal */}
      {renamingId && (
        <RenameModal
          title={isRenameScene ? 'Rename Scene' : 'Rename Chapter'}
          value={renameValue}
          onChange={setRenameValue}
          onConfirm={handleConfirmRename}
          onCancel={() => setRenamingId(null)}
        />
      )}
    </aside>
  );
}
