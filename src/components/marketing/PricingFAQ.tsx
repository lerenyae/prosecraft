'use client';

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Do my words and manuscripts belong to me?',
    a: "Always. Every word you write in SeedQuill is yours. We don't train models on your manuscripts, we don't claim any rights to your work, and we don't sell your data. Your manuscripts are stored locally on your device until you choose to sync.",
  },
  {
    q: 'What counts as an "AI assist" on the free plan?',
    a: "Any time you use a craft tool — Beta Reader, Inline Rewrite, Quick Scan, Dialogue Coach, or Chat. Ten per day is enough to revise a chapter or get unstuck. If you're hitting the limit regularly, you're probably ready for Author.",
  },
  {
    q: 'Is there a free trial of Author?',
    a: 'The Seedling tier is the free trial. We’d rather you actually finish a chapter on Free than panic-write during a 7-day countdown. Upgrade when you’re ready.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your account settings, no email required. If you’re on yearly and cancel mid-cycle, you keep access until the term ends.',
  },
  {
    q: 'What happens to my work if I downgrade?',
    a: "Nothing. Your manuscripts stay intact. You'll just be limited to one active manuscript and the Seedling AI cap. Archive the rest until you're ready to come back.",
  },
  {
    q: 'Do you offer discounts for students or NaNoWriMo participants?',
    a: 'Yes — reach out during November and we’ll get you set up. Email hello@seedquill.com.',
  },
  {
    q: 'Will pricing change?',
    a: 'If we raise prices, anyone already subscribed keeps their current rate. Lock in early if you want.',
  },
  {
    q: 'Is there a team or publisher plan?',
    a: "Not yet. SeedQuill is built for solo novelists. If you're a writing coach or small press and need multi-seat access, email us.",
  },
];

export function PricingFAQ() {
  return (
    <section className="bg-cream-2 py-[100px] px-14">
      <div className="max-w-[760px] mx-auto">
        <p className="text-center text-sage-deep text-[13px] uppercase tracking-[2px] font-semibold mb-3">
          questions writers ask
        </p>
        <h2 className="font-display text-[42px] font-medium text-bark text-center tracking-[-1px] mb-12">
          Honest answers, <em className="italic text-sage">upfront.</em>
        </h2>

        <ul>
          {FAQ.map((item, i) => (
            <li key={i} className="border-b border-edge py-6 last:border-b-0">
              <h3 className="font-display text-[20px] font-semibold text-bark mb-2">{item.q}</h3>
              <p className="text-[15px] text-muted leading-[1.65] max-w-[600px]">{item.a}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
