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
 * Read tier for any user by ID. Use sparingly - hits Clerk API.
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
