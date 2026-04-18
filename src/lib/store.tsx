'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project, Chapter, Scene } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface StoreState {
  projects: Project[];
  currentProjectId: string | null;
  currentChapterId: string | null;
  currentSceneId: string | null;
  darkMode: boolean;
  sidebarOpen: boolean;
  focusMode: boolean;
  _dataVersion: number; // bumped on every chapter/scene mutation to invalidate memos
}

type StoreAction =
  | { type: 'INIT'; payload: StoreState }
  | { type: 'CREATE_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'CREATE_CHAPTER'; payload: Chapter }
  | { type: 'UPDATE_CHAPTER'; payload: { id: string; updates: Partial<Chapter> } }
  | { type: 'DELETE_CHAPTER'; payload: string }
  | { type: 'REORDER_CHAPTERS'; payload: { projectId: string; chapterIds: string[] } }
  | { type: 'CREATE_SCENE'; payload: Scene }
  | { type: 'UPDATE_SCENE'; payload: { id: string; updates: Partial<Scene> } }
  | { type: 'DELETE_SCENE'; payload: string }
  | { type: 'REORDER_SCENES'; payload: { chapterId: string; sceneIds: string[] } }
  | { type: 'SET_CURRENT_PROJECT'; payload: string | null }
  | { type: 'SET_CURRENT_CHAPTER'; payload: string | null }
  | { type: 'SET_CURRENT_SCENE'; payload: string | null }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_FOCUS_MODE' };

interface StoreContextValue extends StoreState {
  // Project actions
  createProject: (title: string, genre?: string) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Chapter actions
  createChapter: (projectId: string, title: string) => Chapter;
  updateChapter: (id: string, updates: Partial<Chapter>) => void;
  deleteChapter: (id: string) => void;
  reorderChapters: (projectId: string, chapterIds: string[]) => void;

  // Scene actions
  createScene: (chapterId: string, title?: string) => Scene;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  deleteScene: (id: string) => void;
  reorderScenes: (chapterId: string, sceneIds: string[]) => void;

  // Navigation actions
  setCurrentProject: (id: string | null) => void;
  setCurrentChapter: (id: string | null) => void;
  setCurrentScene: (id: string | null) => void;

  // UI actions
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;

  // Computed values
  currentProject: Project | null;
  currentChapter: Chapter | null;
  currentScene: Scene | null;
  projectChapters: Chapter[];
  chapterScenes: (chapterId: string) => Scene[];
  projectWordCount: number;
  chapterWordCount: (chapterId: string) => number;
}

// ============================================================================
// Context
// ============================================================================

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

// ============================================================================
// Initial state
// ============================================================================

// Safe localStorage wrappers for SSR
function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch { /* noop */ }
}

const initialState: StoreState = {
  projects: [],
  currentProjectId: null,
  currentChapterId: null,
  currentSceneId: null,
  darkMode: false,
  sidebarOpen: true,
  focusMode: false,
  _dataVersion: 0,
};

// ============================================================================
// Reducer
// ============================================================================

function storeReducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'INIT':
      return action.payload;

    case 'CREATE_PROJECT': {
      return {
        ...state,
        projects: [...state.projects, action.payload],
      };
    }

    case 'UPDATE_PROJECT': {
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.id
            ? { ...p, ...action.payload.updates }
            : p
        ),
      };
    }

    case 'DELETE_PROJECT': {
      const deletedProjectId = action.payload;
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== deletedProjectId),
        currentProjectId:
          state.currentProjectId === deletedProjectId
            ? null
            : state.currentProjectId,
        currentChapterId: null,
        currentSceneId: null,
      };
    }

    case 'CREATE_CHAPTER': {
      return { ...state, _dataVersion: state._dataVersion + 1 };
    }

    case 'UPDATE_CHAPTER': {
      return { ...state, _dataVersion: state._dataVersion + 1 };
    }

    case 'DELETE_CHAPTER': {
      const deletedChapterId = action.payload;
      return {
        ...state,
        _dataVersion: state._dataVersion + 1,
        currentChapterId:
          state.currentChapterId === deletedChapterId
            ? null
            : state.currentChapterId,
        currentSceneId: null,
      };
    }

    case 'REORDER_CHAPTERS': {
      return { ...state, _dataVersion: state._dataVersion + 1 };
    }

    case 'CREATE_SCENE': {
      return { ...state, _dataVersion: state._dataVersion + 1 };
    }

    case 'UPDATE_SCENE': {
      return { ...state, _dataVersion: state._dataVersion + 1 };
    }

    case 'DELETE_SCENE': {
      const deletedSceneId = action.payload;
      return {
        ...state,
        _dataVersion: state._dataVersion + 1,
        currentSceneId:
          state.currentSceneId === deletedSceneId
            ? null
            : state.currentSceneId,
      };
    }

    case 'REORDER_SCENES': {
      return { ...state, _dataVersion: state._dataVersion + 1 };
    }

    case 'SET_CURRENT_PROJECT':
      return {
        ...state,
        currentProjectId: action.payload,
        currentChapterId: null,
        currentSceneId: null,
      };

    case 'SET_CURRENT_CHAPTER':
      return {
        ...state,
        currentChapterId: action.payload,
        currentSceneId: null,
      };

    case 'SET_CURRENT_SCENE':
      return {
        ...state,
        currentSceneId: action.payload,
      };

    case 'TOGGLE_DARK_MODE':
      return {
        ...state,
        darkMode: !state.darkMode,
      };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };

    case 'TOGGLE_FOCUS_MODE':
      return {
        ...state,
        focusMode: !state.focusMode,
      };

    default:
      return state;
  }
}

// ============================================================================
// Storage utilities
// ============================================================================

const STORAGE_KEY = 'prosecraft-store';

function loadStateFromStorage(): StoreState {
  if (typeof window === 'undefined') {
    return initialState;
  }

  try {
    const stored = safeGetItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure dates are properly reconstructed
      return {
        ...parsed,
        projects: (parsed.projects || []).map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        })),
      };
    }
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
  }

  return initialState;
}

function saveStateToStorage(state: StoreState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    safeSetItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state to localStorage:', error);
  }
}

// ============================================================================
// Provider Component
// ============================================================================


// Helper: generate next unique chapter title for a project
function getNextChapterTitle(projectId: string): string {
  const chapters = JSON.parse(safeGetItem('prosecraft-chapters') || '{}');
  const projectChapters = Object.values(chapters).filter(
    (c: any) => c.projectId === projectId
  );
  const existingNums = projectChapters
    .map((c: any) => {
      const match = c.title.match(/^Chapter\s+(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n: number) => n > 0);
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  return `Chapter ${nextNum}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(storeReducer, initialState);
  // Hydrate from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = loadStateFromStorage();
    if (stored !== initialState) {
      dispatch({ type: 'INIT', payload: stored });
    }
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Apply dark mode class to document element
  useEffect(() => {
    const root = document.documentElement;
    if (state.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.darkMode]);

  // ========================================================================
  // Action creators
  // ========================================================================

  const createProject = useCallback(
    (title: string, genre: string = 'Fiction'): Project => {
      const projectId = uuidv4();
      const chapterId = uuidv4();
      const sceneId = uuidv4();

      const now = new Date();

      const project: Project = {
        id: projectId,
        title,
        genre,
        description: '',
        wordCountGoal: 50000,
        createdAt: now,
        updatedAt: now,
      };

      const chapter: Chapter = {
        id: chapterId,
        projectId,
        title: getNextChapterTitle(projectId),
        sortOrder: 0,
        createdAt: now,
      };

      const scene: Scene = {
        id: sceneId,
        chapterId,
        title: 'Scene 1',
        content: '',
        wordCount: 0,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      };

      dispatch({ type: 'CREATE_PROJECT', payload: project });

      // Store chapters and scenes in a separate structure
      const chapters = JSON.parse(
        safeGetItem('prosecraft-chapters') || '{}'
      );
      const scenes = JSON.parse(
        safeGetItem('prosecraft-scenes') || '{}'
      );

      chapters[chapterId] = chapter;
      scenes[sceneId] = scene;

      safeSetItem('prosecraft-chapters', JSON.stringify(chapters));
      safeSetItem('prosecraft-scenes', JSON.stringify(scenes));

      return project;
    },
    []
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      dispatch({
        type: 'UPDATE_PROJECT',
        payload: {
          id,
          updates: {
            ...updates,
            updatedAt: new Date(),
          },
        },
      });
    },
    []
  );

  const deleteProject = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });

    // Clean up associated chapters and scenes
    const chapters = JSON.parse(
      safeGetItem('prosecraft-chapters') || '{}'
    );
    const scenes = JSON.parse(
      safeGetItem('prosecraft-scenes') || '{}'
    );

    Object.keys(chapters).forEach((chapterId) => {
      if (chapters[chapterId].projectId === id) {
        delete chapters[chapterId];
      }
    });

    Object.keys(scenes).forEach((sceneId) => {
      if (
        chapters[scenes[sceneId].chapterId]?.projectId === id
      ) {
        delete scenes[sceneId];
      }
    });

    safeSetItem('prosecraft-chapters', JSON.stringify(chapters));
    safeSetItem('prosecraft-scenes', JSON.stringify(scenes));
  }, []);

  const createChapter = useCallback(
    (projectId: string, title: string): Chapter => {
      const chapterId = uuidv4();
      const sceneId = uuidv4();
      const now = new Date();

      const chapters = JSON.parse(
        safeGetItem('prosecraft-chapters') || '{}'
      );
      const scenes = JSON.parse(
        safeGetItem('prosecraft-scenes') || '{}'
      );

      const sortOrder = Object.values(chapters).filter(
        (c: any) => c.projectId === projectId
      ).length;

      const chapter: Chapter = {
        id: chapterId,
        projectId,
        title,
        sortOrder,
        createdAt: now,
      };

      const scene: Scene = {
        id: sceneId,
        chapterId,
        title: 'Scene 1',
        content: '',
        wordCount: 0,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      };

      chapters[chapterId] = chapter;
      scenes[sceneId] = scene;

      safeSetItem('prosecraft-chapters', JSON.stringify(chapters));
      safeSetItem('prosecraft-scenes', JSON.stringify(scenes));

      dispatch({ type: 'CREATE_CHAPTER', payload: chapter });

      return chapter;
    },
    []
  );

  const updateChapter = useCallback(
    (id: string, updates: Partial<Chapter>) => {
      const chapters = JSON.parse(
        safeGetItem('prosecraft-chapters') || '{}'
      );

      if (chapters[id]) {
        chapters[id] = { ...chapters[id], ...updates };
        safeSetItem('prosecraft-chapters', JSON.stringify(chapters));
      }

      dispatch({ type: 'UPDATE_CHAPTER', payload: { id, updates } });
    },
    []
  );

  const deleteChapter = useCallback((id: string) => {
    const chapters = JSON.parse(
      safeGetItem('prosecraft-chapters') || '{}'
    );
    const scenes = JSON.parse(
      safeGetItem('prosecraft-scenes') || '{}'
    );

    delete chapters[id];

    Object.keys(scenes).forEach((sceneId) => {
      if (scenes[sceneId].chapterId === id) {
        delete scenes[sceneId];
      }
    });

    safeSetItem('prosecraft-chapters', JSON.stringify(chapters));
    safeSetItem('prosecraft-scenes', JSON.stringify(scenes));

    dispatch({ type: 'DELETE_CHAPTER', payload: id });
  }, []);

  const reorderChapters = useCallback(
    (projectId: string, chapterIds: string[]) => {
      const chapters = JSON.parse(
        safeGetItem('prosecraft-chapters') || '{}'
      );

      chapterIds.forEach((chapterId, index) => {
        if (chapters[chapterId]) {
          chapters[chapterId].sortOrder = index;
        }
      });

      safeSetItem('prosecraft-chapters', JSON.stringify(chapters));

      dispatch({
        type: 'REORDER_CHAPTERS',
        payload: { projectId, chapterIds },
      });
    },
    []
  );

  const createScene = useCallback(
    (chapterId: string, title: string = 'New Scene'): Scene => {
      const sceneId = uuidv4();
      const now = new Date();

      const scenes = JSON.parse(
        safeGetItem('prosecraft-scenes') || '{}'
      );

      const sortOrder = Object.values(scenes).filter(
        (s: any) => s.chapterId === chapterId
      ).length;

      const scene: Scene = {
        id: sceneId,
        chapterId,
        title,
        content: '',
        wordCount: 0,
        sortOrder,
        createdAt: now,
        updatedAt: now,
      };

      scenes[sceneId] = scene;

      safeSetItem('prosecraft-scenes', JSON.stringify(scenes));

      dispatch({ type: 'CREATE_SCENE', payload: scene });

      return scene;
    },
    []
  );

  const updateScene = useCallback(
    (id: string, updates: Partial<Scene>) => {
      const scenes = JSON.parse(
        safeGetItem('prosecraft-scenes') || '{}'
      );

      if (scenes[id]) {
        scenes[id] = {
          ...scenes[id],
          ...updates,
          updatedAt: new Date(),
        };
        safeSetItem('prosecraft-scenes', JSON.stringify(scenes));
      }

      dispatch({ type: 'UPDATE_SCENE', payload: { id, updates } });
    },
    []
  );

  const deleteScene = useCallback((id: string) => {
    const scenes = JSON.parse(
      safeGetItem('prosecraft-scenes') || '{}'
    );

    delete scenes[id];

    safeSetItem('prosecraft-scenes', JSON.stringify(scenes));

    dispatch({ type: 'DELETE_SCENE', payload: id });
  }, []);

  const reorderScenes = useCallback(
    (chapterId: string, sceneIds: string[]) => {
      const scenes = JSON.parse(
        safeGetItem('prosecraft-scenes') || '{}'
      );

      sceneIds.forEach((sceneId, index) => {
        if (scenes[sceneId]) {
          scenes[sceneId].sortOrder = index;
        }
      });

      safeSetItem('prosecraft-scenes', JSON.stringify(scenes));

      dispatch({
        type: 'REORDER_SCENES',
        payload: { chapterId, sceneIds },
      });
    },
    []
  );

  const setCurrentProject = useCallback((id: string | null) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: id });
  }, []);

  const setCurrentChapter = useCallback((id: string | null) => {
    dispatch({ type: 'SET_CURRENT_CHAPTER', payload: id });
  }, []);

  const setCurrentScene = useCallback((id: string | null) => {
    dispatch({ type: 'SET_CURRENT_SCENE', payload: id });
  }, []);

  const toggleDarkMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_DARK_MODE' });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const toggleFocusMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_FOCUS_MODE' });
  }, []);

  // ========================================================================
  // Computed values
  // ========================================================================

  const chapters = useMemo(() => {
    const stored = JSON.parse(
      safeGetItem('prosecraft-chapters') || '{}'
    );
    return stored;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state._dataVersion]);

  const allScenes = useMemo(() => {
    const stored = JSON.parse(
      safeGetItem('prosecraft-scenes') || '{}'
    );
    return stored;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state._dataVersion]);

  const currentProject = useMemo(
    () =>
      state.currentProjectId
        ? state.projects.find((p) => p.id === state.currentProjectId) || null
        : null,
    [state.currentProjectId, state.projects]
  );

  const currentChapter = useMemo(
    (): Chapter | null =>
      state.currentChapterId
        ? (Object.values(chapters) as Chapter[]).find(
            (c) => c.id === state.currentChapterId
          ) || null
        : null,
    [state.currentChapterId, chapters]
  );

  const currentScene = useMemo(
    (): Scene | null =>
      state.currentSceneId
        ? (Object.values(allScenes) as Scene[]).find(
            (s) => s.id === state.currentSceneId
          ) || null
        : null,
    [state.currentSceneId, allScenes]
  );

  const projectChapters = useMemo(
    (): Chapter[] =>
      state.currentProjectId
        ? (Object.values(chapters) as Chapter[])
            .filter((c) => c.projectId === state.currentProjectId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [state.currentProjectId, chapters]
  );

  const chapterScenes = useCallback(
    (chapterId: string): Scene[] => {
      return (Object.values(allScenes) as Scene[])
        .filter((s) => s.chapterId === chapterId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    [allScenes]
  );

  const projectWordCount = useMemo(() => {
    if (!state.currentProjectId) return 0;

    const projectChapterIds = Object.values(chapters)
      .filter((c: any) => c.projectId === state.currentProjectId)
      .map((c: any) => c.id);

    return Object.values(allScenes)
      .filter((s: any) => projectChapterIds.includes(s.chapterId))
      .reduce((sum: number, s: any) => sum + (s.wordCount || 0), 0);
  }, [state.currentProjectId, chapters, allScenes]);

  const chapterWordCount = useCallback(
    (chapterId: string): number => {
      return Object.values(allScenes)
        .filter((s: any) => s.chapterId === chapterId)
        .reduce((sum: number, s: any) => sum + (s.wordCount || 0), 0);
    },
    [allScenes]
  );

  const value: StoreContextValue = {
    ...state,
    currentProject,
    currentChapter,
    currentScene,
    projectChapters,
    chapterScenes,
    projectWordCount,
    chapterWordCount,
    createProject,
    updateProject,
    deleteProject,
    createChapter,
    updateChapter,
    deleteChapter,
    reorderChapters,
    createScene,
    updateScene,
    deleteScene,
    reorderScenes,
    setCurrentProject,
    setCurrentChapter,
    setCurrentScene,
    toggleDarkMode,
    toggleSidebar,
    toggleFocusMode,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);

  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }

  return context;
}
