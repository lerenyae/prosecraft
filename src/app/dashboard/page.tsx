'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Plus, Calendar, PenTool, Upload, Trash2, Download, RotateCcw } from 'lucide-react';
import { downloadBackup, restoreBackup } from '@/lib/backup';

// Calculate word count for a specific project by reading chapters/scenes from localStorage
function getProjectWordCount(projectId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const chapters = JSON.parse(localStorage.getItem('prosecraft-chapters') || '{}');
    const scenes = JSON.parse(localStorage.getItem('prosecraft-scenes') || '{}');

    const projectChapterIds = Object.values(chapters)
      .filter((c: any) => c.projectId === projectId)
      .map((c: any) => c.id);

    return Object.values(scenes)
      .filter((s: any) => projectChapterIds.includes(s.chapterId))
      .reduce((sum: number, s: any) => sum + (s.wordCount || 0), 0);
  } catch {
    return 0;
  }
}
import ThemeToggle from '@/components/ThemeToggle';
import OnboardingModal from '@/components/OnboardingModal';

const GENRE_OPTIONS = [
  'Mystery/Thriller',
  'Romance',
  'Fantasy/Sci-Fi',
  'Literary Fiction',
  'Memoir/Nonfiction',
  'Horror',
  'Historical Fiction',
  'Young Adult',
  'Children\'s',
  'Poetry',
  'Screenplay',
  'Other',
];

export default function Dashboard() {
  const { projects, createProject, deleteProject, createChapter, createScene, updateScene } = useStore();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState(GENRE_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [importText, setImportText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupNote, setBackupNote] = useState<string | null>(null);

  // Calculate word counts for all projects
  const wordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => {
      counts[p.id] = getProjectWordCount(p.id);
    });
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const handleBackup = () => {
    try {
      setBackupBusy(true);
      const { keysExported, filename } = downloadBackup();
      setBackupNote(`Saved ${filename} (${keysExported} keys).`);
    } catch (err) {
      setBackupNote(err instanceof Error ? `Backup failed: ${err.message}` : 'Backup failed.');
    } finally {
      setBackupBusy(false);
      setTimeout(() => setBackupNote(null), 4000);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be picked again later
    const ok = window.confirm(
      'Restoring will REPLACE all your current ProseCraft data with the contents of this backup. This cannot be undone. Continue?'
    );
    if (!ok) return;
    try {
      setBackupBusy(true);
      const { keysRestored, exportedAt } = await restoreBackup(file);
      const when = exportedAt ? ` (backup from ${new Date(exportedAt).toLocaleString()})` : '';
      setBackupNote(`Restored ${keysRestored} keys${when}. Reloading…`);
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setBackupNote(err instanceof Error ? `Restore failed: ${err.message}` : 'Restore failed.');
      setBackupBusy(false);
      setTimeout(() => setBackupNote(null), 5000);
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      const newProject = createProject(title.trim(), genre);
      setTitle('');
      setGenre(GENRE_OPTIONS[0]);
      setDescription('');
      setShowModal(false);
      router.push(`/project/${newProject.id}`);
    }
  };

  const handleImport = () => {
    if (!title.trim() || !importText.trim()) return;

    const newProject = createProject(title.trim(), genre);

    // Split imported text into chapters by common patterns
    const chapterSplits = importText.split(/\n(?=(?:Chapter|CHAPTER)\s+\d+|(?:Part|PART)\s+\w+)/i);

    if (chapterSplits.length > 1) {
      // Multiple chapters detected
      chapterSplits.forEach((chapterText, i) => {
        const lines = chapterText.trim().split('\n');
        const chapterTitle = lines[0].length < 60 ? lines[0] : `Chapter ${i + 1}`;
        const content = lines.slice(1).join('\n').trim();

        const chapter = createChapter(newProject.id, chapterTitle);
        // createChapter auto-creates a Scene 1; find it from localStorage
        const allScenes = JSON.parse(localStorage.getItem('prosecraft-scenes') || '{}');
        const autoScene = Object.values(allScenes).find((s: any) => s.chapterId === chapter.id) as any;
        if (autoScene) {
          const htmlContent = content.split('\n\n').map((p: string) => `<p>${p}</p>`).join('');
          const wordCount = content.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
          updateScene(autoScene.id, { content: htmlContent, wordCount });
        }
      });
    } else {
      // Single chapter for whole text
      const chapter = createChapter(newProject.id, 'Chapter 1');
      const scene = createScene(chapter.id);
      const htmlContent = importText.split('\n\n').map((p: string) => `<p>${p}</p>`).join('');
      const wordCount = importText.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
      updateScene(scene.id, { content: htmlContent, wordCount });
    }

    setTitle('');
    setGenre(GENRE_OPTIONS[0]);
    setImportText('');
    setImportFileName('');
    setShowImportModal(false);
    router.push(`/project/${newProject.id}`);
  };

  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'docx') {
      setIsProcessingFile(true);
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.default.extractRawText({ arrayBuffer });
        setImportText(result.value);
      } catch (err) {
        console.error('Failed to parse .docx:', err);
        setImportText('');
        setImportFileName('Error reading file');
      } finally {
        setIsProcessingFile(false);
      }
    } else if (ext === 'pdf') {
      setIsProcessingFile(true);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .filter((item: any) => 'str' in item)
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n\n';
        }
        setImportText(fullText.trim());
      } catch (err) {
        console.error('Failed to parse .pdf:', err);
        setImportText('');
        setImportFileName('Error reading file');
      } finally {
        setIsProcessingFile(false);
      }
    } else {
      // Plain text (.txt, .md, .rtf)
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setImportText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete === projectId) {
      deleteProject(projectId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(projectId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getGenreBadgeColor = (g: string) => {
    const colors: Record<string, string> = {
      'Mystery/Thriller': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      'Romance': 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
      'Fantasy/Sci-Fi': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
      'Literary Fiction': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      'Memoir/Nonfiction': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'Horror': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'Historical Fiction': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      'Young Adult': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'Other': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[g] || colors['Other'];
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/95 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-[var(--color-accent)]" />
            <h1 className="text-xl font-bold tracking-tight">ProseCraft</h1>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Hidden file input for backup restore (used by both empty + populated states) */}
      <input
        ref={restoreInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleRestoreFile}
      />

      {/* Backup/Restore status toast */}
      {backupNote && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="text-xs px-3 py-2 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
            {backupNote}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {projects.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20">
            <PenTool className="w-16 h-16 text-[var(--color-accent-light)] mb-6" strokeWidth={1.5} />
            <h2 className="text-3xl font-semibold mb-3 text-center">Start your next manuscript</h2>
            <p className="text-[var(--color-text-secondary)] mb-8 max-w-md text-center">
              Create from scratch or import an existing manuscript. ProseCraft helps you organize,
              develop, and refine your writing with AI-powered tools.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:bg-[var(--color-accent-dark)] transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Project
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg font-medium hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                <Upload className="w-5 h-5" />
                Import Manuscript
              </button>
              <button
                onClick={() => restoreInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg font-medium hover:bg-[var(--color-surface-alt)] transition-colors"
                title="Restore from a previously downloaded backup"
              >
                <RotateCcw className="w-5 h-5" />
                Restore Backup
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header with CTAs */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-semibold mb-1">Your Manuscripts</h2>
                <p className="text-[var(--color-text-secondary)]">
                  {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <button
                  onClick={handleBackup}
                  disabled={backupBusy}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg font-medium hover:bg-[var(--color-surface-alt)] transition-colors text-sm disabled:opacity-50"
                  title="Download a JSON backup of all your projects, chapters, and settings"
                >
                  <Download className="w-4 h-4" />
                  Backup
                </button>
                <button
                  onClick={() => restoreInputRef.current?.click()}
                  disabled={backupBusy}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg font-medium hover:bg-[var(--color-surface-alt)] transition-colors text-sm disabled:opacity-50"
                  title="Restore from a previously downloaded backup"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg font-medium hover:bg-[var(--color-surface-alt)] transition-colors text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:bg-[var(--color-accent-dark)] transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className="group cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 hover:border-[var(--color-accent-light)] hover:shadow-lg transition-all duration-300 relative"
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all ${
                      confirmDelete === project.id
                        ? 'bg-red-500 text-white'
                        : 'opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                    }`}
                    title={confirmDelete === project.id ? 'Click again to confirm delete' : 'Delete project'}
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Genre Badge */}
                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getGenreBadgeColor(project.genre)}`}>
                      {project.genre}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                    {project.title}
                  </h3>

                  {/* Description */}
                  {project.description && (
                    <p className="text-[var(--color-text-secondary)] text-sm mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="space-y-3 border-t border-[var(--color-border-light)] pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-semibold text-[var(--color-accent)]">{(wordCounts[project.id] || 0).toLocaleString()}</span>
                      <span className="text-sm text-[var(--color-text-secondary)]">words</span>
                    </div>

                    {/* Updated Date */}
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Hover arrow indicator */}
                  <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}

              {/* New Project Card */}
              <div
                onClick={() => setShowModal(true)}
                className="group cursor-pointer bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 hover:border-[var(--color-accent-light)] hover:bg-[var(--color-surface-alt)] transition-all duration-300 flex flex-col items-center justify-center min-h-[300px]"
              >
                <Plus className="w-12 h-12 text-[var(--color-accent-light)] mb-3 group-hover:text-[var(--color-accent)] transition-colors" />
                <h3 className="text-lg font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)] transition-colors">
                  New Project
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-2 text-center">
                  Start a new manuscript
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Onboarding Modal (fires once for new users) */}
      <OnboardingModal />

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full border border-[var(--color-border)]">
            <form onSubmit={handleCreateProject}>
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">New Manuscript</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Start a new writing project
                  </p>
                </div>

                {/* Title Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">Project Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., The Last Raven"
                    className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
                    autoFocus
                  />
                </div>

                {/* Genre Select */}
                <div>
                  <label className="block text-sm font-medium mb-2">Genre</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text-primary)]"
                  >
                    {GENRE_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">Description <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A brief summary of your project..."
                    rows={2}
                    className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setTitle(''); setDescription(''); }}
                  className="flex-1 px-4 py-2 text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg hover:bg-[var(--color-accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-lg w-full border border-[var(--color-border)]">
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-2xl font-semibold mb-1">Import Manuscript</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Import a .txt, .docx, or .pdf file, or paste your manuscript text. Chapters are auto-detected.
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Project Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., My Novel"
                  className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
                  autoFocus
                />
              </div>

              {/* Genre */}
              <div>
                <label className="block text-sm font-medium mb-2">Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text-primary)]"
                >
                  {GENRE_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Upload File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.rtf,.docx,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-bg-secondary)] border-2 border-dashed border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent-light)] transition-colors text-sm text-[var(--color-text-secondary)]"
                >
                  <Upload size={16} />
                  {isProcessingFile ? 'Processing file...' : importFileName || 'Choose a file (.txt, .docx, .pdf)'}
                </button>
              </div>

              {/* Or paste */}
              <div>
                <label className="block text-sm font-medium mb-2">Or Paste Text</label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste your manuscript text here..."
                  rows={6}
                  className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none text-sm"
                />
                {importText && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {importText.trim().split(/\s+/).filter(w => w.length > 0).length.toLocaleString()} words detected
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <button
                type="button"
                onClick={() => { setShowImportModal(false); setTitle(''); setImportText(''); setImportFileName(''); }}
                className="flex-1 px-4 py-2 text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!title.trim() || !importText.trim()}
                className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg hover:bg-[var(--color-accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
