'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Menu, ArrowLeft, Eye, BarChart3, MessageSquareText } from 'lucide-react';
import Editor from '@/components/Editor';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { FeedbackPanel } from '@/components/FeedbackPanel';

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const {
    setCurrentProject,
    currentProject,
    toggleSidebar,
    sidebarOpen,
    toggleFocusMode,
    focusMode,
    projectWordCount,
  } = useStore();
  const router = useRouter();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    setCurrentProject(params.id);
  }, [params.id, setCurrentProject]);

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Project not found</h1>
          <p className="text-[var(--color-text-secondary)] mb-6">
            This manuscript could not be loaded.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:bg-[var(--color-accent-dark)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Top Bar */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <div className="flex items-center justify-between px-4 py-3 gap-4">
          {/* Left: Sidebar Toggle & Dashboard Link */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors"
              title="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Center: Project Title (Editable) */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold truncate">
              {currentProject.title}
            </h1>
          </div>

          {/* Right: Stats, Buttons, Theme Toggle */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Word Count */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-alt)] rounded-lg">
              <BarChart3 className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-sm font-medium">
                {projectWordCount.toLocaleString()} words
              </span>
            </div>

            {/* AI Feedback Button */}
            <button
              onClick={() => setFeedbackOpen(!feedbackOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                feedbackOpen
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)]'
              }`}
              title="Get AI feedback on current chapter"
            >
              <MessageSquareText className="w-4 h-4" />
              <span className="hidden sm:inline">Feedback</span>
            </button>

            {/* Focus Mode Toggle */}
            <button
              onClick={toggleFocusMode}
              className={`p-2 rounded-lg transition-colors ${
                focusMode
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                  : 'hover:bg-[var(--color-surface-alt)]'
              }`}
              title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
            >
              <Eye className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar + Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Hidden on mobile by store state */}
        {sidebarOpen && (
          <div className="flex-shrink-0 w-64 border-r border-[var(--color-border)] overflow-hidden">
            <Sidebar />
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor />
        </div>

        {/* AI Feedback Panel */}
        <FeedbackPanel
          isOpen={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
        />
      </div>
    </div>
  );
}
