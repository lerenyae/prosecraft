import Link from 'next/link';
import { LogoMark } from './LogoMark';
import { cn } from '@/lib/cn';

export function Logo({
  size = 28,
  fontSize = 22,
  href = '/',
  className,
}: {
  size?: number;
  fontSize?: number;
  href?: string | null;
  className?: string;
}) {
  const inner = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span
        className="font-display font-semibold text-bark tracking-[-0.5px] leading-none"
        style={{ fontSize }}
      >
        SeedQuill
      </span>
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="no-underline">
      {inner}
    </Link>
  );
}
