/**
 * GET /api/me/quota
 *
 * Returns the current user's AI assist quota state. Used by the QuotaBadge
 * component to render a live counter and reset time.
 *
 * Shape:
 *   { tier: 'pro', unlimited: true }
 *   { tier: 'free', unlimited: false, used: 3, limit: 10, resetAt: ISO8601 }
 *   { tier: 'anonymous', unlimited: false }   (401)
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import {
  ensureOwnerPromotion,
  FREE_DAILY_AI_LIMIT,
  type TierMetadata,
} from '@/lib/userTier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DailyUsage = { date?: string; count?: number };

function todayKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function tomorrowResetIso(): string {
  const now = new Date();
  const reset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return reset.toISOString();
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { tier: 'anonymous', unlimited: false },
      { status: 401 }
    );
  }

  // Lazy owner promotion — first call after sign-in flips owners to Pro.
  await ensureOwnerPromotion(userId);

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.publicMetadata as TierMetadata & { dailyAi?: DailyUsage };

  if (meta.tier === 'pro') {
    return NextResponse.json({ tier: 'pro', unlimited: true });
  }

  const today = todayKey();
  const usage = meta.dailyAi || {};
  const used = usage.date === today ? usage.count ?? 0 : 0;

  return NextResponse.json({
    tier: 'free',
    unlimited: false,
    used,
    limit: FREE_DAILY_AI_LIMIT,
    resetAt: tomorrowResetIso(),
  });
}
