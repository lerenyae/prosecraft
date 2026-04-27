'use client';

import { createContext, useCallback, useContext, useState, useMemo } from 'react';

/**
 * StudioContext shares state across the studio shell components
 * (Sidebar, Editor in middle column, AIPanel on right).
 *
 * Keeping the surface deliberately small — just what AI hooks need.
 */
type StudioState = {
  chapterText: string;
  chapterTitle: string;
  projectTitle: string;
  setChapterContext: (next: {
    text: string;
    chapterTitle: string;
    projectTitle: string;
  }) => void;
};

const StudioContext = createContext<StudioState | null>(null);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [chapterText, setChapterText] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [projectTitle, setProjectTitle] = useState('');

  const setChapterContext = useCallback(
    (next: { text: string; chapterTitle: string; projectTitle: string }) => {
      setChapterText(next.text);
      setChapterTitle(next.chapterTitle);
      setProjectTitle(next.projectTitle);
    },
    []
  );

  const value = useMemo<StudioState>(
    () => ({ chapterText, chapterTitle, projectTitle, setChapterContext }),
    [chapterText, chapterTitle, projectTitle, setChapterContext]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudioContext(): StudioState {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error('useStudioContext must be used inside <StudioProvider>');
  }
  return ctx;
}
