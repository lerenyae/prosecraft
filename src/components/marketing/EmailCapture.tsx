'use client';

import { useState } from 'react';
import { Mail, Check } from 'lucide-react';

/**
 * Lightweight newsletter signup.
 *
 * Drop into the bottom of the landing page (above Footer) so visitors who
 * aren't ready to sign up have a low-friction way to follow along.
 * Posts to /api/newsletter — same design works in About, blog footer, etc.
 */
export function EmailCapture({
  source = 'landing',
  className = '',
}: {
  source?: string;
  className?: string;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'failed');
      }
      setDone(true);
      setEmail('');
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`bg-cream px-6 sm:px-14 py-20 ${className}`}>
      <div className="max-w-[640px] mx-auto text-center">
        <p className="text-sm font-medium text-sage-deep tracking-wide uppercase mb-3">
          Stay in the loop
        </p>
        <h2 className="font-display text-bark text-[32px] sm:text-[40px] leading-[1.1] tracking-[-1px] mb-4">
          Updates that don&apos;t waste your time.
        </h2>
        <p className="text-[15px] text-muted leading-[1.6] max-w-[520px] mx-auto mb-7">
          Monthly notes from the founder. New features, craft tips, the occasional teardown.
          No spam. Unsubscribe with one click.
        </p>

        {done ? (
          <div className="inline-flex items-center gap-2 bg-sage-soft text-sage-deep py-3 px-5 rounded-lg text-[15px] font-medium border border-sage/20">
            <Check className="w-4 h-4" />
            You&apos;re in. Watch for the first note.
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="flex flex-col sm:flex-row gap-2 max-w-[440px] mx-auto"
          >
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@where-you-write.com"
                disabled={busy}
                className="w-full bg-cream-2 border border-edge rounded-lg pl-9 pr-4 py-3 text-[15px] text-bark placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage transition-colors disabled:opacity-50"
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="bg-bark text-cream py-3 px-6 rounded-lg font-medium text-[15px] hover:opacity-95 transition-opacity disabled:opacity-50 whitespace-nowrap"
            >
              {busy ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        )}

        {err && !done && (
          <p className="mt-3 text-[13px] text-red-600">
            {err === 'invalid_email' ? 'That email looks off. Try again?' : 'Something went wrong. Try again.'}
          </p>
        )}
      </div>
    </section>
  );
}
