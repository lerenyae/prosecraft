'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { PricingCard } from './PricingCard';
import { PRICING, type Billing } from '@/lib/pricing';

const SEEDLING_FEATURES = [
  '1 active manuscript',
  '10 AI assists per day',
  'Style Profiler (basic)',
  'TXT export',
  'Local storage on your device',
  'Manuscript up to 30,000 words',
];

const AUTHOR_FEATURES = [
  '**Unlimited manuscripts**',
  '**Unlimited AI assists**',
  'Full Style Profiler with voice fingerprint',
  'Beta Reader (chapter-level developmental notes)',
  'Inline Rewrite (Improve / Tighten / Expand / Tone)',
  'Dialogue Coach',
  'Story Intelligence (beats, arcs, continuity)',
  'DOCX, PDF, TXT, JSON export',
  'Industry-standard manuscript formatting',
  'No word limit per manuscript',
  'Priority support',
];

const MONTHLY_LINK = process.env.NEXT_PUBLIC_STRIPE_AUTHOR_MONTHLY_LINK ?? '';
const YEARLY_LINK = process.env.NEXT_PUBLIC_STRIPE_AUTHOR_YEARLY_LINK ?? '';

function buildCheckoutUrl(base: string, userId: string | null): string {
  if (!base) return '/sign-up';
  if (!userId) return '/sign-up?after_sign_up_url=/pricing';
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}client_reference_id=${encodeURIComponent(userId)}`;
}

export function PricingTiers({ billing }: { billing: Billing }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const userId = isLoaded && user ? user.id : null;

  const authorHref =
    billing === 'yearly'
      ? buildCheckoutUrl(YEARLY_LINK, userId)
      : buildCheckoutUrl(MONTHLY_LINK, userId);

  const handleAuthorClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isLoaded) {
      e.preventDefault();
      return;
    }
    if (!user) {
      e.preventDefault();
      router.push('/sign-up?after_sign_up_url=/pricing');
    }
  };

  return (
    <section className="max-w-[900px] mx-auto py-[60px] px-14">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PricingCard
          name={PRICING.seedling.name}
          tagline="For first chapters and short stories."
          monthlyPrice={PRICING.seedling.monthly}
          yearlyPrice={PRICING.seedling.yearly}
          billing={billing}
          forever
          cta={{ label: 'Start writing \u2192', href: '/dashboard' }}
          ctaVariant="secondary"
          features={SEEDLING_FEATURES}
        />
        <PricingCard
          name={PRICING.author.name}
          tagline="For finishing the novel."
          monthlyPrice={PRICING.author.monthly}
          yearlyPrice={PRICING.author.yearly}
          billing={billing}
          cta={{
            label: 'Begin your manuscript \u2192',
            href: authorHref,
            onClick: handleAuthorClick,
          }}
          ctaVariant="primary"
          features={AUTHOR_FEATURES}
          featured
          badge="Most writers pick this"
        />
      </div>
    </section>
  );
}
