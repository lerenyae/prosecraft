/**
 * Newsletter signup endpoint.
 *
 * Accepts an email and stores it. For now: logs to Vercel function logs
 * (visible in the Vercel dashboard under Functions). Later, swap the
 * persistence layer for Resend, ConvertKit, Buttondown, etc.
 *
 * Best-effort design: if the upstream is unconfigured, return 200 with
 * a "received" status so the user gets a clean confirmation. We never
 * leak details about the storage backend.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface Body {
  email?: string;
  source?: string;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const source = (body.source || 'landing').slice(0, 64);

  // Log to Vercel logs. Until we wire a proper provider, this is the
  // simplest persistence: read the function logs and pull addresses.
  console.log(`[newsletter] subscribe email=${email} source=${source} ts=${new Date().toISOString()}`);

  // TODO: when ready, swap to a provider:
  //   await resend.contacts.create({ email, audienceId: process.env.RESEND_AUDIENCE_ID })
  //   await fetch('https://api.buttondown.email/v1/subscribers', { ... })

  return NextResponse.json({ ok: true, status: 'subscribed' });
}
