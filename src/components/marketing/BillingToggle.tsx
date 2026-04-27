'use client';

import type { Billing } from '@/lib/pricing';
import { cn } from '@/lib/cn';

type BillingToggleProps = {
  value: Billing;
  onChange: (next: Billing) => void;
};

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Billing period"
      className="inline-flex items-center bg-cream-2 border border-edge rounded-full p-1"
    >
      <Pill active={value === 'monthly'} onClick={() => onChange('monthly')}>
        Monthly
      </Pill>
      <Pill active={value === 'yearly'} onClick={() => onChange('yearly')}>
        Yearly
        <span className="ml-1.5 text-[11px] opacity-80">· save 2 months</span>
      </Pill>
    </div>
  );
}

function Pill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-5 py-2 text-[14px] font-medium transition-colors duration-150',
        active ? 'bg-bark text-cream' : 'text-muted hover:text-bark'
      )}
    >
      {children}
    </button>
  );
}
