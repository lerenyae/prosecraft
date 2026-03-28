'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  Menu,
  ArrowLeft,
  Eye,
  BarChart3,
  Brain,
} from 'lucide-react';
import Editor from '@/components/Editor';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import InsightsPanel from '@/components/InsightsPanel';
import BetaReaderPanel from '@/components/BetaReaderPanel';

// ============================================================================
// Types
// ============================================================================

type PanelTab = 'insights' | 'beta-reader';

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

// ============================================================================
// Tool Strip (vertical icon bar on right edge)
// ============================================================================

function ToolStrip({
  activeTab,
  onTabChange,
}: {
  activeTab: PanelTab | null;
  onTabChange: (tab: PanelTab | null) => void;
}) {
  const tools: { id: PanelTab; icon: typeof BarChart3; label: string }[] = [
    { id: 'insights', icon: BarChart3, label: 'Insights' },
    { id: 'beta-reader', icon: Brain, label: 'Beta Reader' },
  ];

  return (
    <div className="flex flex-col items-center w-12 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] py-3 gap-1 flex-shrink-0">
      {tools.map(tool => {
        const Icon = tool.icon;
        const isActive = activeTab === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onTabChange(isActive ? null : tool.id)}
            className={`relative group flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]'
            }`}
            title={tool.label}
          >
            <Icon size={18} />
            {/* Tooltip */}
            <div className="absolute right-full mr-2 px-2 py-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-[11px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-sm">
              {tool.label}
            </div>
            {/* Active indicator */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[5px] w-[3px] h-4 rounded-r-full bg-[var(--color-accent)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Right Panel Container
// ============================================================================

function RightPanel({
  activeTab,
  selectedText,
  onAnnotationClick,
}: {
  activeTab: PanelTab | null;
  selectedText: string;
  onAnnotationClick: (quote: string) => void;
}) {
  if (!activeTab) return null;

  return (
    <div className="flex-shrink-0 w-[320px] border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] flex-shrink-0">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          {activeTab === 'insights' ? 'Insights' : 'Beta Reader'}
        </span>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'insights' && <InsightsPanel />}
        {activeTab === 'beta-reader' && (
          <BetaReaderPanel
            selectedText={selectedText}
            onAnnotationClick={onAnnotationClick}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Project Page
// ============================================================================

export default function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = use(params);
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

  const [activePanel, setActivePanel] = useState<PanelTab | null>(null);
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    setCurrentProject(resolvedParams.id);
  }, [resolvedParams.id, setCurrentProject]);

  const handleSelectionChange = useCallback((text: string) => {
    setSelectedText(text);
    // Auto-switch to beta reader when text is selected
    if (text.length > 10 && activePanel !== 'beta-reader') {
      setActivePanel('beta-reader');
    }
  }, [activePanel]);

  const handleAnnotationClick = useCallback((quote: string) => {
    // TODO: scroll editor to the matching quote
    console.log('Navigate to:', quote);
  }, []);

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
      {!focusMode && (
        <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
          <div className="flex items-center justify-between px-4 py-2.5 gap-4">
            {/* Left */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors"
                title="Toggle sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors"
                title="Back to dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
              <h1 className="text-sm font-semibold truncate max-w-[200px]">
                {currentProject.title}
              </h1>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Word Count */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-surface-alt)] rounded-md">
                <BarChart3 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span className="text-xs font-medium">
                  {projectWordCount.toLocaleString()}
                </span>
              </div>

              {/* Focus Mode */}
              <button
                onClick={toggleFocusMode}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--color-surface-alt)]"
                title="Focus mode"
              >
                <Eye className="w-4 h-4" />
              </button>

              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      {/* Focus mode exit button */}
      {focusMode && (
        <button
          onClick={toggleFocusMode}
          className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors shadow-sm"
          title="Exit focus mode"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {sidebarOpen && !focusMode && (
          <div className="flex-shrink-0 w-60 border-r border-[var(--color-border)] overflow-hidden">
            <Sidebar />
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor onSelectionChange={handleSelectionChange} />
        </div>

        {/* Right Panel */}
        {!focusMode && (
          <>
            <RightPanel
              activeTab={activePanel}
              selectedText={selectedText}
              onAnnotationClick={handleAnnotationClick}
            />
            <ToolStrip
              activeTab={activePanel}
              onTabChange={setActivePanel}
            />
          </>
        )}
      </div>
    </div>
  );
}
