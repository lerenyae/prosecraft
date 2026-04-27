'use client';

import { BillingToggle } from './BillingToggle';
import type { Billing } from '@/lib/pricing';

type Props = {
  billing: Billing;
  onBillingChange: (next: Billing) => void;
};

export function PricingHero({ billing, onBillingChange }: Props) {
  return (
    <section className="pt-[100px] pb-[60px] px-14 max-w-[900px] mx-auto text-center">
      <span className="inline-flex items-center gap-2 bg-sage-soft text-sage-deep py-1.5 px-3.5 rounded-full text-[13px] font-medium mb-7 border border-sage/20">
        <span className="w-1.5 h-1.5 rounded-full bg-sage" />
        Pricing · simple, fair, no surprises
      </span>

      <h1 className="font-display font-medium text-bark text-[72px] leading-[1.05] tracking-[-2.5px] mb-6">
        One price.
        <br />
        <em className="italic text-sage font-medium">The whole studio.</em>
      </h1>

      <p className="text-[19px] text-muted max-w-[540px] mx-auto leading-[1.55] mb-10">
        Free to start. Affordable when you&apos;re ready. No per-word fees, no AI credits to count,
        no surprise charges.
      </p>

      <div className="flex justify-center">
        <BillingToggle value={billing} onChange={onBillingChange} />
      </div>
    </section>
  );
}
