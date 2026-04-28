import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service · SeedQuill',
  description: 'The terms governing your use of SeedQuill. Plain English, writer-friendly.',
};

export default function TermsPage() {
  return (
    <article className="max-w-[760px] mx-auto px-6 sm:px-14 py-20">
      <header className="mb-12">
        <p className="text-sm font-medium text-sage-deep tracking-wide uppercase mb-3">
          Legal
        </p>
        <h1 className="font-display text-bark text-[44px] sm:text-[52px] leading-[1.05] tracking-[-1px] mb-4">
          Terms of Service
        </h1>
        <p className="text-[14px] text-muted">
          Last updated: April 27, 2026 · Effective immediately
        </p>
      </header>

      <div className="text-[16px] text-bark/85 leading-[1.75] space-y-6">
        <p className="text-[18px] text-bark italic border-l-2 border-sage pl-4">
          Plain English: your work is yours, you can cancel anytime, and we&apos;ll act in good
          faith. This page is the legal long-form of that promise.
        </p>

        <Section title="1. Agreement">
          <p>
            By using SeedQuill (the &quot;Service&quot;) at seedquill.com, you agree to these
            Terms. The Service is operated by LeRenyae Watkins (&quot;we,&quot; &quot;us&quot;).
            If you do not agree, do not use the Service.
          </p>
        </Section>

        <Section title="2. Your account">
          <p>
            You need a SeedQuill account to use the Service. You are responsible for keeping
            your credentials secure. You must be at least 13 years old. You agree to provide
            accurate information and keep it current.
          </p>
        </Section>

        <Section title="3. Subscriptions and billing">
          <ul>
            <li>
              SeedQuill offers a free Seedling tier and a paid Author tier. Author is billed
              monthly or yearly via Stripe.
            </li>
            <li>
              Your subscription auto-renews until cancelled. You can cancel anytime from the
              Customer Portal in your account settings.
            </li>
            <li>
              <strong>Monthly plans:</strong> cancellation is effective at the end of your
              current billing cycle. No refunds for partial months.
            </li>
            <li>
              <strong>Yearly plans:</strong> cancellation is effective at the end of your
              annual term. No refunds for unused time, with one exception: if you cancel
              within 14 days of initial yearly purchase, email us for a full refund.
            </li>
            <li>
              We may change pricing with 30 days&apos; notice. If we raise prices, existing
              subscribers keep their current rate at least through their next renewal.
            </li>
          </ul>
        </Section>

        <Section title="4. Your content">
          <ul>
            <li>
              <strong>You own your manuscripts.</strong> Full stop. SeedQuill does not claim
              any rights to anything you write.
            </li>
            <li>We do not train AI models on your manuscript content.</li>
            <li>
              You grant us a limited license to process your content solely to deliver the
              Service (e.g., sending a chapter to the AI for Beta Reader analysis). This
              license ends the moment you delete the content or your account.
            </li>
            <li>
              You are responsible for the legality of what you write. Don&apos;t use SeedQuill
              to create content that violates law (e.g., child sexual abuse material,
              targeted harassment, copyright infringement at scale).
            </li>
          </ul>
        </Section>

        <Section title="5. Acceptable use">
          <p>You agree not to:</p>
          <ul>
            <li>Reverse-engineer or attempt to extract our model prompts or weights.</li>
            <li>Use SeedQuill to generate content that violates applicable law.</li>
            <li>Resell, sublicense, or redistribute the Service.</li>
            <li>Abuse the AI quota system (e.g., automation, scraping).</li>
            <li>Harm other users, the Service, or third parties.</li>
          </ul>
          <p>We may suspend or terminate accounts that violate these rules.</p>
        </Section>

        <Section title="6. AI disclaimers">
          <p>
            SeedQuill uses AI (Claude, by Anthropic). AI output can be wrong, biased, or
            occasionally bizarre. SeedQuill suggests; you decide. You are responsible for
            reviewing AI suggestions before accepting them into your work.
          </p>
          <p>
            Do not use AI-generated text without human review for high-stakes contexts (legal,
            medical, financial, etc.). SeedQuill is built for fiction and creative writing.
          </p>
        </Section>

        <Section title="7. Service availability">
          <p>
            SeedQuill is in active development. We aim for high uptime but make no guarantees.
            We are not liable for losses from downtime, data loss, or service interruption.
            Use the Backup feature regularly — we&apos;ll never delete your local-first work,
            but browsers can.
          </p>
        </Section>

        <Section title="8. Disclaimers and liability">
          <p className="uppercase text-[13px] tracking-wide">
            The Service is provided &quot;as is,&quot; without warranty of any kind, express or
            implied. To the maximum extent permitted by law, we are not liable for indirect,
            incidental, special, consequential, or punitive damages, or for lost profits or
            data. Our total liability for any claim is capped at the amount you paid us in the
            12 months prior to the event giving rise to the claim.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            You can stop using the Service at any time. We can suspend or terminate accounts
            that violate these Terms. On termination, your right to use the Service ends, but
            your manuscripts remain yours and (for local-first storage) remain in your browser.
            Use the Backup feature to keep a copy.
          </p>
        </Section>

        <Section title="10. Changes to these terms">
          <p>
            We may update these Terms. Material changes will be announced via email to active
            users and the &quot;Last updated&quot; date will move. Continued use after a change
            means you accept the revised Terms.
          </p>
        </Section>

        <Section title="11. Governing law">
          <p>
            These Terms are governed by the laws of the United States. Any dispute will be
            handled in good faith and, if unresolved, in the appropriate state or federal
            courts.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions:{' '}
            <a className="text-sage-deep underline" href="mailto:hello@seedquill.com">
              hello@seedquill.com
            </a>
            . We&apos;re a small team. We respond.
          </p>
        </Section>
      </div>

      <div className="mt-16 pt-8 border-t border-edge text-center">
        <Link
          href="/"
          className="text-sage-deep underline underline-offset-2 hover:text-sage transition-colors"
        >
          ← Back to SeedQuill
        </Link>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:leading-[1.65]">
      <h2 className="font-display text-bark text-[24px] tracking-[-0.5px] mt-10 mb-3">{title}</h2>
      {children}
    </section>
  );
}
