'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check } from 'lucide-react';

const MONTHLY_LINK = process.env.NEXT_PUBLIC_STRIPE_AUTHOR_MONTHLY_LINK ?? '';
const YEARLY_LINK = process.env.NEXT_PUBLIC_STRIPE_AUTHOR_YEARLY_LINK ?? '';

function buildCheckoutUrl(base: string, userId: string): string {
  if (!base) return '/pricing';
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}client_reference_id=${encodeURIComponent(userId)}`;
}

interface Props {
  userId: string;
}

export function WelcomePlanCards({ userId }: Props) {
  const router = useRouter();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [busy, setBusy] = useState(false);

  const handleFree = async () => {
    if (busy) return;
    setBusy(true);
    // Persist a 'free' tier selection so the user doesn't bounce back to /welcome
    // every time they sign in. publicMetadata is the source of truth for tier.
    try {
      await fetch('/api/me/select-free', { method: 'POST' });
    } catch {
      // even if this fails, route to dashboard — the user clicked Free
    }
    router.push('/dashboard');
  };

  const handleAuthor = () => {
    const link = billing === 'yearly' ? YEARLY_LINK : MONTHLY_LINK;
    if (!link) {
      router.push('/pricing');
      return;
    }
    window.location.href = buildCheckoutUrl(link, userId);
  };

  const monthlyPriceLabel = billing === 'yearly' ? '$10' : '$14';
  const billingLabel = billing === 'yearly' ? '/mo, billed yearly' : '/month';

  return (
    <>
      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-cream-2 border border-edge rounded-full p-1 text-[13px]">
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              billing === 'monthly'
                ? 'bg-bark text-cream'
                : 'text-muted hover:text-bark'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling('yearly')}
            className={`px-4 py-1.5 rounded-full transition-colors flex items-center gap-2 ${
              billing === 'yearly'
                ? 'bg-bark text-cream'
                : 'text-muted hover:text-bark'
            }`}
          >
            Yearly
            <span
              className={`text-[10px] font-semibold tracking-wide uppercase rounded-full px-1.5 py-0.5 ${
                billing === 'yearly' ? 'bg-sage text-cream' : 'bg-sage-soft text-sage-deep'
              }`}
            >
              Save 28%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Seedling */}
        <div className="bg-cream border border-edge rounded-2xl p-7 flex flex-col">
          <div className="mb-4">
            <p className="font-display text-bark text-[26px] mb-1">Seedling</p>
            <p className="text-muted text-[14px]">For first chapters and short stories.</p>
          </div>
          <div className="mb-6">
            <span className="font-display text-bark text-[40px]">Free</span>
            <span className="text-muted text-[14px] ml-2">forever</span>
          </div>
          <ul className="flex flex-col gap-2.5 mb-7 text-[14px] text-bark/85">
            <Feature>1 active manuscript</Feature>
            <Feature>10 AI assists per day</Feature>
            <Feature>Style Profiler (basic)</Feature>
            <Feature>Manuscript up to 30,000 words</Feature>
            <Feature>Local storage on your device</Feature>
          </ul>
          <button
            type="button"
            onClick={handleFree}
            disabled={busy}
            className="mt-auto w-full bg-cream-2 text-bark border border-edge py-3 rounded-lg font-medium text-[15px] hover:bg-edge/30 transition-colors disabled:opacity-50"
          >
            Continue free
          </button>
        </div>

        {/* Author */}
        <div className="bg-cream border-2 border-sage rounded-2xl p-7 flex flex-col relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sage text-cream text-[11px] font-semibold tracking-wide uppercase px-3 py-1 rounded-full">
            {billing === 'yearly' ? 'Two months, on the house' : 'Finish your novel'}
          </span>
          <div className="mb-4">
            <p className="font-display text-bark text-[26px] mb-1">Author</p>
            <p className="text-muted text-[14px]">For finishing the novel.</p>
          </div>
          <div className="mb-6">
            <span className="font-display text-bark text-[40px]">{monthlyPriceLabel}</span>
            <span className="text-muted text-[14px] ml-2">{billingLabel}</span>
          </div>
          <ul className="flex flex-col gap-2.5 mb-7 text-[14px] text-bark/85">
            <Feature strong>Unlimited manuscripts</Feature>
            <Feature strong>Unlimited AI assists</Feature>
            <Feature>Beta Reader, Inline Rewrite, Dialogue Coach</Feature>
            <Feature>Story Intelligence (beats, arcs, continuity)</Feature>
            <Feature>DOCX, PDF, TXT, JSON export</Feature>
            <Feature>No word limit per manuscript</Feature>
            <Feature>Cancel anytime</Feature>
          </ul>
          <button
            type="button"
            onClick={handleAuthor}
            disabled={busy}
            className="mt-auto w-full bg-bark text-cream py-3 rounded-lg font-medium text-[15px] hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Subscribe to Author
          </button>
        </div>
      </div>
    </>
  );
}

function Feature({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check className="w-4 h-4 mt-0.5 text-sage shrink-0" />
      <span className={strong ? 'font-semibold text-bark' : ''}>{children}</span>
    </li>
  );
}
