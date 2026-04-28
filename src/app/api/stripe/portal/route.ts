/**
 * Stripe Customer Portal session.
 *
 * Creates a one-time portal session URL for the currently authenticated user
 * and redirects them there. The portal lets users:
 *   - Cancel their subscription (effective at end of billing period)
 *   - Switch between monthly and yearly
 *   - Update payment method
 *   - View invoice history
 *
 * Requires:
 *   - Clerk session (user must be logged in)
 *   - publicMetadata.stripeCustomerId (set by webhook on first checkout)
 *   - Customer Portal enabled in Stripe Dashboard:
 *     https://dashboard.stripe.com/test/settings/billing/portal
 *
 * Usage from client:
 *   <a href="/api/stripe/portal">Manage subscription</a>
 *
 * Errors:
 *   401 if not logged in
 *   400 if user has no stripeCustomerId (i.e. never subscribed)
 *   500 if Stripe is not configured or portal session creation fails
 */
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import type { TierMetadata } from '@/lib/userTier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

function getReturnUrl(req: Request): string {
  // Prefer the request origin (works across preview deployments + custom domain)
  try {
    const url = new URL(req.url);
    return `${url.origin}/dashboard`;
  } catch {
    return process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      : 'https://seedquill.com/dashboard';
  }
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    );
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.publicMetadata as TierMetadata;
  const customerId = meta.stripeCustomerId;

  if (!customerId) {
    // User never went through checkout. Send them to pricing instead of erroring.
    return NextResponse.redirect(new URL('/pricing', req.url));
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: getReturnUrl(req),
    });
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error('Stripe portal session creation failed', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Common failure: portal not configured in Stripe Dashboard.
    return NextResponse.json(
      {
        error: 'portal_unavailable',
        reason: message,
        hint: 'Enable the Customer Portal at dashboard.stripe.com/settings/billing/portal',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
