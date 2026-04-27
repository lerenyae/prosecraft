'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { AlertTriangle, Sparkles } from 'lucide-react';

const FREE_CAP = 30_000;
const SOFT_WARN_AT = 25_000;

interface WordCapBannerProps {
  wordCount: number;
}

/**
 * Shown above the editor when free-tier writers approach or exceed
 * the 30k manuscript cap. Pro users never see this.
 */
export default function WordCapBanner({ wordCount }: WordCapBannerProps) {
  const { user, isLoaded } = useUser();

  // Hide while Clerk hydrates, or for Pro users.
  if (!isLoaded || !user) return null;
  const tier = (user.publicMetadata?.tier as string) || 'free';
  if (tier === 'pro') return null;

  if (wordCount < SOFT_WARN_AT) return null;

  const overCap = wordCount >= FREE_CAP;
  const remaining = Math.max(0, FREE_CAP - wordCount);

  return (
    <div
      className={`flex-shrink-0 px-4 py-2.5 border-b text-xs flex items-center justify-between gap-3 ${
        overCap
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
          : 'bg-[var(--color-accent)]/8 border-[var(--color-accent)]/20 text-[var(--color-text-primary)]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {overCap ? (
            <>
              You have hit the {FREE_CAP.toLocaleString()}-word free cap on this manuscript ({wordCount.toLocaleString()} words). Existing work stays intact, but Author plan removes the ceiling.
            </>
          ) : (
            <>
              {remaining.toLocaleString()} words left on the Seedling plan ({wordCount.toLocaleString()} of {FREE_CAP.toLocaleString()}). Upgrade before you hit the cap.
            </>
          )}
        </span>
      </div>
      <Link
        href="/pricing"
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--color-accent)] text-[var(--color-bg-primary)] font-medium hover:bg-[var(--color-accent-dark)] transition-colors"
      >
        <Sparkles className="w-3 h-3" />
        Upgrade
      </Link>
    </div>
  );
}
