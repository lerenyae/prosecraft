'use client';

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

export function PricingTiers({ billing }: { billing: Billing }) {
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
          cta={{ label: 'Start writing →', href: '/studio' }}
          ctaVariant="secondary"
          features={SEEDLING_FEATURES}
        />
        <PricingCard
          name={PRICING.author.name}
          tagline="For finishing the novel."
          monthlyPrice={PRICING.author.monthly}
          yearlyPrice={PRICING.author.yearly}
          billing={billing}
          cta={{ label: 'Begin your manuscript →', href: '/studio' }}
          ctaVariant="primary"
          features={AUTHOR_FEATURES}
          featured
          badge="Most writers pick this"
        />
      </div>
    </section>
  );
}
