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
} from 'lucide-react';
import Editor from '@/components/Editor';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import InsightsPanel from '@/components/InsightsPanel';
import BetaReaderPanel from '@/components/BetaReaderPanel';
import ChatPanel from '@/components/ChatPanel';
import StoryIntelPanel from '@/components/StoryIntelPanel';
import ExportModal, { ExportOptions } from '@/components/ExportModal';

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
    <div className="flex flex-col items-center w-12 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] py-3 gap-1 flex-shrink-0 relative z-40">
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
    <div className="flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col overflow-hidden
                    absolute md:static inset-y-0 right-12 md:right-auto z-40
                    w-[85vw] max-w-[340px] md:w-[320px] md:max-w-none shadow-xl md:shadow-none">
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
    setHighlightWord,
    _hydrated,
  } = useStore();
  const [activePanel, setActivePanel] = useState<PanelTab | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
    if (!quote) return;
    // Normalize: strip leading/trailing whitespace and surrounding quote marks
    // the AI may have added to its own citation.
    let q = quote.trim().replace(/^[\u2018\u2019\u201C\u201D"']+|[\u2018\u2019\u201C\u201D"']+$/g, '').trim();
    if (!q) return;
    // Truncate very long quotes — the search regex will allow flexible
    // whitespace so the first sentence or so is usually enough to land on
    // the passage without getting tripped up by minor punctuation drift.
    if (q.length > 140) {
      // Prefer ending at a sentence boundary within the first 140 chars.
      const head = q.slice(0, 140);
      const lastBreak = Math.max(
        head.lastIndexOf('. '),
        head.lastIndexOf('! '),
        head.lastIndexOf('? ')
      );
      q = lastBreak > 40 ? head.slice(0, lastBreak + 1) : head;
    }
    setHighlightWord(q);
  }, [setHighlightWord]);

  const handleGoalSave = useCallback((updates: { wordCountGoal: number; goalDeadline?: string; dailyGoal?: number }) => {
    if (currentProject) {
      updateProject(currentProject.id, updates as any);
    }
  }, [currentProject, updateProject]);

  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!currentProject) return;
    setIsExporting(true);

    const safeTitle = currentProject.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    // Strip any pending track-changes content before export so the published
    // manuscript reflects the author's current-as-written state:
    //   trackDeletion    → drop entirely (it's flagged for removal)
    //   trackInsertion   → keep the text, drop the mark wrapper
    const normalizeTrackChanges = (html: string) =>
      html
        .replace(/<del[^>]*data-track[^>]*>[\s\S]*?<\/del>/gi, '')
        .replace(/<ins[^>]*data-track[^>]*>([\s\S]*?)<\/ins>/gi, '$1');

    // Sentinel for inline scene breaks (TipTap HorizontalRule nodes). We
    // replace <hr> tags with this marker BEFORE the generic tag strip so the
    // break survives as its own paragraph and each export path can render it
    // as a centered block.
    const SCENE_BREAK_MARKER = '\u0001SCENEBREAK\u0001';

    const stripHtml = (html: string) =>
      normalizeTrackChanges(html)
        .replace(/<hr\b[^>]*>/gi, `\n\n${SCENE_BREAK_MARKER}\n\n`)
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

    // Format the chapter heading text according to options
    const formatChapterHeading = (raw: string, index: number): string => {
      const base = raw || `Chapter ${index + 1}`;
      if (options.chapterHeadingStyle === 'upper') return base.toUpperCase();
      if (options.chapterHeadingStyle === 'numbered') return `Chapter ${index + 1}`;
      // title case — keep as author wrote it
      return base;
    };

    const sceneBreakGlyph = options.sceneBreakStyle === 'hash'
      ? '#'
      : options.sceneBreakStyle === 'blank'
        ? ''
        : '* * *';

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

    try {
      if (options.format === 'txt') {
        // Replace inline scene-break sentinels with the configured glyph on
        // its own line so TXT output carries the break the author saw.
        const txtSceneBreak = sceneBreakGlyph ? `\n${sceneBreakGlyph}\n` : '\n';
        const toTxt = (content: string) =>
          stripHtml(content).replace(new RegExp(SCENE_BREAK_MARKER, 'g'), txtSceneBreak);

        let manuscript = `${currentProject.title}\n\n`;
        projectChapters.forEach((chapter, idx) => {
          manuscript += `\n\n${formatChapterHeading(chapter.title, idx)}\n\n`;
          chapterScenes(chapter.id).forEach((scene, sIdx) => {
            if (sIdx > 0 && sceneBreakGlyph) {
              manuscript += `\n${sceneBreakGlyph}\n\n`;
            }
            manuscript += toTxt(scene.content);
          });
        });
        triggerDownload(new Blob([manuscript], { type: 'text/plain' }), `${safeTitle}.txt`);
        return;
      }

      if (options.format === 'docx') {
        const { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, Footer, Header, PageNumber } = await import('docx');

        // Convert user-friendly options into OOXML units
        const FONT = options.font;
        const BODY_SIZE = options.fontSize * 2;                // pt → half-points
        const TITLE_SIZE = (options.fontSize + 6) * 2;         // ~18pt when body=12
        const CHAPTER_SIZE = (options.fontSize + 2) * 2;       // ~14pt when body=12
        const LINE_SPACING =
          options.lineSpacing === 'double' ? 480 :
          options.lineSpacing === '1.5'    ? 360 : 240;        // twentieths of a point
        const INDENT_FIRST = options.firstLineIndent ? 720 : 0; // 0.5" = 720 twips
        const MARGIN = Math.round(options.marginInches * 1440); // 1" = 1440 twips

        const bodyRun = (text: string) =>
          new TextRun({ text, font: FONT, size: BODY_SIZE });

        const bodyParagraph = (text: string) =>
          new Paragraph({
            alignment: AlignmentType.LEFT,
            indent: INDENT_FIRST ? { firstLine: INDENT_FIRST } : undefined,
            spacing: { line: LINE_SPACING, before: 0, after: 0 },
            children: [bodyRun(text)],
          });

        const blankLine = () =>
          new Paragraph({
            spacing: { line: LINE_SPACING, before: 0, after: 0 },
            children: [new TextRun({ text: '', font: FONT, size: BODY_SIZE })],
          });

        const sceneBreakParagraph = () =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: LINE_SPACING, before: 240, after: 240 },
            children: [new TextRun({ text: sceneBreakGlyph, font: FONT, size: BODY_SIZE })],
          });

        const children: InstanceType<typeof Paragraph>[] = [];

        // Optional title page — centered in vertical space
        if (options.includeTitlePage) {
          for (let i = 0; i < 10; i++) children.push(blankLine());
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: LINE_SPACING, before: 0, after: 0 },
            children: [new TextRun({ text: currentProject.title, font: FONT, size: TITLE_SIZE, bold: true })],
          }));
        }

        projectChapters.forEach((chapter, idx) => {
          const chapterHeading = new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: LINE_SPACING, before: 0, after: 480 },
            children: [
              ...(options.includeTitlePage || idx > 0 ? [new PageBreak()] : []),
              new TextRun({
                text: formatChapterHeading(chapter.title, idx),
                font: FONT,
                size: CHAPTER_SIZE,
                bold: true,
              }),
            ],
          });
          children.push(chapterHeading);

          let firstParaOfChapter = true;
          const scenes = chapterScenes(chapter.id);
          scenes.forEach((scene, sIdx) => {
            if (sIdx > 0 && sceneBreakGlyph) {
              children.push(sceneBreakParagraph());
              firstParaOfChapter = true;
            } else if (sIdx > 0 && !sceneBreakGlyph) {
              children.push(blankLine());
            }

            const text = stripHtml(scene.content).trim();
            text.split(/\n\n+/).forEach((para) => {
              const clean = para.replace(/\n/g, ' ').trim();
              if (!clean) return;
              // Inline scene break from the editor (TipTap HorizontalRule)
              if (clean === SCENE_BREAK_MARKER) {
                if (sceneBreakGlyph) {
                  children.push(sceneBreakParagraph());
                } else {
                  children.push(blankLine());
                }
                firstParaOfChapter = true;
                return;
              }
              if (firstParaOfChapter) {
                children.push(new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { line: LINE_SPACING, before: 0, after: 0 },
                  children: [bodyRun(clean)],
                }));
                firstParaOfChapter = false;
              } else {
                children.push(bodyParagraph(clean));
              }
            });
          });
        });

        const footerChildren = options.includePageNumbers
          ? {
              default: new Footer({
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: BODY_SIZE })],
                })],
              }),
            }
          : undefined;

        const headerChildren = options.headerText
          ? {
              default: new Header({
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: options.headerText, font: FONT, size: BODY_SIZE - 2 })],
                })],
              }),
            }
          : undefined;

        const doc = new Document({
          creator: 'SeedQuill',
          title: currentProject.title,
          styles: {
            default: {
              document: { run: { font: FONT, size: BODY_SIZE } },
            },
          },
          sections: [{
            properties: {
              page: {
                margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
              },
            },
            ...(footerChildren ? { footers: footerChildren } : {}),
            ...(headerChildren ? { headers: headerChildren } : {}),
            children,
          }],
        });
        const blob = await Packer.toBlob(doc);
        triggerDownload(blob, `${safeTitle}.docx`);
        return;
      }

      if (options.format === 'pdf') {
        // Print-to-PDF via a styled print window (zero new deps).
        const win = window.open('', '_blank', 'width=800,height=1000');
        if (!win) return;
        const escape = (s: string) =>
          s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const indentRule = options.firstLineIndent ? 'text-indent:2em;' : '';
        const lineHeight =
          options.lineSpacing === 'double' ? 2 :
          options.lineSpacing === '1.5'    ? 1.5 : 1.15;

        let body = '';
        if (options.includeTitlePage) {
          body += `<section class="title-page">
            <h1>${escape(currentProject.title)}</h1>
          </section>`;
        }

        projectChapters.forEach((chapter, idx) => {
          // Only chapters after the first need a forced page break when there's
          // no title page; otherwise every chapter starts on a fresh page.
          const needsBreak = options.includeTitlePage || idx > 0;
          body += `<section class="chapter${needsBreak ? ' chapter-break' : ''}">`;
          body += `<h2>${escape(formatChapterHeading(chapter.title, idx))}</h2>`;
          const scenes = chapterScenes(chapter.id);
          scenes.forEach((scene, sIdx) => {
            if (sIdx > 0 && sceneBreakGlyph) {
              body += `<p class="scene-break">${escape(sceneBreakGlyph)}</p>`;
            } else if (sIdx > 0) {
              body += `<p class="scene-break">&nbsp;</p>`;
            }
            const text = stripHtml(scene.content).trim();
            text.split(/\n\n+/).forEach((para) => {
              const clean = para.replace(/\n/g, ' ').trim();
              if (!clean) return;
              // Inline scene break from the editor (TipTap HorizontalRule)
              if (clean === SCENE_BREAK_MARKER) {
                if (sceneBreakGlyph) {
                  body += `<p class="scene-break">${escape(sceneBreakGlyph)}</p>`;
                } else {
                  body += `<p class="scene-break">&nbsp;</p>`;
                }
                return;
              }
              body += `<p class="body-para">${escape(clean)}</p>`;
            });
          });
          body += `</section>`;
        });

        const headerHTML = options.headerText
          ? `<div class="running-header">${escape(options.headerText)}</div>`
          : '';
        const pageNumberCSS = options.includePageNumbers
          ? `@page { margin: ${options.marginInches}in; @bottom-center { content: counter(page); font-family: "${options.font}", serif; font-size: ${options.fontSize}pt; } }`
          : `@page { margin: ${options.marginInches}in; }`;

        win.document.write(`<!doctype html><html><head><title>${escape(currentProject.title)}</title><style>
          ${pageNumberCSS}
          html, body { background: #fff; color: #000; }
          body {
            font-family: "${options.font}", Georgia, serif;
            font-size: ${options.fontSize}pt;
            line-height: ${lineHeight};
            max-width: ${8.5 - options.marginInches * 2}in;
            margin: ${options.marginInches}in auto;
          }
          h1 { font-size: ${options.fontSize + 12}pt; margin: 0 0 2rem 0; }
          h2 {
            font-size: ${options.fontSize + 4}pt;
            text-align: center;
            margin: 0 0 1.5rem 0;
            page-break-after: avoid;
            break-after: avoid-page;
          }
          p.body-para {
            ${indentRule}
            margin: 0 0 .2em 0;
            orphans: 2;
            widows: 2;
          }
          p.scene-break {
            text-align: center;
            margin: 1.5em 0;
          }
          .title-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 9in;
            text-align: center;
            page-break-after: always;
            break-after: page;
          }
          .chapter-break {
            page-break-before: always;
            break-before: page;
          }
          .chapter {
            padding-top: 1rem;
          }
          .running-header {
            position: running(header);
            text-align: center;
            font-size: ${options.fontSize - 1}pt;
            color: #555;
          }
          @media print {
            body { margin: 0 auto; max-width: ${8.5 - options.marginInches * 2}in; }
            .chapter-break { page-break-before: always; break-before: page; }
            .title-page { page-break-after: always; break-after: page; }
            h2 { page-break-after: avoid; break-after: avoid-page; }
          }
        </style></head><body>${headerHTML}${body}</body></html>`);
        win.document.close();
        win.focus();
        // Give the new window a beat to lay out before invoking print — some
        // browsers skip page breaks if print() fires before paint.
        setTimeout(() => { win.print(); }, 400);
        return;
      }
    } finally {
      setIsExporting(false);
      setExportModalOpen(false);
    }
  }, [currentProject, projectChapters, chapterScenes]);

  // Before localStorage hydration finishes, the store reports currentProject=null
  // even for valid projects. Show a neutral loading state during that window so
  // we don't flash "Project not found" on every refresh.
  if (!_hydrated) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
          <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading manuscript…</span>
        </div>
      </div>
    );
  }

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

      {/* Export Customization Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
        projectId={currentProject.id}
        projectTitle={currentProject.title}
        isExporting={isExporting}
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
                  SeedQuill
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
              <h1 className="hidden sm:block text-sm font-semibold truncate max-w-[200px] text-[var(--color-text-secondary)]">
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

              {/* Export — opens customization modal */}
              <button
                onClick={() => setExportModalOpen(true)}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--color-surface-alt)]"
                title="Export manuscript"
              >
                <Download className="w-4 h-4" />
              </button>

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
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop — covers editor when any drawer is open on small screens */}
        {!focusMode && (sidebarOpen || activePanel) && (
          <div
            className="md:hidden absolute inset-0 z-30 bg-black/50"
            onClick={() => {
              if (sidebarOpen) toggleSidebar();
              if (activePanel) setActivePanel(null);
            }}
            aria-hidden="true"
          />
        )}

        {/* Left Sidebar */}
        {sidebarOpen && !focusMode && (
          <div className="flex-shrink-0 w-60 border-r border-[var(--color-border)] overflow-hidden
                          absolute md:static inset-y-0 left-0 z-40 bg-[var(--color-bg-secondary)] shadow-xl md:shadow-none">
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
