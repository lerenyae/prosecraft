'use client';

import { cn } from '@/lib/cn';

export type StatRow = { label: string; value: string };

type AICardProps = {
  tag: string;
  timestamp?: string;
  title: string;
  body?: string;
  stats?: StatRow[];
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  className?: string;
};

export function AICard({
  tag,
  timestamp,
  title,
  body,
  stats,
  actionLabel,
  onAction,
  loading,
  className,
}: AICardProps) {
  return (
    <article className={cn('bg-cream border border-edge rounded-lg p-3.5 mb-2.5 text-bark', className)}>
      <header className="flex items-center justify-between mb-2">
        <span className="bg-sage-soft text-sage-deep text-[10px] font-semibold tracking-[1px] uppercase rounded-full px-2 py-0.5">
          {tag}
        </span>
        {timestamp && <span className="text-[10px] text-muted">{timestamp}</span>}
      </header>

      <h4 className="font-display text-[14px] font-semibold text-bark mb-1.5 leading-tight">{title}</h4>

      {body && (
        <p className="font-sans text-[12px] text-muted leading-[1.5] mb-2.5 whitespace-pre-line">{body}</p>
      )}

      {stats && stats.length > 0 && (
        <ul className="border-t border-edge mt-2 mb-1">
          {stats.map((s) => (
            <li key={s.label} className="flex items-center justify-between py-1.5 border-b border-edge last:border-0 text-[12px]">
              <span className="text-muted">{s.label}</span>
              <span className="text-bark font-medium">{s.value}</span>
            </li>
          ))}
        </ul>
      )}

      {actionLabel && (
        <button
          onClick={onAction}
          disabled={loading}
          className="mt-2 w-full bg-bark text-cream rounded-md py-2.5 text-[12px] font-medium hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Working…' : actionLabel}
        </button>
      )}
    </article>
  );
}
