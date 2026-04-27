/**
 * SeedQuill plan tier helpers.
 *
 * Source of truth: Clerk publicMetadata.tier on the user object.
 * Set on successful Stripe checkout via /api/stripe/webhook.
 */
import { auth, clerkClient } from '@clerk/nextjs/server';

export type Tier = 'free' | 'pro';

export type TierMetadata = {
  tier?: Tier;
  stripeCustomerId?: string;
  proSince?: string; // ISO date
};

/**
 * Read the current authenticated user's tier server-side.
 * Defaults to 'free' if no metadata is set.
 */
export async function getCurrentTier(): Promise<Tier> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return 'free';
  const meta = (sessionClaims?.publicMetadata ?? {}) as TierMetadata;
  return meta.tier === 'pro' ? 'pro' : 'free';
}

/**
 * Read tier for any user by ID. Use sparingly — hits Clerk API.
 */
export async function getTierByUserId(userId: string): Promise<Tier> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.publicMetadata as TierMetadata;
  return meta.tier === 'pro' ? 'pro' : 'free';
}

/**
 * Daily AI assist quota for free tier.
 * Pro = unlimited.
 */
export const FREE_DAILY_AI_LIMIT = 10;

/**
 * Free tier word-count ceiling per manuscript.
 * Pro = unlimited.
 */
export const FREE_MANUSCRIPT_WORD_CAP = 30_000;

/**
 * Helper response for routes that should reject free users.
 * Use in API handlers: `if ((await getCurrentTier()) === 'free') return upgradeRequired();`
 */
export function upgradeRequired(reason: string = 'This feature requires the Author plan.') {
  return new Response(
    JSON.stringify({
      error: 'upgrade_required',
      reason,
      upgradeUrl: '/pricing',
    }),
    {
      status: 402,
      headers: { 'content-type': 'application/json' },
    }
  );
}

/**
 * 429 response for free users who have hit their daily AI assist limit.
 */
export function quotaExceeded(
  reason: string = 'Daily AI assist limit reached.',
  resetAt?: string
) {
  return new Response(
    JSON.stringify({
      error: 'quota_exceeded',
      reason,
      upgradeUrl: '/pricing',
      resetAt,
    }),
    {
      status: 429,
      headers: { 'content-type': 'application/json' },
    }
  );
}

type DailyUsage = {
  date?: string; // YYYY-MM-DD UTC
  count?: number;
};

function todayKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function tomorrowResetIso(): string {
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return reset.toISOString();
}

/**
 * Atomic-ish quota check + increment for free users.
 *
 * Returns:
 *   { ok: true, tier: 'pro' }                                 → unlimited
 *   { ok: true, tier: 'free', used, limit, resetAt }          → within limit, counter incremented
 *   { ok: false, tier: 'free', used, limit, resetAt }         → over limit, NOT incremented
 *   { ok: true, tier: 'free', anonymous: true }               → no logged-in user (do not block)
 *
 * NOTE: this uses Clerk publicMetadata as the counter store, so concurrent
 * calls for the same user can race. For day-1 enforcement that's acceptable
 * (worst case one or two extra calls). Move to Redis if abuse appears.
 */
export async function checkAndIncrementAiQuota(): Promise<{
  ok: boolean;
  tier: Tier;
  anonymous?: boolean;
  used?: number;
  limit?: number;
  resetAt?: string;
}> {
  const { userId } = await auth();
  if (!userId) {
    // Anonymous routes shouldn't normally hit AI endpoints, but if they do,
    // don't enforce here — the route can still authorize separately.
    return { ok: true, tier: 'free', anonymous: true };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.publicMetadata as TierMetadata & { dailyAi?: DailyUsage };

  if (meta.tier === 'pro') {
    return { ok: true, tier: 'pro' };
  }

  const today = todayKey();
  const usage: DailyUsage = meta.dailyAi || {};
  const usedToday = usage.date === today ? (usage.count ?? 0) : 0;
  const resetAt = tomorrowResetIso();

  if (usedToday >= FREE_DAILY_AI_LIMIT) {
    return {
      ok: false,
      tier: 'free',
      used: usedToday,
      limit: FREE_DAILY_AI_LIMIT,
      resetAt,
    };
  }

  const newCount = usedToday + 1;
  try {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...meta,
        dailyAi: { date: today, count: newCount },
      },
    });
  } catch {
    // If metadata write fails, fail-open so the user is not blocked
    // by infrastructure flakes.
  }

  return {
    ok: true,
    tier: 'free',
    used: newCount,
    limit: FREE_DAILY_AI_LIMIT,
    resetAt,
  };
}

/**
 * Combined gate: returns a Response if the request must be rejected, else null.
 * Use at the top of paid AI routes:
 *   const block = await enforceAiGate({ proOnly: true });
 *   if (block) return block;
 */
export async function enforceAiGate(opts: {
  proOnly?: boolean;
  proOnlyMessage?: string;
}): Promise<Response | null> {
  const tier = await getCurrentTier();
  if (opts.proOnly && tier === 'free') {
    return upgradeRequired(opts.proOnlyMessage);
  }
  const q = await checkAndIncrementAiQuota();
  if (!q.ok) {
    return quotaExceeded(
      `You have used all ${q.limit} free AI assists for today. Resets at midnight UTC.`,
      q.resetAt
    );
  }
  return null;
}
