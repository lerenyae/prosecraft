import Link from 'next/link';

export const metadata = {
  title: 'About SeedQuill — A writing studio built by a writer',
  description:
    'SeedQuill is built by a novelist for novelists. Our mission is to put a top editor at every writer\u2019s side, every step of the way.',
};

export default function AboutPage() {
  return (
    <article className="bg-cream">
      <section className="max-w-[760px] mx-auto px-6 sm:px-10 py-20 sm:py-28">
        <p className="text-sm font-medium text-sage-deep tracking-wide uppercase mb-5">
          About SeedQuill
        </p>
        <h1 className="font-display text-bark text-[56px] leading-[1.05] tracking-[-1.5px] mb-7 sm:text-[68px]">
          Built by a writer.
          <br />
          <em className="italic text-sage font-medium">For writers of every kind.</em>
        </h1>
        <p className="text-[19px] text-muted leading-[1.65] mb-10">
          SeedQuill exists because the tools writers use today don&apos;t fit the way stories
          actually get made. Word processors treat a 90,000-word manuscript like a long letter.
          Generative AI tools either hijack your voice or spit out something forgettable. There
          was no quiet, careful place to write a real book — with a real editor close by.
        </p>

        <div className="border-l-2 border-sage pl-6 my-12">
          <p className="font-display italic text-bark text-[24px] leading-[1.4] mb-3">
            &ldquo;I want every writer to feel what it&apos;s like to have a top editor right next to
            them — every chapter, every revision, every late-night doubt.&rdquo;
          </p>
          <p className="text-sm text-muted">— LeRenyae, founder</p>
        </div>

        <h2 className="font-display text-bark text-[34px] tracking-[-0.5px] mt-16 mb-5">
          The story behind it
        </h2>
        <p className="text-[17px] text-muted leading-[1.7] mb-5">
          I&apos;m a writer first. I know what it feels like to stare at a blank page knowing the
          shape of the scene but not the sentence. I know the loneliness of a fourth draft. I know
          how rare a thoughtful editor is, and how much one careful note can change a book.
        </p>
        <p className="text-[17px] text-muted leading-[1.7] mb-5">
          SeedQuill is the tool I wished I had. It helps you outline a story without losing the
          thread, draft a chapter without losing your voice, and revise with the kind of
          structural and line-level feedback that used to take a year of workshops and a stack of
          rejection letters to access.
        </p>
        <p className="text-[17px] text-muted leading-[1.7] mb-12">
          It is intentionally <em>not</em> a content factory. It will never write your book for
          you. It will sit beside you, learn how you write, and ask the questions a great editor
          would ask.
        </p>

        <h2 className="font-display text-bark text-[34px] tracking-[-0.5px] mt-12 mb-5">
          What we believe
        </h2>
        <ul className="space-y-5 mb-14">
          {BELIEFS.map((belief) => (
            <li key={belief.title} className="border border-edge bg-cream-2 rounded-lg p-6">
              <p className="font-display text-bark text-[19px] mb-2">{belief.title}</p>
              <p className="text-muted text-[15px] leading-[1.6]">{belief.body}</p>
            </li>
          ))}
        </ul>

        <h2 className="font-display text-bark text-[34px] tracking-[-0.5px] mt-12 mb-5">
          Who it&apos;s for
        </h2>
        <p className="text-[17px] text-muted leading-[1.7] mb-12">
          Novelists working on their first book. Career authors deep into book six. Memoirists,
          screenwriters, ghostwriters, fanfic writers, hybrid authors. If you&apos;re trying to
          tell a long-form story well, you belong here.
        </p>

        <div className="bg-bark text-cream rounded-2xl p-10 sm:p-12 text-center my-16">
          <h2 className="font-display text-cream text-[32px] mb-4 tracking-[-0.5px]">
            Plant the seed.
          </h2>
          <p className="text-cream/80 text-[16px] mb-7 max-w-[440px] mx-auto leading-[1.6]">
            Start your first manuscript free. Bring an outline or a single scene — SeedQuill will
            meet you where you are.
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-cream text-bark py-3.5 px-7 rounded-lg font-medium text-[15px] hover:opacity-95 transition-opacity"
          >
            Start free
          </Link>
        </div>
      </section>
    </article>
  );
}

const BELIEFS = [
  {
    title: 'Your voice is the product.',
    body:
      'AI should learn how you write — your rhythm, your imagery, your pet phrases — and protect it. Generic prose is the enemy.',
  },
  {
    title: 'A great editor asks the hard questions.',
    body:
      'We don\u2019t hand you finished sentences. We surface the structural and line-level questions a thoughtful editor would raise, then leave the writing to you.',
  },
  {
    title: 'Writing is private until you choose otherwise.',
    body:
      'Your manuscript is yours. We don\u2019t train models on your work. We don\u2019t share it. You can export your full project to DOCX, PDF, or JSON at any time.',
  },
  {
    title: 'Tools should respect the craft.',
    body:
      'No streaks. No badges. No AI nudges that interrupt a sentence. SeedQuill is calm on purpose — the studio gets out of the way so the work can land.',
  },
];
