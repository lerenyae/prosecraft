import Link from 'next/link';

/**
 * Custom 404 page.
 * On-brand. Quiet. Keeps the writer-built voice even when something's missing.
 */
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-6 py-20">
      <div className="max-w-[520px] mx-auto text-center">
        <p className="text-sm font-medium text-sage-deep tracking-wide uppercase mb-4">
          404 · page not found
        </p>
        <h1 className="font-display text-bark text-[52px] sm:text-[68px] leading-[1.05] tracking-[-1.5px] mb-6">
          This chapter
          <br />
          <em className="italic text-sage font-medium">isn&apos;t written yet.</em>
        </h1>
        <p className="text-[16px] text-muted leading-[1.6] max-w-[420px] mx-auto mb-8">
          The page you&apos;re looking for got cut in revision, or it never made it past the
          outline. Either way, it&apos;s not here.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="bg-bark text-cream py-3 px-6 rounded-lg font-medium text-[15px] hover:opacity-95 transition-opacity"
          >
            Back to the start
          </Link>
          <Link
            href="/dashboard"
            className="bg-cream text-bark py-3 px-6 rounded-lg font-medium text-[15px] border border-edge hover:bg-cream-2 transition-colors"
          >
            Open the studio →
          </Link>
        </div>
      </div>
    </main>
  );
}
