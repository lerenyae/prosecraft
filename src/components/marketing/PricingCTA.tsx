'use client';

import Link from 'next/link';

export function PricingCTA() {
  return (
    <section className="bg-cream py-[100px] px-14 text-center">
      <h2 className="font-display text-[56px] font-medium text-bark tracking-[-1.5px] leading-[1.05] mb-6">
        Stop renting <em className="italic text-sage">tools.</em>
        <br />
        Start finishing <em className="italic text-sage">books.</em>
      </h2>
      <p className="text-[17px] text-muted max-w-[480px] mx-auto mb-9 leading-[1.55]">
        The blank page is free. The studio that helps you fill it is ten dollars a month.
      </p>
      <Link
        href="/studio"
        className="inline-flex items-center bg-bark text-cream py-3.5 px-7 rounded-lg font-medium text-[15px] hover:opacity-95 transition-opacity"
      >
        Start writing →
      </Link>
      <p className="mt-5 text-[13px] text-muted">
        No credit card · cancel anytime · your work stays yours
      </p>
    </section>
  );
}
