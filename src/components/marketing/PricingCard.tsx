'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Billing } from '@/lib/pricing';

export type PricingCardProps = {
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number; // total per year
  billing: Billing;
  cta: {
    label: string;
    href: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  };
  ctaVariant: 'primary' | 'secondary';
  features: string[];
  featured?: boolean;
  badge?: string;
  /** Custom price-period suffix override (used for "/ forever" on Seedling) */
  forever?: boolean;
};

export function PricingCard({
  name,
  tagline,
  monthlyPrice,
  yearlyPrice,
  billing,
  cta,
  ctaVariant,
  features,
  featured = false,
  badge,
  forever = false,
}: PricingCardProps) {
  const isFree = monthlyPrice === 0 && yearlyPrice === 0;

  const bigPrice = isFree
    ? 0
    : billing === 'yearly'
    ? Math.round(yearlyPrice / 12)
    : monthlyPrice;

  const subline = isFree
    ? null
    : billing === 'yearly'
    ? `$${yearlyPrice} billed yearly \u00b7 save $${monthlyPrice * 12 - yearlyPrice}`
    : 'billed monthly';

  return (
    <article
      className={cn(
        'relative rounded-[14px] p-9 transition-shadow',
        featured
          ? 'bg-bark text-cream shadow-[0_30px_60px_-20px_rgba(42,36,25,0.18),0_8px_20px_-8px_rgba(42,36,25,0.08)]'
          : 'bg-cream text-bark border border-edge'
      )}
    >
      {badge && (
        <span
          className={cn(
            'absolute top-4 right-4 inline-flex items-center rounded-full px-3 py-1 text-[11px] uppercase tracking-[1.5px] font-semibold',
            featured ? 'bg-sage text-cream' : 'bg-sage-soft text-sage-deep'
          )}
        >
          {badge}
        </span>
      )}

      <h3 className="font-display text-[22px] font-semibold mb-1.5">{name}</h3>
      <p
        className={cn(
          'text-[14px] mb-7',
          featured ? 'text-cream/70' : 'text-muted'
        )}
      >
        {tagline}
      </p>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span
            className="font-display font-medium leading-none tracking-[-2px]"
            style={{ fontSize: 56 }}
          >
            ${bigPrice}
          </span>
          <span
            className={cn(
              'text-[14px]',
              featured ? 'text-cream/70' : 'text-muted'
            )}
          >
            {forever ? '/ forever' : '/ month'}
          </span>
        </div>
        {subline && (
          <p
            className={cn(
              'mt-1.5 text-[13px]',
              featured ? 'text-cream/70' : 'text-muted'
            )}
          >
            {subline}
          </p>
        )}
      </div>

      <Link
        href={cta.href}
        onClick={cta.onClick}
        className={cn(
          'block w-full text-center rounded-lg py-3.5 font-medium text-[15px] transition-opacity hover:opacity-95',
          ctaVariant === 'primary'
            ? featured
              ? 'bg-cream text-bark'
              : 'bg-bark text-cream'
            : 'bg-cream text-bark border border-edge hover:bg-cream-2 transition-colors'
        )}
      >
        {cta.label}
      </Link>

      <hr
        className={cn(
          'my-6 border-0 border-t',
          featured ? 'border-cream/15' : 'border-edge'
        )}
      />

      <ul className="space-y-3.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14px] leading-snug">
            <Check
              size={15}
              className={cn(
                'mt-0.5 shrink-0',
                featured ? 'text-sage' : 'text-sage'
              )}
            />
            <span
              className={cn(
                featured ? 'text-cream/90' : 'text-bark'
              )}
              dangerouslySetInnerHTML={{
                __html: boldifyMarkdown(f),
              }}
            />
          </li>
        ))}
      </ul>
    </article>
  );
}

function boldifyMarkdown(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
