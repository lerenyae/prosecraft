'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';

type Manuscript = {
  id: string;
  title: string;
  wordCount: number;
  chapters: { id: string; title: string; progress: number }[];
};

const SAMPLE_MANUSCRIPTS: Manuscript[] = [
  {
    id: 'the-hollow-garden',
    title: 'The Hollow Garden',
    wordCount: 23412,
    chapters: [
      { id: 'unmarked-paths', title: '1. Unmarked Paths', progress: 1 },
      { id: 'threshold', title: '2. Threshold', progress: 0.6 },
      { id: 'salt-and-iron', title: '3. Salt and Iron', progress: 0.2 },
      { id: 'cold-bloom', title: '4. Cold Bloom', progress: 0 },
    ],
  },
  { id: 'shorthand', title: 'Shorthand', wordCount: 8104, chapters: [] },
  { id: 'untitled', title: 'Untitled (memoir)', wordCount: 1240, chapters: [] },
];

const WORKSPACE_LINKS = [
  { id: 'characters', label: 'Characters', href: '/studio/characters' },
  { id: 'bible', label: 'Story bible', href: '/studio/bible' },
  { id: 'rules', label: 'Writing rules', href: '/studio/rules' },
  { id: 'export', label: 'Export', href: '/studio/export' },
  { id: 'settings', label: 'Settings', href: '/studio/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  const activeProjectId = parts[1];
  const activeChapterId = parts[2];

  return (
    <aside className="bg-cream-2 border-r border-edge py-5 px-3.5 overflow-y-auto flex flex-col">
      <div className="mb-5 flex items-center">
        <Logo size={24} fontSize={18} />
      </div>

      <div className="mb-5">
        <input
          type="text"
          placeholder="⌕  Search manuscripts..."
          className="w-full bg-cream border border-edge rounded-md px-3 py-2 text-[13px] text-bark placeholder:text-muted focus:outline-none focus:border-sage transition-colors"
        />
      </div>

      <SectionHeader>Manuscripts</SectionHeader>
      <ul className="mb-6 space-y-0.5">
        {SAMPLE_MANUSCRIPTS.map((m) => {
          const isActiveProject = m.id === activeProjectId;
          const firstChapterId = m.chapters[0]?.id;
          const target = firstChapterId ? `/studio/${m.id}/${firstChapterId}` : '#';
          return (
            <li key={m.id}>
              <Link
                href={target}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                  isActiveProject ? 'bg-bark text-cream' : 'text-bark hover:bg-cream'
                )}
              >
                <span className="truncate">{m.title}</span>
                <span
                  className={cn(
                    'shrink-0 text-[11px] rounded-md px-1.5 py-0.5',
                    isActiveProject ? 'bg-cream/15 text-cream' : 'bg-cream text-muted'
                  )}
                >
                  {(m.wordCount / 1000).toFixed(1)}k
                </span>
              </Link>
              {isActiveProject && m.chapters.length > 0 && (
                <ul className="mt-1 mb-2">
                  {m.chapters.map((c) => {
                    const isActiveChapter = c.id === activeChapterId;
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/studio/${m.id}/${c.id}`}
                          className={cn(
                            'block py-[5px] pl-[22px] pr-2 text-[12px]',
                            isActiveChapter ? 'text-sage-deep font-medium' : 'text-muted hover:text-bark transition-colors'
                          )}
                        >
                          {c.title}
                          <span className="block mt-1 h-[2px] w-full rounded-full bg-edge overflow-hidden">
                            <span className="block h-full bg-sage" style={{ width: `${Math.round(c.progress * 100)}%` }} />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <SectionHeader>Workspace</SectionHeader>
      <ul className="space-y-0.5">
        {WORKSPACE_LINKS.map((l) => (
          <li key={l.id}>
            <Link href={l.href} className="block rounded-md px-2.5 py-2 text-[13px] text-bark hover:bg-cream transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] uppercase tracking-[1.2px] text-muted font-semibold mb-2 px-2.5">{children}</h3>
  );
}
