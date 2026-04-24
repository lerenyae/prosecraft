'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, FileType2, Download } from 'lucide-react';

export type ExportFormat = 'docx' | 'pdf' | 'txt';
export type FontFamily = 'Times New Roman' | 'Garamond' | 'Georgia' | 'Courier New';
export type LineSpacing = 'single' | '1.5' | 'double';
export type ChapterHeadingStyle = 'upper' | 'title' | 'numbered';
export type SceneBreakStyle = 'asterisks' | 'blank' | 'hash';

export interface ExportOptions {
  format: ExportFormat;
  font: FontFamily;
  fontSize: number;         // body size in pt (11 / 12 / 13)
  lineSpacing: LineSpacing;
  marginInches: number;     // 0.5 / 0.75 / 1 / 1.25
  includeTitlePage: boolean;
  includePageNumbers: boolean;
  headerText: string;       // e.g. "Watkins / Project Title"
  chapterHeadingStyle: ChapterHeadingStyle;
  sceneBreakStyle: SceneBreakStyle;
  firstLineIndent: boolean; // indent body paragraphs 0.5"
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'docx',
  font: 'Times New Roman',
  fontSize: 12,
  lineSpacing: 'double',
  marginInches: 1,
  includeTitlePage: true,
  includePageNumbers: true,
  headerText: '',
  chapterHeadingStyle: 'upper',
  sceneBreakStyle: 'asterisks',
  firstLineIndent: true,
};

function storageKey(projectId: string) {
  return `prosecraft-export-options-${projectId}`;
}

export function loadExportOptions(projectId: string): ExportOptions {
  if (typeof window === 'undefined') return DEFAULT_EXPORT_OPTIONS;
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return DEFAULT_EXPORT_OPTIONS;
    return { ...DEFAULT_EXPORT_OPTIONS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_EXPORT_OPTIONS;
  }
}

export function saveExportOptions(projectId: string, options: ExportOptions) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify(options));
  } catch {
    // storage quota — silently ignore
  }
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  projectId: string;
  projectTitle: string;
  isExporting?: boolean;
}

export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  projectId,
  projectTitle,
  isExporting = false,
}: ExportModalProps) {
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Load saved options when the modal opens for a project
  useEffect(() => {
    if (isOpen) setOptions(loadExportOptions(projectId));
  }, [isOpen, projectId]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Close on Esc
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const update = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) =>
    setOptions(prev => ({ ...prev, [key]: value }));

  const handleExport = () => {
    saveExportOptions(projectId, options);
    onExport(options);
  };

  const formatChips: { value: ExportFormat; label: string; icon: typeof FileText; desc: string }[] = [
    { value: 'docx', label: 'Word', icon: FileType2, desc: 'Best for editing' },
    { value: 'pdf',  label: 'PDF',  icon: FileText,  desc: 'Print-ready' },
    { value: 'txt',  label: 'Plain', icon: FileText, desc: 'Text only' },
  ];

  const isTxt = options.format === 'txt';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Export manuscript</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate max-w-[400px]">{projectTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Format */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Format</h3>
            <div className="grid grid-cols-3 gap-2">
              {formatChips.map(({ value, label, icon: Icon, desc }) => {
                const active = options.format === value;
                return (
                  <button
                    key={value}
                    onClick={() => update('format', value)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${
                      active
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text-primary)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon size={14} />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">{desc}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Everything below is hidden for TXT — plain text has no styling */}
          {!isTxt && (
            <>
              {/* Typography */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Typography</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Font">
                    <select
                      value={options.font}
                      onChange={(e) => update('font', e.target.value as FontFamily)}
                      className={selectCls}
                    >
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Garamond">Garamond</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Courier New">Courier New</option>
                    </select>
                  </Field>
                  <Field label="Font size">
                    <select
                      value={options.fontSize}
                      onChange={(e) => update('fontSize', parseInt(e.target.value, 10))}
                      className={selectCls}
                    >
                      <option value={11}>11 pt</option>
                      <option value={12}>12 pt</option>
                      <option value={13}>13 pt</option>
                    </select>
                  </Field>
                  <Field label="Line spacing">
                    <select
                      value={options.lineSpacing}
                      onChange={(e) => update('lineSpacing', e.target.value as LineSpacing)}
                      className={selectCls}
                    >
                      <option value="single">Single</option>
                      <option value="1.5">1.5</option>
                      <option value="double">Double</option>
                    </select>
                  </Field>
                  <Field label="Margins">
                    <select
                      value={options.marginInches}
                      onChange={(e) => update('marginInches', parseFloat(e.target.value))}
                      className={selectCls}
                    >
                      <option value={0.5}>0.5&Prime;</option>
                      <option value={0.75}>0.75&Prime;</option>
                      <option value={1}>1&Prime; (standard)</option>
                      <option value={1.25}>1.25&Prime;</option>
                    </select>
                  </Field>
                </div>
              </section>

              {/* Structure */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Structure</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Chapter heading">
                    <select
                      value={options.chapterHeadingStyle}
                      onChange={(e) => update('chapterHeadingStyle', e.target.value as ChapterHeadingStyle)}
                      className={selectCls}
                    >
                      <option value="upper">ALL CAPS</option>
                      <option value="title">Title Case</option>
                      <option value="numbered">Chapter N</option>
                    </select>
                  </Field>
                  <Field label="Scene break">
                    <select
                      value={options.sceneBreakStyle}
                      onChange={(e) => update('sceneBreakStyle', e.target.value as SceneBreakStyle)}
                      className={selectCls}
                    >
                      <option value="asterisks">* * *</option>
                      <option value="hash">#</option>
                      <option value="blank">Blank line</option>
                    </select>
                  </Field>
                </div>

                <div className="mt-3 space-y-2">
                  <Checkbox
                    checked={options.includeTitlePage}
                    onChange={(v) => update('includeTitlePage', v)}
                    label="Include title page"
                  />
                  <Checkbox
                    checked={options.firstLineIndent}
                    onChange={(v) => update('firstLineIndent', v)}
                    label="First-line paragraph indent (0.5&Prime;)"
                  />
                  <Checkbox
                    checked={options.includePageNumbers}
                    onChange={(v) => update('includePageNumbers', v)}
                    label="Page numbers"
                  />
                </div>
              </section>

              {/* Header */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Running header</h3>
                <input
                  type="text"
                  value={options.headerText}
                  onChange={(e) => update('headerText', e.target.value)}
                  placeholder="Watkins / The Nightbirds"
                  className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                />
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                  Appears at the top of every page. Leave blank to skip.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Settings are remembered per project.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-[var(--color-accent)] text-[var(--color-accent-on)] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Download size={14} />
              {isExporting ? 'Exporting…' : `Export ${options.format.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// Small UI helpers
// ============================================================================

const selectCls =
  'w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-[var(--color-text-secondary)] mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
      />
      <span
        className="text-sm text-[var(--color-text-secondary)]"
        dangerouslySetInnerHTML={{ __html: label }}
      />
    </label>
  );
}
