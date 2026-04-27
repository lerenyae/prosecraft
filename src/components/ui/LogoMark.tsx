import { cn } from '@/lib/cn';

export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center bg-bark text-cream rounded-md font-display font-bold leading-none',
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.57),
      }}
      aria-label="SeedQuill"
    >
      S
    </span>
  );
}
