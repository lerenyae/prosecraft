import Link from 'next/link';

/**
 * Founder bio section.
 *
 * The single biggest emotional moat: SeedQuill is built by a working
 * novelist, not an engineer playing at writing. This section humanizes
 * the brand and makes the "writer-built" claim impossible to copy.
 */
export function FounderBio() {
  return (
    <section className="bg-cream-2 border-t border-edge px-6 sm:px-14 py-24 sm:py-28">
      <div className="max-w-[760px] mx-auto text-center">
        <p className="text-sm font-medium text-sage-deep tracking-wide uppercase mb-4">
          Made by a writer
        </p>

        <h2 className="font-display text-bark text-[36px] sm:text-[44px] leading-[1.1] tracking-[-1px] mb-7">
          Hi, I&apos;m LeRenyae.
          <br />
          <em className="italic text-sage font-medium">
            I made the writing tool I wish I had.
          </em>
        </h2>

        <div className="text-[16px] text-bark/85 leading-[1.7] space-y-5 max-w-[620px] mx-auto text-left sm:text-center">
          <p>
            I&apos;ve been writing novels for years. The tools I tried were either
            built by engineers who&apos;d never finished a manuscript, or AI that
            sounded like AI. So I built SeedQuill.
          </p>
          <p>
            It&apos;s the writing studio I needed. Voice fingerprint that
            actually keeps your style. A Beta Reader that calls out the soft
            spots without rewriting your prose. Writing rules you set, not
            whatever the model felt like that day.
          </p>
          <p>
            Your manuscript is yours. I don&apos;t train models on your work.
            I won&apos;t pretend AI replaces craft. Use SeedQuill if it helps
            you finish. Cancel if it doesn&apos;t.
          </p>
        </div>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center bg-bark text-cream py-3 px-6 rounded-lg font-medium text-[15px] hover:opacity-95 transition-opacity"
          >
            Start your manuscript
          </Link>
          <Link
            href="https://lerenyaewatkins.com"
            className="inline-flex items-center justify-center bg-cream text-bark py-3 px-6 rounded-lg font-medium text-[15px] border border-edge hover:bg-cream-2 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read my writing →
          </Link>
        </div>

        <p className="mt-8 text-[13px] text-muted">
          LeRenyae Watkins · novelist · founder of SeedQuill
        </p>
      </div>
    </section>
  );
}
