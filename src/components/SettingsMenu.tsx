'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import {
  Settings,
  CreditCard,
  Sparkles,
  Download,
  RotateCcw,
  LogOut,
  X,
} from 'lucide-react';
import { downloadBackup, restoreBackup } from '@/lib/backup';

interface SettingsMenuProps {
  className?: string;
}

/**
 * Settings dropdown for the dashboard top-right.
 *
 * Houses the secondary surface so the dashboard header stays clean for
 * first-run users. Contents:
 *   - Manage subscription (Pro) / Upgrade (Free)
 *   - Backup
 *   - Restore
 *   - Sign out
 */
export default function SettingsMenu({ className = '' }: SettingsMenuProps) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!isLoaded || !user) return null;

  const tier = (user.publicMetadata?.tier as string) || 'free';
  const isPro = tier === 'pro';

  const handleBackup = () => {
    try {
      setBusy(true);
      const { keysExported, filename } = downloadBackup();
      setNote(`Saved ${filename} (${keysExported} keys).`);
    } catch (err) {
      setNote(err instanceof Error ? `Backup failed: ${err.message}` : 'Backup failed.');
    } finally {
      setBusy(false);
      setTimeout(() => setNote(null), 4000);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const ok = window.confirm(
      'Restoring will REPLACE all your current SeedQuill data with the contents of this backup. This cannot be undone. Continue?'
    );
    if (!ok) return;
    try {
      setBusy(true);
      const { keysRestored, exportedAt } = await restoreBackup(file);
      const when = exportedAt ? ` (backup from ${new Date(exportedAt).toLocaleString()})` : '';
      setNote(`Restored ${keysRestored} keys${when}. Reloading...`);
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setNote(err instanceof Error ? `Restore failed: ${err.message}` : 'Restore failed.');
      setBusy(false);
      setTimeout(() => setNote(null), 5000);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors text-[var(--color-text-secondary)]"
        title="Settings"
        aria-label="Settings"
        aria-expanded={open}
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Hidden restore input shared by the dropdown action */}
      <input
        ref={restoreInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleRestoreFile}
      />

      {open && (
        <div className="absolute right-0 mt-2 w-[260px] z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
          {/* Header: who's signed in + tier */}
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)]">Signed in as</p>
            <p className="text-sm text-[var(--color-text-primary)] truncate font-medium">
              {user.primaryEmailAddress?.emailAddress || user.username || 'You'}
            </p>
            <p className="text-[11px] mt-1">
              <span className={isPro ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}>
                {isPro ? 'Author plan' : 'Seedling (Free)'}
              </span>
            </p>
          </div>

          {/* Plan management */}
          <div className="py-1.5 border-b border-[var(--color-border-light)]">
            {isPro ? (
              <a
                href="/api/stripe/portal"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                <CreditCard className="w-4 h-4 text-[var(--color-text-muted)]" />
                Manage subscription
              </a>
            ) : (
              <Link
                href="/pricing"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                Upgrade to Author
              </Link>
            )}
          </div>

          {/* Data */}
          <div className="py-1.5 border-b border-[var(--color-border-light)]">
            <button
              type="button"
              onClick={() => {
                handleBackup();
              }}
              disabled={busy}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors disabled:opacity-50 text-left"
            >
              <Download className="w-4 h-4 text-[var(--color-text-muted)]" />
              Download backup
            </button>
            <button
              type="button"
              onClick={() => restoreInputRef.current?.click()}
              disabled={busy}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors disabled:opacity-50 text-left"
            >
              <RotateCcw className="w-4 h-4 text-[var(--color-text-muted)]" />
              Restore from backup
            </button>
          </div>

          {/* Sign out */}
          <div className="py-1.5">
            <button
              type="button"
              onClick={() => signOut({ redirectUrl: '/' })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-[var(--color-text-muted)]" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Toast for backup/restore status */}
      {note && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-lg flex items-start gap-3">
          <p className="text-xs text-[var(--color-text-secondary)] flex-1">{note}</p>
          <button
            type="button"
            onClick={() => setNote(null)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
