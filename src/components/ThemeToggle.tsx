'use client';

import { Sun, Moon } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function ThemeToggle() {
  const { toggleDarkMode, darkMode } = useStore();

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors duration-200"
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle dark mode"
    >
      {darkMode ? (
        <Sun className="w-5 h-5 text-amber-500 transition-transform duration-300" strokeWidth={2} />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 transition-transform duration-300" strokeWidth={2} />
      )}
    </button>
  );
}
