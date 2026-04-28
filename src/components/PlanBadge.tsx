'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

interface PlanBadgeProps {
  className?: string;
}

/**
 * Plan badge for dashboard / studio headers.
 *
 * Reads tier from Clerk publicMetadata. Free is the default.
 * Author users link to the Stripe Customer Portal so they can manage or
 * cancel their subscription.
 * Free users link to /pricing.
 */
export default function PlanBadge({ className = '' }: PlanBadgeProps) {
  const { user, isLoaded } = useUser();
  if (!isLoaded || !user) return null;

  const tier = (user.publicMetadata?.tier as string) || 'free';
  const isPro = tier === 'pro';

  if (isPro) {
    return (
      <a
        href="/api/stripe/portal"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-dark)] text-[var(--color-bg-primary)] hover:opacity-95 transition-opacity ${className}`}
        title="Author plan. Click to manage or cancel your subscription."
      >
        <Sparkles className="w-3 h-3" />
        Author
      </a>
    );
  }

  return (
    <Link
      href="/pricing"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)] transition-colors ${className}`}
      title="On the free Seedling plan. Click to see Author."
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
      Seedling
      <span className="text-[var(--color-accent)] ml-0.5">·</span>
      <span className="text-[var(--color-accent)]">Upgrade</span>
    </Link>
  );
}
