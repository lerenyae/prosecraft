'use client';

/**
 * Live quota counter shown in the dashboard header.
 *
 * - Pro / Author: shows "Unlimited · Author" in sage.
 * - Free / Seedling: shows "X of 10 · resets in Yh Zm" with color states:
 *     - sage when used < 8
 *     - amber when used >= 8
 *     - red when used >= limit
 *
 * Self-polls /api/me/quota every 30s. Components that consume an AI assist
 * can call window.dispatchEvent(new Event('seedquill:quota-changed')) and
 * this badge will refetch immediately. aiFetch wires this up automatically.
 */
import { useCallback, useEffect, useState } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';

type QuotaState =
  | { tier: 'pro'; unlimited: true }
  | {
      tier: 'free';
      unlimited: false;
      used: number;
      limit: number;
      resetAt: string;
    }
  | { tier: 'anonymous'; unlimited: false }
  | null;

const POLL_MS = 30_000;
const REFRESH_EVENT = 'seedquill:quota-changed';

function formatReset(resetAt: string): string {
  const reset = new Date(resetAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, reset - now);
  const hours = Math.floor(diff / 3600_000);
  const minutes = Math.floor((diff % 3600_000) / 60_000);

  if (hours >= 6) return 'resets at midnight';
  if (hours <= 0) return `resets in ${minutes}m`;
  return `resets in ${hours}h ${minutes}m`;
}

export function QuotaBadge({ className = '' }: { className?: string }) {
  const [state, setState] = useState<QuotaState>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me/quota', { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 401) setState({ tier: 'anonymous', unlimited: false });
        return;
      }
      setState(await res.json());
    } catch {
      // soft fail — badge just won't update
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    const handler = () => refresh();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener(REFRESH_EVENT, handler);
    };
  }, [refresh]);

  // Refresh when tab regains focus — covers users coming back to a tab
  // after their quota reset.
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  if (!state || state.tier === 'anonymous') return null;

  if (state.unlimited) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 bg-sage-soft text-sage-deep py-1 px-2.5 rounded-full text-[12px] font-medium border border-sage/20 ${className}`}
        title="Author plan — unlimited AI assists"
      >
        <Sparkles className="w-3 h-3" />
        Unlimited
      </span>
    );
  }

  const { used, limit, resetAt } = state;
  const remaining = Math.max(0, limit - used);
  const exhausted = remaining <= 0;
  const low = remaining <= 2 && !exhausted;

  const tone = exhausted
    ? 'bg-red-50 text-red-700 border-red-200'
    : low
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-sage-soft text-sage-deep border-sage/20';

  return (
    <span
      className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[12px] font-medium border ${tone} ${className}`}
      title={`${used} of ${limit} AI assists used today · ${formatReset(resetAt)} · Upgrade to Author for unlimited`}
    >
      {exhausted ? (
        <AlertCircle className="w-3 h-3" />
      ) : (
        <Sparkles className="w-3 h-3" />
      )}
      {used} / {limit}
      <span className="text-[11px] opacity-70 hidden sm:inline">
        · {formatReset(resetAt)}
      </span>
    </span>
  );
}

/** Helper for any component that just consumed an assist. */
export function notifyQuotaChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  }
}
