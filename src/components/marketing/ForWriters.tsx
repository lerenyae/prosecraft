import Link from 'next/link';

export function ForWriters() {
  return (
    <section
      id="writers"
      className="px-6 sm:px-14 py-24 sm:py-32 scroll-mt-24"
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-sage-deep tracking-wide uppercase mb-4">
            For writers of every kind
          </p>
          <h2 className="font-display text-bark text-[44px] sm:text-[56px] leading-[1.05] tracking-[-1.2px] mb-5">
            Whatever you&apos;re writing,
            <br />
            <em className="italic text-sage font-medium">SeedQuill meets you here.</em>
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {PERSONAS.map((p) => (
            <div
              key={p.name}
              className="border border-edge bg-cream rounded-xl p-6 hover:border-sage/40 transition-colors"
            >
              <p className="font-display text-bark text-[20px] mb-2">{p.name}</p>
              <p className="text-muted text-[14.5px] leading-[1.6]">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link
            href="/sign-up"
            className="inline-block bg-bark text-cream py-3.5 px-7 rounded-lg font-medium text-[15px] hover:opacity-95 transition-opacity"
          >
            Start your manuscript free
          </Link>
        </div>
      </div>
    </section>
  );
}

const PERSONAS = [
  {
    name: 'First-time novelists',
    body:
      'Outline a story without losing the thread. Draft chapter one without losing the nerve. SeedQuill teaches as it edits.',
  },
  {
    name: 'Career authors',
    body:
      'Manage book six like book one, with manuscript-wide consistency, voice profiles, and a reading partner who actually finished your last draft.',
  },
  {
    name: 'Memoirists',
    body:
      'Shape lived experience into a structured story. SeedQuill helps with pacing, scene order, and tone without flattening your truth.',
  },
  {
    name: 'Short story + novella writers',
    body:
      'Draft a collection without losing each story’s voice. Style Profile keeps every piece distinct, Beta Reader sharpens the close, export submission-ready DOCX.',
  },
  {
    name: 'Ghostwriters',
    body:
      'Lock POV and voice profile per project. Switch clients without bleeding one voice into another. Export per client, cleanly.',
  },
  {
    name: 'Hybrid + indie authors',
    body:
      'Plan a release, manage a series bible, draft a sequel, and export print-ready DOCX in one studio. No more tab juggling.',
  },
];
