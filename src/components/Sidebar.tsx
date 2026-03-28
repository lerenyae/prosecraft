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
  Link as LinkIcon,
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
} from '@dnd-kit/sortable';
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
  const { useSortable } = require('@dnd-kit/sortable');
  const { CSS } = require('@dnd-kit/utilities');
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
        className="flex items-center gap-1 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded group"
        onContextMenu={(e) => {
          e.preventDefault();
          onShowMenu(`chapter-${chapter.id}`);
        }}
      >
        {/* Drag handle */}
        <button
          {...sortable.attributes.listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 -ml-1"
          title="Drag to reorder"
        >
          <GripVertical size={14} className="text-slate-400" />
        </button>

        {/* Expand toggle */}
        <button
          onClick={() => onToggleExpand(chapter.id)}
          className="p-1 -ml-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-slate-600 dark:text-slate-300" />
          ) : (
            <ChevronRight size={16} className="text-slate-600 dark:text-slate-300" />
          )}
        </button>

        {/* Folder icon */}
        <Folder size={16} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />

        {/* Chapter title and word count */}
        <span className="flex-1 font-medium text-slate-900 dark:text-slate-100 truncate">
          {chapter.title}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
          {chapterWordCount(chapter.id)} words
        </span>

        {/* Menu button */}
        <button
          onClick={() => onShowMenu(`chapter-${chapter.id}`)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
        >
          <MoreHorizontal size={14} className="text-slate-400" />
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
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
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
  return (
    <button
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        onShowMenu(`scene-${scene.id}`);
      }}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors group ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-medium'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <FileText
        size={14}
        className={isActive ? 'text-blue-600 dark:text-blue-300' : 'text-slate-400'}
        aria-hidden
      />
      <span className="flex-1 truncate text-left">
        {scene.title || 'Untitled Scene'}
      </span>
      <span className={`text-xs flex-shrink-0 ${isActive ? 'font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
        {scene.wordCount} words
      </span>

      {/* Menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onShowMenu(`scene-${scene.id}`);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
        title="Scene menu"
      >
        <MoreHorizontal size={14} className="text-slate-400" />
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
    <div className="absolute right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-lg z-50 min-w-[120px]">
      <button
        onClick={() => {
          onRename();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
      >
        Rename
      </button>
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        Delete
      </button>
    </div>
  );
}

// ============================================================================
// Main Sidebar Component
// ============================================================================

export default function Sidebar() {
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
    projectWordCount,
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
      <div className="w-[260px] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 p-4 text-center text-slate-500 dark:text-slate-400">
        <p className="text-sm">No project selected</p>
      </div>
    );
  }

  return (
    <aside className="w-[260px] h-screen bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-200">
      {/* Project header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={16} className="text-slate-600 dark:text-slate-300" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">
            {currentProject.title}
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
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
                    <div className="bg-white dark:bg-slate-800 rounded shadow-lg p-4 max-w-sm">
                      <h3 className="font-semibold mb-3 text-slate-900 dark:text-slate-100">
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
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded mb-3 dark:bg-slate-700 dark:text-slate-100"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleConfirmRename}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded hover:bg-slate-300 dark:hover:bg-slate-600 text-sm"
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
            <div className="bg-white dark:bg-slate-800 rounded shadow-lg p-4 max-w-sm">
              <h3 className="font-semibold mb-3 text-slate-900 dark:text-slate-100">
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
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded mb-3 dark:bg-slate-700 dark:text-slate-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmRename}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setRenamingId(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded hover:bg-slate-300 dark:hover:bg-slate-600 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add chapter button */}
      <div className="flex-shrink-0 px-2 py-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <button
          onClick={handleAddChapter}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Chapter
        </button>

        {/* Project stats and back button */}
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div>
            <span className="font-medium">{projectWordCount}</span> words
          </div>
          <a
            href="/"
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <LinkIcon size={12} />
            Back to Dashboard
          </a>
        </div>
      </div>
    </aside>
  );
}
