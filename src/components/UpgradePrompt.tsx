'use client';

import Link from 'next/link';
import { Sparkles, Lock, Clock } from 'lucide-react';

interface UpgradePromptProps {
  variant?: 'locked' | 'quota';
  reason?: string;
  upgradeUrl?: string;
  resetAt?: string;
  feature?: string;
  compact?: boolean;
}

/**
 * Reusable upgrade prompt for Free → Author conversions.
 *
 * variant="locked" → feature requires Pro
 * variant="quota"  → daily limit hit, can wait or upgrade
 */
export default function UpgradePrompt({
  variant = 'locked',
  reason,
  upgradeUrl = '/pricing',
  resetAt,
  feature,
  compact = false,
}: UpgradePromptProps) {
  const isQuota = variant === 'quota';
  const Icon = isQuota ? Clock : Lock;
  const title = isQuota
    ? 'Daily AI limit reached'
    : feature
      ? `${feature} is an Author feature`
      : 'Upgrade to unlock';
  const body =
    reason ||
    (isQuota
      ? 'You have used all 10 free AI assists today. Upgrade for unlimited access or come back tomorrow.'
      : 'This is part of the Author plan. Upgrade to keep your draft moving.');

  if (compact) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[var(--color-accent-light)] bg-[var(--color-accent)]/5 p-3 text-sm">
        <Icon className="w-4 h-4 mt-0.5 text-[var(--color-accent)] shrink-0" />
        <div className="flex-1">
          <p className="text-[var(--color-text-primary)] font-medium">{title}</p>
          <p className="text-[var(--color-text-secondary)] text-xs mt-0.5">{body}</p>
        </div>
        <Link
          href={upgradeUrl}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--color-accent)] text-[var(--color-bg-primary)] text-xs font-medium hover:bg-[var(--color-accent-dark)] transition-colors shrink-0"
        >
          <Sparkles className="w-3 h-3" />
          See plans
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-accent-light)] bg-gradient-to-br from-[var(--color-accent)]/5 to-transparent p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-[var(--color-accent)]" />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--color-text-primary)]">{title}</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{body}</p>
          {resetAt && (
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              Resets {new Date(resetAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={upgradeUrl}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent)] text-[var(--color-bg-primary)] text-sm font-medium hover:bg-[var(--color-accent-dark)] transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          See plans
        </Link>
        <Link
          href="/about"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-surface-alt)] transition-colors"
        >
          Why upgrade?
        </Link>
      </div>
    </div>
  );
}
