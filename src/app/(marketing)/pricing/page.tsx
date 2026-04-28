'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PricingHero } from '@/components/marketing/PricingHero';
import { PricingTiers } from '@/components/marketing/PricingTiers';
import { PricingFAQ } from '@/components/marketing/PricingFAQ';
import { PricingCTA } from '@/components/marketing/PricingCTA';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';
import type { Billing } from '@/lib/pricing';

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingFallback />}>
      <PricingPageInner />
    </Suspense>
  );
}

function PricingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial: Billing =
    searchParams.get('billing') === 'monthly' ? 'monthly' : 'yearly';

  const [billing, setBilling] = useState<Billing>(initial);

  // Reflect into URL for shareability — replace, not push.
  useEffect(() => {
    const current = searchParams.get('billing');
    if (current === billing) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('billing', billing);
    router.replace(`/pricing?${params.toString()}`, { scroll: false });
  }, [billing, router, searchParams]);

  const handleChange = useCallback((next: Billing) => setBilling(next), []);

  return (
    <>
      <PricingHero billing={billing} onBillingChange={handleChange} />
      <PricingTiers billing={billing} />
      <ComparisonTable />
      <PricingFAQ />
      <PricingCTA />
    </>
  );
}

function PricingFallback() {
  // Minimal SSR fallback — same hero shell, defaults to yearly so the static
  // version of the page reads sensibly before hydration.
  return (
    <>
      <PricingHero billing="yearly" onBillingChange={() => {}} />
      <PricingTiers billing="yearly" />
      <PricingFAQ />
      <PricingCTA />
    </>
  );
}
