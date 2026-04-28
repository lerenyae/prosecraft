/**
 * Marks the current user as having explicitly chosen the Free (Seedling) tier.
 * Sets publicMetadata.tier = 'free' so the /welcome interstitial stops
 * intercepting them on future sign-ins.
 *
 * The user can still upgrade later via /pricing. This is just a "I picked Free"
 * acknowledgment so the onboarding flow completes.
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import type { TierMetadata } from '@/lib/userTier';

export const runtime = 'nodejs';

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = (user.publicMetadata ?? {}) as TierMetadata;

    // Don't downgrade an existing pro user just because they hit this endpoint.
    if (meta.tier === 'pro') {
      return NextResponse.json({ tier: 'pro', changed: false });
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...meta,
        tier: 'free',
      },
    });

    return NextResponse.json({ tier: 'free', changed: true });
  } catch (err) {
    console.error('select-free failed', err);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}
