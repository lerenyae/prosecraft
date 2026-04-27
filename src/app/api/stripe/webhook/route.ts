/**
 * Stripe webhook handler.
 *
 * Listens for:
 *   - checkout.session.completed -> mark user as Pro
 *   - customer.subscription.deleted -> revert user to Free
 *
 * Stripe dashboard config:
 *   Endpoint URL: https://seedquill.com/api/stripe/webhook
 *   Events: checkout.session.completed, customer.subscription.deleted
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY    (sk_live_...)
 *   STRIPE_WEBHOOK_SECRET (whsec_...)
 *
 * Payment Link must be configured to pass client_reference_id=<clerkUserId>.
 */
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { clerkClient } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return new Response('Stripe not configured', { status: 500 });
  }

  const body = await req.text();
  const sig = (await headers()).get('stripe-signature');
  if (!sig) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;

      if (!userId) {
        console.warn('Stripe checkout completed without client_reference_id');
        return new Response('OK', { status: 200 });
      }

      const client = await clerkClient();
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          tier: 'pro',
          stripeCustomerId: customerId,
          proSince: new Date().toISOString(),
        },
      });
      console.log(`Promoted user ${userId} to pro (customer ${customerId})`);
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const customer = await stripe.customers.retrieve(customerId);

      if ('email' in customer && customer.email) {
        const client = await clerkClient();
        const users = await client.users.getUserList({
          emailAddress: [customer.email],
        });
        const user = users.data[0];
        if (user) {
          await client.users.updateUserMetadata(user.id, {
            publicMetadata: {
              tier: 'free',
              stripeCustomerId: customerId,
            },
          });
          console.log(`Reverted user ${user.id} to free (subscription cancelled)`);
        }
      }
    }
  } catch (err) {
    console.error('Stripe webhook handler error', err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
