'use client';

import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface InfoTipProps {
  text: string;
  title?: string;
  /** Override default icon size */
  size?: number;
}

/**
 * Portal-based info tooltip. Renders into <body> so it escapes any parent
 * overflow/clip. Auto-flips left/right based on available viewport space.
 */
export default function InfoTip({ text, title, size = 12 }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'right' | 'left' } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tooltipWidth = 256; // w-64
    const gap = 8;
    const vw = window.innerWidth;

    // Prefer right, flip to left if there's not enough space
    const spaceRight = vw - rect.right;
    const placement: 'right' | 'left' = spaceRight < tooltipWidth + 16 ? 'left' : 'right';

    const top = rect.top + rect.height / 2;
    const left = placement === 'right' ? rect.right + gap : rect.left - gap - tooltipWidth;

    setPos({ top, left, placement });
  }, []);

  // Keep positioned on scroll / resize while open
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = () => updatePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, updatePosition]);

  const tooltip = open && pos && typeof document !== 'undefined' ? createPortal(
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: 'translateY(-50%)',
        width: 256,
        zIndex: 10000,
      }}
      className="p-2.5 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-lg text-[11px] text-[var(--color-text-secondary)] leading-snug text-left normal-case tracking-normal font-normal pointer-events-none"
    >
      {title && (
        <span className="block text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1 font-medium">
          {title}
        </span>
      )}
      {text}
    </div>,
    document.body
  ) : null;

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        aria-label={title || 'More info'}
      >
        <Info size={size} />
      </button>
      {tooltip}
    </span>
  );
}
