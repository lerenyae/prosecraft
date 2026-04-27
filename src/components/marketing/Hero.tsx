import Link from 'next/link';

export function Hero() {
  return (
    <section className="pt-[120px] pb-[100px] px-14 max-w-[1200px] mx-auto text-center">
      <span className="inline-flex items-center gap-2 bg-sage-soft text-sage-deep py-1.5 px-3.5 rounded-full text-[13px] font-medium mb-7 border border-sage/20">
        <span className="w-1.5 h-1.5 rounded-full bg-sage" />
        Now in beta · joining 1,200 novelists
      </span>

      <h1 className="font-display font-medium text-bark text-[84px] leading-none tracking-[-3px] mb-6">
        Plant the seed.
        <br />
        <em className="italic text-sage font-medium">Grow the story.</em>
      </h1>

      <p className="text-[20px] text-muted max-w-[580px] mx-auto mb-10 leading-[1.55]">
        A writing studio for novelists. Outline, draft, and revise your manuscript with AI that
        learns your voice — not someone else&apos;s.
      </p>

      <div className="flex gap-3 justify-center mb-[60px]">
        <Link
          href="/studio"
          className="bg-bark text-cream py-3.5 px-7 rounded-lg font-medium text-[15px] hover:opacity-95 transition-opacity"
        >
          Start your manuscript
        </Link>
        <Link
          href="#demo"
          className="bg-cream text-bark py-3.5 px-7 rounded-lg font-medium text-[15px] border border-edge hover:bg-cream-2 transition-colors"
        >
          Watch demo →
        </Link>
      </div>

      <div className="flex justify-center gap-8 text-[13px] text-muted">
        <MetaItem>Free to start</MetaItem>
        <MetaItem>Your voice, learned</MetaItem>
        <MetaItem>Export to DOCX, PDF</MetaItem>
      </div>
    </section>
  );
}

function MetaItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-sage font-semibold">✓</span>
      {children}
    </span>
  );
}
