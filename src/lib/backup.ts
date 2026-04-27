/**
 * Full-app backup / restore.
 *
 * ProseCraft stores everything in localStorage today (projects, chapters,
 * scenes, profile, chat memory, beat sheets, etc.). A user clearing site
 * data or switching browsers loses everything. Until cloud sync exists,
 * a manual JSON dump/restore is the safety net.
 *
 * Format is intentionally dumb: a flat snapshot of every prosecraft-*
 * localStorage key. Restore overwrites in place. No diffing, no merging.
 */

const KEY_PREFIX = 'prosecraft-';

export interface BackupBundle {
  version: 1;
  exportedAt: string;
  appName: 'prosecraft';
  data: Record<string, string>;
}

function collectAll(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === 'undefined') return out;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(KEY_PREFIX)) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

export function buildBackup(): BackupBundle {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'prosecraft',
    data: collectAll(),
  };
}

export function downloadBackup(): { keysExported: number; filename: string } {
  const bundle = buildBackup();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `prosecraft-backup-${stamp}.json`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { keysExported: Object.keys(bundle.data).length, filename };
}

export interface RestoreResult {
  keysRestored: number;
  exportedAt?: string;
}

export async function restoreBackup(file: File): Promise<RestoreResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Not a valid JSON file.');
  }
  const bundle = parsed as Partial<BackupBundle>;
  if (!bundle || bundle.appName !== 'prosecraft') {
    throw new Error('Not a SeedQuill backup file.');
  }
  if (!bundle.data || typeof bundle.data !== 'object') {
    throw new Error('Backup file is missing data.');
  }

  // Wipe existing prosecraft-* keys first so a smaller restored bundle
  // does not leave orphaned keys behind. Other apps' keys are untouched.
  if (typeof window !== 'undefined') {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  }

  let count = 0;
  for (const [key, value] of Object.entries(bundle.data)) {
    if (typeof value !== 'string') continue;
    if (!key.startsWith(KEY_PREFIX)) continue;
    window.localStorage.setItem(key, value);
    count++;
  }

  return { keysRestored: count, exportedAt: bundle.exportedAt };
}
