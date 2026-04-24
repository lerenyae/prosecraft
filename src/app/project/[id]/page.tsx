'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import {
  Menu,
  Eye,
  BarChart3,
  Brain,
  MessageSquare,
  Activity,
  Settings,
  BookOpen,
  PenTool,
  Download,
  FileText,
  FileType,
  Printer,
} from 'lucide-react';
import Editor from '@/components/Editor';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import InsightsPanel from '@/components/InsightsPanel';
import BetaReaderPanel from '@/components/BetaReaderPanel';
import ChatPanel from '@/components/ChatPanel';
import StoryIntelPanel from '@/components/StoryIntelPanel';

// ============================================================================
// Types
// ============================================================================

type PanelTab = 'insights' | 'beta-reader' | 'chat' | 'story-intel';

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
  projectWordCount = 0,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: { wordCountGoal: number; goalDeadline?: string; dailyGoal?: number };
  onSave: (updates: { wordCountGoal: number; goalDeadline?: string; dailyGoal?: number }) => void;
  projectWordCount?: number;
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

  // Auto-calculate daily goal from deadline, accounting for words already written
  useEffect(() => {
    if (deadline && goal) {
      const today = new Date();
      const end = new Date(deadline);
      const daysLeft = Math.max(1, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      // Use projectWordCount to calculate remaining words, not total
      const remaining = Math.max(0, goal - (projectWordCount || 0));
      setDailyGoal(Math.ceil(remaining / daysLeft));
    }
  }, [deadline, goal, projectWordCount]);

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
              Auto-calculated from deadline ({Math.max(0, goal - projectWordCount).toLocaleString()} words remaining). Adjust manually if needed.
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
    { id: 'story-intel', icon: Activity, label: 'Story Intelligence' },
    { id: 'insights', icon: BarChart3, label: 'Insights' },
    { id: 'beta-reader', icon: Brain, label: 'Beta Reader' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
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
          {activeTab === 'story-intel' ? 'Story Intelligence' : activeTab === 'insights' ? 'Insights' : activeTab === 'beta-reader' ? 'Beta Reader' : 'Chat'}
        </span>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'story-intel' && <StoryIntelPanel />}
        {activeTab === 'insights' && <InsightsPanel />}
        {activeTab === 'beta-reader' && (
          <BetaReaderPanel
            selectedText={selectedText}
            onAnnotationClick={onAnnotationClick}
          />
        )}
        {activeTab === 'chat' && <ChatPanel />}
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
    setCurrentChapter,
    setCurrentScene,
    currentProject,
    currentSceneId,
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
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    setCurrentProject(resolvedParams.id);
  }, [resolvedParams.id, setCurrentProject]);

  // Auto-select first chapter + first scene when project loads and nothing is selected
  useEffect(() => {
    if (currentProject && projectChapters.length > 0 && !currentSceneId) {
      const firstChapter = projectChapters[0];
      const firstScenes = chapterScenes(firstChapter.id);
      if (firstScenes.length > 0) {
        setCurrentChapter(firstChapter.id);
        setCurrentScene(firstScenes[0].id);
      }
    }
  }, [currentProject?.id, projectChapters.length, currentSceneId]);

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

  const handleGoalSave = useCallback((updates: { wordCountGoal: number; goalDeadline?: string; dailyGoal?: number }) => {
    if (currentProject) {
      updateProject(currentProject.id, updates as any);
    }
  }, [currentProject, updateProject]);

  const handleExport = useCallback(async (format: 'txt' | 'docx' | 'pdf' = 'txt') => {
    if (!currentProject) return;

    const safeTitle = currentProject.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    const stripHtml = (html: string) =>
      html
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

    const triggerDownload = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    if (format === 'txt') {
      let manuscript = `${currentProject.title}\n\n`;
      projectChapters.forEach((chapter) => {
        manuscript += `\n\n${chapter.title}\n\n`;
        chapterScenes(chapter.id).forEach((scene) => {
          manuscript += stripHtml(scene.content);
        });
      });
      triggerDownload(new Blob([manuscript], { type: 'text/plain' }), `${safeTitle}.txt`);
      return;
    }

    if (format === 'docx') {
      const { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, Footer, PageNumber } = await import('docx');

      // Novel manuscript format:
      //   Times New Roman 12pt (size 24 in half-points)
      //   Double-spaced (line 480 in twentieths of a point)
      //   1-inch margins (1440 twips)
      //   First-line indent 0.5" (720 twips) on body paragraphs
      //   No space between paragraphs
      //   Chapter headings centered on new page, ALL CAPS
      //   Page number in footer
      const FONT = 'Times New Roman';
      const BODY_SIZE = 24; // 12pt
      const TITLE_SIZE = 36; // 18pt
      const CHAPTER_SIZE = 28; // 14pt
      const LINE_DOUBLE = 480;
      const INDENT_FIRST = 720; // 0.5"

      const bodyRun = (text: string) =>
        new TextRun({ text, font: FONT, size: BODY_SIZE });

      const bodyParagraph = (text: string) =>
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { firstLine: INDENT_FIRST },
          spacing: { line: LINE_DOUBLE, before: 0, after: 0 },
          children: [bodyRun(text)],
        });

      const blankLine = () =>
        new Paragraph({
          spacing: { line: LINE_DOUBLE, before: 0, after: 0 },
          children: [new TextRun({ text: '', font: FONT, size: BODY_SIZE })],
        });

      const children: InstanceType<typeof Paragraph>[] = [];

      // Title page — centered in vertical space via several blank lines
      for (let i = 0; i < 10; i++) children.push(blankLine());
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: LINE_DOUBLE, before: 0, after: 0 },
        children: [new TextRun({ text: currentProject.title, font: FONT, size: TITLE_SIZE, bold: true })],
      }));

      projectChapters.forEach((chapter, idx) => {
        // Chapter on new page
        const chapterHeading = new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: LINE_DOUBLE, before: 0, after: 480 },
          children: [
            new PageBreak(),
            new TextRun({ text: (chapter.title || `Chapter ${idx + 1}`).toUpperCase(), font: FONT, size: CHAPTER_SIZE, bold: true }),
          ],
        });
        children.push(chapterHeading);

        let firstParaOfChapter = true;
        chapterScenes(chapter.id).forEach((scene) => {
          const text = stripHtml(scene.content).trim();
          text.split(/\n\n+/).forEach((para) => {
            const clean = para.replace(/\n/g, ' ').trim();
            if (!clean) return;
            if (firstParaOfChapter) {
              // First paragraph after chapter heading — no indent (book convention)
              children.push(new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { line: LINE_DOUBLE, before: 0, after: 0 },
                children: [bodyRun(clean)],
              }));
              firstParaOfChapter = false;
            } else {
              children.push(bodyParagraph(clean));
            }
          });
        });
      });

      const doc = new Document({
        creator: 'ProseCraft',
        title: currentProject.title,
        styles: {
          default: {
            document: { run: { font: FONT, size: BODY_SIZE } },
          },
        },
        sections: [{
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1" all around
            },
          },
          footers: {
            default: new Footer({
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: BODY_SIZE })],
              })],
            }),
          },
          children,
        }],
      });
      const blob = await Packer.toBlob(doc);
      triggerDownload(blob, `${safeTitle}.docx`);
      return;
    }

    if (format === 'pdf') {
      // Print-to-PDF via a styled print window (zero new deps).
      const win = window.open('', '_blank', 'width=800,height=1000');
      if (!win) return;
      const escape = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let body = `<h1 style="text-align:center">${escape(currentProject.title)}</h1>`;
      projectChapters.forEach((chapter) => {
        body += `<h2 style="text-align:center;page-break-before:always;margin-top:3rem">${escape(chapter.title)}</h2>`;
        chapterScenes(chapter.id).forEach((scene) => {
          const text = stripHtml(scene.content).trim();
          text.split(/\n\n+/).forEach((para) => {
            if (para.trim()) {
              body += `<p style="text-indent:2em;margin:0 0 .2em 0">${escape(para.replace(/\n/g, ' ').trim())}</p>`;
            }
          });
        });
      });
      win.document.write(`<!doctype html><html><head><title>${escape(currentProject.title)}</title><style>
        body{font-family:Georgia,serif;max-width:6.5in;margin:1in auto;line-height:1.6;color:#000}
        h1{font-size:24pt;margin-bottom:2rem}
        h2{font-size:18pt;margin-bottom:1rem}
        p{font-size:12pt}
        @media print{ body{margin:0} }
      </style></head><body>${body}</body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 250);
      return;
    }
  }, [currentProject, projectChapters, chapterScenes]);

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
        projectWordCount={projectWordCount}
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

              {/* Export with format picker */}
              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen(o => !o)}
                  className="p-2 rounded-lg transition-colors hover:bg-[var(--color-surface-alt)]"
                  title="Export manuscript"
                >
                  <Download className="w-4 h-4" />
                </button>
                {exportMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setExportMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-lg py-1">
                      <button
                        onClick={() => { setExportMenuOpen(false); handleExport('docx'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                      >
                        <FileType className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        Word (.docx)
                      </button>
                      <button
                        onClick={() => { setExportMenuOpen(false); handleExport('pdf'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                      >
                        <Printer className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        PDF (print)
                      </button>
                      <button
                        onClick={() => { setExportMenuOpen(false); handleExport('txt'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                      >
                        <FileText className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                        Plain text (.txt)
                      </button>
                    </div>
                  </>
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
        <div className="flex-1 overflow-hidden">
          <Editor onSelectionChange={handleSelectionChange} hasActiveSelection={selectedText.length > 10} />
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
