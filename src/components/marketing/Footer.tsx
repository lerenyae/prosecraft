import { Logo } from '@/components/ui/Logo';

export function Footer() {
  return (
    <footer className="bg-cream border-t border-edge py-8 px-14 flex items-center justify-between flex-wrap gap-4">
      <Logo size={24} fontSize={18} />
      <p className="text-[13px] text-muted">
        © 2026 · seedquill.com · Plant the seed. Grow the story.
      </p>
    </footer>
  );
}
