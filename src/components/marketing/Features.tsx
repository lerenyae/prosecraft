export function Features() {
  return (
    <section
      id="product"
      className="bg-cream-2 border-y border-edge px-6 sm:px-14 py-24 sm:py-32 scroll-mt-24"
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-sage-deep tracking-wide uppercase mb-4">
            The studio
          </p>
          <h2 className="font-display text-bark text-[44px] sm:text-[56px] leading-[1.05] tracking-[-1.2px] mb-5">
            A real editor.
            <br />
            <em className="italic text-sage font-medium">In your manuscript.</em>
          </h2>
          <p className="text-[18px] text-muted max-w-[560px] mx-auto leading-[1.55]">
            SeedQuill is a quiet writing studio with a thoughtful editor close by — the kind of
            feedback most writers wait years to access.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-cream border border-edge rounded-2xl p-7 sm:p-8 hover:border-sage/40 transition-colors"
            >
              <div className="text-sage-deep font-display text-[28px] mb-3">{f.icon}</div>
              <h3 className="font-display text-bark text-[22px] mb-3 leading-[1.25]">
                {f.title}
              </h3>
              <p className="text-muted text-[15px] leading-[1.6]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: '✦',
    title: 'Drafts that sound like you',
    body:
      'SeedQuill learns your voice from your prose — rhythm, imagery, sentence shape — and protects it on every suggestion. No generic AI mush.',
  },
  {
    icon: '◇',
    title: 'Quick Scan, deep read',
    body:
      'A live developmental edit on every chapter. Pacing flags, POV slips, filter words, character-voice drift, all click-to-highlighted in your text.',
  },
  {
    icon: '◎',
    title: 'Whole-Book chat',
    body:
      'Ask the model anything about your manuscript and it has read all of it. Plot holes, motif tracking, foreshadowing — answered with citations.',
  },
  {
    icon: '✸',
    title: 'Writing rules you set',
    body:
      'Lock POV, tense, era, and banned phrases per project. The AI obeys your rules — not whatever your last prompt said.',
  },
  {
    icon: '◐',
    title: 'Track changes you control',
    body:
      'Every AI edit shows up as a tracked change. Accept individually, accept all, or reject — with a clean change summary so you know what shifted.',
  },
  {
    icon: '⌘',
    title: 'Export to anywhere',
    body:
      'DOCX with novel formatting, PDF with per-chapter page breaks, JSON backup of your full project. Your work is yours, always.',
  },
];
