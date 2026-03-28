'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
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
  [key: string]: boolean; // key: "chapter-{id}" or "scene-{id}"
}

// ============================================================================
// Sortable Chapter Item
// ============================================================================

function SortableChapterItem({
  chapter,
  isExpanded,
  onToggleExpand,
  onAddScene,
  onSelectScene,
  onShowMenu,
  isActive: _isActive,
  scenes,
  currentSceneId,
  chapterWordCount,
}: {
  chapter: Chapter;
  isExpanded: boolean;
  onToggleExpand: (chapterId: string) => void;
  onAddScene: (chapterId: string) => void;
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
      className="space-y-0"
    >
      <div
        className="flex items-center gap-1 px-3 py-2 text-sm hover:bg-[var(--color-surface)] rounded group"
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
        >
          <GripVertical size={14} className="text-[var(--color-text-muted)]" />
        </button>

        {/* Expand toggle */}
        <button
          onClick={() => onToggleExpand(chapter.id)}
          className="p-1 -ml-1 hover:bg-[var(--color-surface-alt)] rounded"
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />
          ) : (
            <ChevronRight size={16} className="text-[var(--color-text-secondary)]" />
          )}
        </button>

        {/* Folder icon */}
        <Folder size={16} className="text-[var(--color-text-secondary)] flex-shrink-0" />

        {/* Chapter title and word count */}
        <span className="flex-1 font-medium text-[var(--color-text-primary)] truncate">
          {chapter.title}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
          {chapterWordCount(chapter.id)} words
        </span>

        {/* Menu button */}
        <button
          onClick={() => onShowMenu(`chapter-${chapter.id}`)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--color-surface-alt)] rounded"
        >
          <MoreHorizontal size={14} className="text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Scenes list */}
      {isExpanded && (
        <div className="space-y-0 pl-6">
          {scenes.map((scene) => (
            <SceneItem
              key={scene.id}
              scene={scene}
              isActive={currentSceneId === scene.id}
              onSelect={() => onSelectScene(chapter.id, scene.id)}
              onShowMenu={(key) => onShowMenu(key)}
            />
          ))}

          {/* Add scene button */}
          <button
            onClick={() => onAddScene(chapter.id)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] rounded transition-colors"
          >
            <Plus size={14} />
            Add Scene
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Scene Item
// ============================================================================

function SceneItem({
  scene,
  isActive,
  onSelect,
  onShowMenu,
}: {
  scene: Scene;
  isActive: boolean;
  onSelect: () => void;
  onShowMenu: (key: string) => void;
}) {
  const sortable = useSortable({ id: scene.id });
  const { isDragging } = sortable;

  return (
    <button
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        onShowMenu(`scene-${scene.id}`);
      }}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors group ${
        isActive
          ? 'bg-[var(--color-accent-light)] text-[var(--color-accent-dark)] font-medium'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
      }`}
    >
      {/* Drag handle */}
      <button
        {...sortable.listeners}
        {...sortable.attributes}
        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 -ml-1"
        title="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={12} className="text-[var(--color-text-muted)]" />
      </button>

      <FileText
        size={14}
        className={isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}
        aria-hidden
      />
      <span className="flex-1 truncate text-left">
        {scene.title || 'Untitled Scene'}
      </span>
      <span className={`text-xs flex-shrink-0 ${isActive ? 'font-medium' : 'text-[var(--color-text-muted)]'}`}>
        {scene.wordCount} words
      </span>

      {/* Menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onShowMenu(`scene-${scene.id}`);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--color-surface-alt)] rounded"
        title="Scene menu"
      >
        <MoreHorizontal size={14} className="text-[var(--color-text-muted)]" />
      </button>
    </button>
  );
}

// ============================================================================
// Context Menu Dropdown
// ============================================================================

function ContextMenu({
  isOpen,
  onClose,
  onRename,
  onDelete,
  type: _type,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  type: 'chapter' | 'scene';
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded shadow-lg z-50 min-w-[120px]">
      <button
        onClick={() => {
          onRename();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
      >
        Rename
      </button>
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50/50"
      >
        Delete
      </button>
    </div>
  );
}

// ============================================================================
// Main Sidebar Component
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
    reorderChapters,
    chapterWordCount,
  } = useStore();

  const [expandedChapters, setExpandedChapters] = useState<ExpandedChapters>({});
  const [menuOpen, setMenuOpen] = useState<MenuOpen>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoized scenes for each chapter
  const chaptersWithScenes = useMemo(
    () =>
      projectChapters.map((chapter) => ({
        chapter,
        scenes: chapterScenes(chapter.id),
      })),
    [projectChapters, chapterScenes]
  );

  // Handlers
  const handleToggleExpand = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const handleAddChapter = () => {
    if (!currentProject) return;
    const newChapter = createChapter(currentProject.id, `Chapter ${projectChapters.length + 1}`);
    setCurrentChapter(newChapter.id);
    setExpandedChapters((prev) => ({
      ...prev,
      [newChapter.id]: true,
    }));
  };

  const handleAddScene = (chapterId: string) => {
    const newScene = createScene(chapterId);
    setCurrentScene(newScene.id);
    setCurrentChapter(chapterId);
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: true,
    }));
  };

  const handleSelectScene = (chapterId: string, sceneId: string) => {
    setCurrentChapter(chapterId);
    setCurrentScene(sceneId);
  };

  const handleRenameChapter = (chapterId: string) => {
    const chapter = projectChapters.find((c) => c.id === chapterId);
    if (chapter) {
      setRenamingId(chapterId);
      setRenameValue(chapter.title);
    }
  };

  const handleConfirmRename = () => {
    if (!renamingId || !renameValue.trim()) return;

    const isChapter = projectChapters.some((c) => c.id === renamingId);
    if (isChapter) {
      updateChapter(renamingId, { title: renameValue });
    } else {
      updateScene(renamingId, { title: renameValue });
    }

    setRenamingId(null);
    setRenameValue('');
  };

  const handleDeleteChapter = (chapterId: string) => {
    deleteChapter(chapterId);
  };


  const handleShowMenu = (key: string) => {
    setMenuOpen((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleChapterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = projectChapters.findIndex((c) => c.id === active.id);
      const newIndex = projectChapters.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newChapterIds = arrayMove(
          projectChapters.map((c) => c.id),
          oldIndex,
          newIndex
        );
        if (currentProject) {
          reorderChapters(currentProject.id, newChapterIds);
        }
      }
    }
  };

  // Don't render if sidebar is closed or focus mode is on
  if (!sidebarOpen || focusMode) {
    return null;
  }

  // Don't render if no project is selected
  if (!currentProject) {
    return (
      <div className="w-[260px] bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] p-4 text-center text-[var(--color-text-muted)]">
        <p className="text-sm">No project selected</p>
      </div>
    );
  }

  return (
    <aside className="w-[260px] h-screen bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col overflow-hidden transition-all duration-200">
      {/* Project header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={16} className="text-[var(--color-text-secondary)]" />
          <h2 className="font-semibold text-[var(--color-text-primary)] truncate flex-1">
            {currentProject.title}
          </h2>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          {projectChapters.length} chapters
        </p>
      </div>

      {/* Chapters list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleChapterDragEnd}
        >
          <SortableContext
            items={projectChapters.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {chaptersWithScenes.map(({ chapter, scenes }) => (
              <div key={chapter.id} className="relative">
                <SortableChapterItem
                  chapter={chapter}
                  isExpanded={expandedChapters[chapter.id] || false}
                  onToggleExpand={handleToggleExpand}
                  onAddScene={handleAddScene}
                  onSelectScene={handleSelectScene}
                  onShowMenu={handleShowMenu}
                  isActive={currentChapterId === chapter.id}
                  scenes={scenes}
                  currentSceneId={currentSceneId}
                  chapterWordCount={chapterWordCount}
                />

                {/* Chapter context menu */}
                {menuOpen[`chapter-${chapter.id}`] && (
                  <ContextMenu
                    isOpen={true}
                    onClose={() => handleShowMenu(`chapter-${chapter.id}`)}
                    onRename={() => handleRenameChapter(chapter.id)}
                    onDelete={() => handleDeleteChapter(chapter.id)}
                    type="chapter"
                  />
                )}

                {/* Rename input for chapter */}
                {renamingId === chapter.id && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--color-bg-primary)] rounded shadow-lg p-4 max-w-sm">
                      <h3 className="font-semibold mb-3 text-[var(--color-text-primary)]">
                        Rename Chapter
                      </h3>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        autoFocus
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded mb-3 bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleConfirmRename}
                          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-dark)] text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="px-4 py-2 bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] rounded hover:bg-[var(--color-border)] text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </SortableContext>
        </DndContext>

        {/* Rename input for scene */}
        {renamingId && !projectChapters.some((c) => c.id === renamingId) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[var(--color-bg-primary)] rounded shadow-lg p-4 max-w-sm">
              <h3 className="font-semibold mb-3 text-[var(--color-text-primary)]">
                Rename Scene
              </h3>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmRename();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                autoFocus
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded mb-3 bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmRename}
                  className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-dark)] text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setRenamingId(null)}
                  className="px-4 py-2 bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] rounded hover:bg-[var(--color-border)] text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex-shrink-0 px-2 py-2 border-t border-[var(--color-border)] space-y-2">
        <button
          onClick={handleAddChapter}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Chapter
        </button>

        {/* Export button */}
        <button
          onClick={onExport}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] rounded transition-colors text-sm"
          title="Export project"
        >
          <Download size={16} />
          Export
        </button>
      </div>
    </aside>
  );
}
