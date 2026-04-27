'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export default function StudioIndex() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-20">
      <Logo size={36} fontSize={28} href={null} />
      <p className="mt-6 text-muted text-sm max-w-md text-center">
        Pick a manuscript from the sidebar, or open the sample chapter to see the studio in action.
      </p>
      <Link
        href="/studio/the-hollow-garden/threshold"
        className="mt-8 bg-bark text-cream py-3 px-6 rounded-md text-sm font-medium hover:opacity-95 transition-opacity"
      >
        Open sample chapter →
      </Link>
    </div>
  );
}
