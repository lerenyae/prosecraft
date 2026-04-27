import Link from 'next/link';

export const metadata = {
  title: 'Changelog \u00b7 SeedQuill',
  description:
    'Release notes for SeedQuill. What we ship, when we ship it, and why it matters for writers.',
};

type Entry = {
  date: string;
  version: string;
  title: string;
  highlights: string[];
};

const ENTRIES: Entry[] = [
  {
    date: 'April 27, 2026',
    version: 'v1.0',
    title: 'SeedQuill is live',
    highlights: [
      'Brand re-launch from ProseCraft to SeedQuill. New voice, new identity, same studio.',
      'Full email + Google sign-in with secure session management.',
      'Custom domain seedquill.com with end-to-end SSL.',
      'Pricing page with monthly and annual plans.',
    ],
  },
  {
    date: 'April 26, 2026',
    version: 'v0.9',
    title: 'Mobile drawer + writing studio polish',
    highlights: [
      'Mobile-responsive layout for the studio with drawer navigation at 390px and below.',
      'Editor toolbar reflows on small screens.',
      'Per-chapter notes field for tracking ideas without leaving the manuscript.',
      'PDF export now respects per-chapter page breaks.',
    ],
  },
  {
    date: 'April 24, 2026',
    version: 'v0.8',
    title: 'AI editor: deeper, faster, more honest',
    highlights: [
      'Whole-Book chat with streaming responses. The AI now reads across chapters.',
      'Click-to-highlight in Quick Scan suggestions.',
      'Bulk-accept change summary so you always know what shifted.',
      'Wired Opus for deep analysis on long passages; Haiku for in-line suggestions.',
    ],
  },
  {
    date: 'April 21, 2026',
    version: 'v0.7',
    title: 'Writing Rules + Style Profiler',
    highlights: [
      'Writing Rules: per-project constraints (POV, tense, banned words) the AI obeys.',
      'Style Profiler: SeedQuill learns your voice from samples and reflects it back.',
      'Style + writer profile now wired into every AI prompt.',
      'Dialogue Coach now produces distinct output per character voice.',
    ],
  },
  {
    date: 'April 18, 2026',
    version: 'v0.6',
    title: 'Onboarding + Story Intelligence',
    highlights: [
      'Onboarding questionnaire on first sign-in to set genre, voice, and goals.',
      'Collapsible Story Intelligence panels (themes, plot beats, consistency).',
      'Search-and-replace across the editor.',
      'Filter words detector with adjustable threshold.',
    ],
  },
  {
    date: 'April 14, 2026',
    version: 'v0.5',
    title: 'Editor + AI Toolbar foundations',
    highlights: [
      'TipTap-based manuscript editor with character-count, link, underline, alignment.',
      'AI Toolbar with side rail + scrollable modal.',
      'Track changes pattern: accept/reject inline edits.',
      'DOCX export tuned for novel manuscript formatting.',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <article className="bg-cream">
      <section className="max-w-[760px] mx-auto px-6 sm:px-10 py-20 sm:py-24">
        <p className="text-sm font-medium text-sage-deep tracking-wide uppercase mb-5">
          Changelog
        </p>
        <h1 className="font-display text-bark text-[52px] leading-[1.05] tracking-[-1.2px] mb-5 sm:text-[60px]">
          What we&apos;ve been shipping.
        </h1>
        <p className="text-[18px] text-muted leading-[1.6] mb-14 max-w-[560px]">
          SeedQuill is built in public. Every release note here is a small bet on giving writers a
          better studio.
        </p>

        <div className="space-y-12 border-l border-edge pl-8 sm:pl-10">
          {ENTRIES.map((entry) => (
            <div key={entry.version} className="relative">
              <span className="absolute -left-[42px] sm:-left-[50px] top-2 w-2.5 h-2.5 rounded-full bg-sage" />
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                {entry.date} {'\u00b7'} {entry.version}
              </p>
              <h2 className="font-display text-bark text-[26px] leading-[1.2] mb-4">
                {entry.title}
              </h2>
              <ul className="space-y-2.5 text-[15.5px] text-muted leading-[1.6]">
                {entry.highlights.map((h) => (
                  <li key={h} className="flex gap-3">
                    <span className="text-sage font-semibold mt-0.5">{'\u2022'}</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 border-t border-edge pt-10 text-center">
          <p className="text-muted text-[15px] mb-5">
            Have a feature you wish SeedQuill shipped next? Tell us.
          </p>
          <Link
            href="mailto:hello@seedquill.com"
            className="inline-block bg-bark text-cream py-3 px-6 rounded-lg font-medium text-[14px] hover:opacity-95 transition-opacity"
          >
            hello@seedquill.com
          </Link>
        </div>
      </section>
    </article>
  );
}
