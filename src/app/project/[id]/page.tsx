'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Editor as TipTapEditor } from '@tiptap/react';
import {
  Menu,
  Eye,
  BarChart3,
  Brain,
  Settings,
  BookOpen,
  PenTool,
  Download,
  Search,
  FileText,
  FileType,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import Editor from '@/components/Editor';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import InsightsPanel from '@/components/InsightsPanel';
import BetaReaderPanel from '@/components/BetaReaderPanel';
import AIToolbar from '@/components/AIToolbar';
import SearchReplace from '@/components/SearchReplace';

// ============================================================================
// Types
// ============================================================================

type PanelTab = 'insights' | 'beta-reader' | 'ai-tools';

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

// ============================================================================
// Goal Settings Modal
// ============================================================================

function GoalSettingsModal({
  isOpen,
  onClose,
  project,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: { wordCountGoal: number; goalDeadline?: string; dailyGoal?: number };
  onSave: (updates: { wordCountGoal: number; goalDeadline?: string; dailyGoal?: number }) => void;
}) {
  const [goal, setGoal] = useState(project.wordCountGoal);
  const [deadline, setDeadline] = useState(project.goalDeadline || '');
  const [dailyGoal, setDailyGoal] = useState(project.dailyGoal || 0);

  useEffect(() => {
    if (isOpen) {
      setGoal(project.wordCountGoal);
      setDeadline(project.goalDeadline || '');
      setDailyGoal(project.dailyGoal || 0);
    }
  }, [isOpen, project]);

  // Auto-calculate daily goal from deadline
  useEffect(() => {
    if (deadline && goal) {
      const today = new Date();
      const end = new Date(deadline);
      const daysLeft = Math.max(1, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      setDailyGoal(Math.ceil(goal / daysLeft));
    }
  }, [deadline, goal]);

  if (!isOpen) return null;

  const presets = [
    { label: 'Short Story', value: 7500 },
    { label: 'Novella', value: 30000 },
    { label: 'Novel', value: 80000 },
    { label: 'Epic', value: 120000 },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl w-[400px] max-w-[90vw] p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Manuscript Goal</h2>

        {/* Presets */}
        <div className="flex gap-2 mb-4">
          {presets.map(p => (
            <button
              key={p.value}
              onClick={() => setGoal(p.value)}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                goal === p.value
                  ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] border-[var(--color-accent)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Word count goal */}
        <label className="block mb-4">
          <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Total Word Goal</span>
          <input
            type="number"
            value={goal}
            onChange={e => setGoal(Number(e.target.value))}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </label>

        {/* Deadline */}
        <label className="block mb-4">
          <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Deadline</span>
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </label>

        {/* Daily goal */}
        <label className="block mb-5">
          <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">Daily Word Goal</span>
          <input
            type="number"
            value={dailyGoal}
            onChange={e => setDailyGoal(Number(e.target.value))}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          {deadline && (
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
              Auto-calculated from deadline. Adjust manually if needed.
            </p>
          )}
        </label>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({
                wordCountGoal: goal,
                goalDeadline: deadline || undefined,
                dailyGoal: dailyGoal || undefined,
              });
              onClose();
            }}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-dark)] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
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
    { id: 'ai-tools', icon: Sparkles, label: 'AI Tools' },
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
  editor,
  onAnnotationClick,
  onFilterWordClick,
}: {
  activeTab: PanelTab | null;
  selectedText: string;
  editor: TipTapEditor | null;
  onAnnotationClick: (quote: string) => void;
  onFilterWordClick?: (word: string) => void;
}) {
  if (!activeTab) return null;

  const panelTitle = activeTab === 'insights' ? 'Insights' : activeTab === 'ai-tools' ? 'AI Tools' : 'Beta Reader';

  return (
    <div className="flex-shrink-0 w-[320px] border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] flex-shrink-0">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          {panelTitle}
        </span>
      </div>

      {/* Panel Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'ai-tools' && <AIToolbar editor={editor} selectedText={selectedText} />}
        {activeTab === 'insights' && <InsightsPanel onFilterWordClick={onFilterWordClick} />}
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
    updateProject,
    toggleSidebar,
    sidebarOpen,
    toggleFocusMode,
    focusMode,
    projectWordCount,
    projectChapters,
    chapterScenes,
  } = useStore();
  const [activePanel, setActivePanel] = useState<PanelTab | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchInitialTerm, setSearchInitialTerm] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editorInstance, setEditorInstance] = useState<TipTapEditor | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentProject(resolvedParams.id);
  }, [resolvedParams.id, setCurrentProject]);

  // Close export menu on click outside
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExportMenu]);

  const handleFilterWordClick = useCallback((word: string) => {
    setSearchInitialTerm(word);
    setShowSearch(true);
  }, []);

  // Keyboard shortcut: Cmd+F for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleEditorReady = useCallback((editor: TipTapEditor) => {
    setEditorInstance(editor);
  }, []);

  const handleSelectionChange = useCallback((text: string) => {
    setSelectedText(text);
    // Auto-open AI tools panel when text is selected (only if no panel is open)
    if (text.length > 10 && activePanel === null) {
      setActivePanel('ai-tools');
    }
  }, [activePanel]);

  const handleAnnotationClick = useCallback((quote: string) => {
    // TODO: scroll editor to the matching quote
    console.log('Navigate to:', quote);
  }, []);

  const handleGoalSave = useCallback((updates: { wordCountGoal: number; goalDeadline?: string; dailyGoal?: number }) => {
    if (currentProject) {
      updateProject(currentProject.id, updates as any);
    }
  }, [currentProject, updateProject]);

  // Build manuscript data for export
  const getManuscriptData = useCallback(() => {
    if (!currentProject) return { text: '', html: '', chapters: [] as { title: string; html: string; text: string }[] };

    let text = `${currentProject.title}\n\n`;
    let html = `<h1>${currentProject.title}</h1>`;
    const chapters: { title: string; html: string; text: string }[] = [];

    projectChapters.forEach((chapter) => {
      let chapterText = '';
      let chapterHtml = '';
      const scenes = chapterScenes(chapter.id);
      scenes.forEach((scene) => {
        chapterHtml += scene.content || '';
        const sceneText = (scene.content || '')
          .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n\n')
          .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/\n{3,}/g, '\n\n');
        chapterText += sceneText;
      });
      chapters.push({ title: chapter.title, html: chapterHtml, text: chapterText });
      text += `\n\n${chapter.title}\n\n${chapterText}`;
      html += `<h2>${chapter.title}</h2>${chapterHtml}`;
    });

    return { text, html, chapters };
  }, [currentProject, projectChapters, chapterScenes]);

  const handleExportTxt = useCallback(() => {
    if (!currentProject) return;
    const { text } = getManuscriptData();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentProject, getManuscriptData]);

  const handleExportPdf = useCallback(() => {
    if (!currentProject) return;
    const { html } = getManuscriptData();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${currentProject.title}</title>
      <style>
        body { font-family: Georgia, 'Times New Roman', serif; max-width: 6.5in; margin: 1in auto; line-height: 1.8; color: #1a1a1a; font-size: 12pt; }
        h1 { text-align: center; font-size: 24pt; margin-bottom: 2em; page-break-after: avoid; }
        h2 { font-size: 18pt; margin-top: 2em; page-break-after: avoid; }
        h3 { font-size: 14pt; page-break-after: avoid; }
        p { margin: 0 0 0.8em 0; text-indent: 1.5em; }
        p:first-child, h1 + p, h2 + p, h3 + p { text-indent: 0; }
        blockquote { margin: 1em 2em; font-style: italic; border-left: 3px solid #ccc; padding-left: 1em; }
        @media print { body { margin: 0; } }
      </style></head><body>${html}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }, [currentProject, getManuscriptData]);

  const handleExportDocx = useCallback(async () => {
    if (!currentProject) return;
    const { chapters } = getManuscriptData();

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
    const { saveAs } = await import('file-saver');

    const docChildren: any[] = [
      new Paragraph({
        text: currentProject.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
    ];

    chapters.forEach((ch) => {
      docChildren.push(
        new Paragraph({
          text: ch.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
      // Split chapter text into paragraphs
      const paras = ch.text.split(/\n\n+/).filter((p: string) => p.trim());
      paras.forEach((p: string) => {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: p.trim(), font: 'Times New Roman', size: 24 })],
            spacing: { after: 200, line: 360 },
          })
        );
      });
    });

    const doc = new Document({
      sections: [{ properties: {}, children: docChildren }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${currentProject.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx`);
  }, [currentProject, getManuscriptData]);

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Project not found</h1>
          <p className="text-[var(--color-text-secondary)] mb-6">
            This manuscript could not be loaded.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:bg-[var(--color-accent-dark)] transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Goal Settings Modal */}
      <GoalSettingsModal
        isOpen={showGoalSettings}
        onClose={() => setShowGoalSettings(false)}
        project={currentProject as any}
        onSave={handleGoalSave}
      />

      {/* Top Bar */}
      {!focusMode && (
        <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
          <div className="flex items-center justify-between px-4 py-2.5 gap-4">
            {/* Left: Logo + Sidebar toggle + Title */}
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors group"
                title="Back to dashboard"
              >
                <PenTool className="w-4 h-4 text-[var(--color-accent)]" />
                <span className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                  ProseCraft
                </span>
              </Link>
              <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors"
                title="Toggle sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
              <h1 className="text-sm font-semibold truncate max-w-[200px] text-[var(--color-text-secondary)]">
                {currentProject.title}
              </h1>
            </div>

            {/* Right: Stats + Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Word Count */}
              <button
                onClick={() => setActivePanel(activePanel === 'insights' ? null : 'insights')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--color-surface-alt)] rounded-md hover:bg-[var(--color-surface)] transition-colors"
                title="Toggle insights panel"
              >
                <BarChart3 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span className="text-xs font-medium">
                  {projectWordCount.toLocaleString()}
                </span>
              </button>

              {/* Chapters count */}
              <button
                onClick={toggleSidebar}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--color-surface-alt)] rounded-md hover:bg-[var(--color-surface)] transition-colors"
                title="Toggle sidebar"
              >
                <BookOpen className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                <span className="text-xs font-medium">
                  {projectChapters.length} ch
                </span>
              </button>

              {/* Search */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'hover:bg-[var(--color-surface-alt)]'}`}
                title="Search & Replace (Cmd+F)"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Export */}
              <div ref={exportRef} className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className={`flex items-center gap-1 p-2 rounded-lg transition-colors ${showExportMenu ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'hover:bg-[var(--color-surface-alt)]'}`}
                  title="Export manuscript"
                >
                  <Download className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => { handleExportTxt(); setShowExportMenu(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors"
                    >
                      <FileText className="w-4 h-4 text-[var(--color-text-muted)]" />
                      Plain Text (.txt)
                    </button>
                    <button
                      onClick={() => { handleExportPdf(); setShowExportMenu(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors"
                    >
                      <FileType className="w-4 h-4 text-red-500" />
                      PDF (.pdf)
                    </button>
                    <button
                      onClick={() => { handleExportDocx(); setShowExportMenu(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors"
                    >
                      <FileType className="w-4 h-4 text-blue-500" />
                      Word (.docx)
                    </button>
                  </div>
                )}
              </div>

              {/* Goal Settings */}
              <button
                onClick={() => setShowGoalSettings(true)}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--color-surface-alt)]"
                title="Manuscript goal settings"
              >
                <Settings className="w-4 h-4" />
              </button>

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
        <div className="flex-1 overflow-hidden relative">
          <SearchReplace editor={editorInstance} isOpen={showSearch} onClose={() => { setShowSearch(false); setSearchInitialTerm(''); }} initialTerm={searchInitialTerm} />
          <Editor onSelectionChange={handleSelectionChange} hasActiveSelection={selectedText.length > 10} onEditorReady={handleEditorReady} />
        </div>

        {/* Right Panel */}
        {!focusMode && (
          <>
            <RightPanel
              activeTab={activePanel}
              selectedText={selectedText}
              editor={editorInstance}
              onAnnotationClick={handleAnnotationClick}
              onFilterWordClick={handleFilterWordClick}
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
