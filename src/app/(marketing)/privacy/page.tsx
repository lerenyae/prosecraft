import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy · SeedQuill',
  description:
    "How SeedQuill handles your manuscripts, account data, and AI processing. Plain-English, writer-first.",
};

export default function PrivacyPage() {
  return (
    <article className="max-w-[760px] mx-auto px-6 sm:px-14 py-20">
      <header className="mb-12">
        <p className="text-sm font-medium text-sage-deep tracking-wide uppercase mb-3">
          Legal
        </p>
        <h1 className="font-display text-bark text-[44px] sm:text-[52px] leading-[1.05] tracking-[-1px] mb-4">
          Privacy Policy
        </h1>
        <p className="text-[14px] text-muted">
          Last updated: April 27, 2026 · Effective immediately
        </p>
      </header>

      <div className="prose-content text-[16px] text-bark/85 leading-[1.75] space-y-6">
        <p className="text-[18px] text-bark italic border-l-2 border-sage pl-4">
          Plain English: your manuscripts are yours. We don&apos;t train models on your work.
          We collect the minimum needed to run the product. You can delete your account anytime.
        </p>

        <Section title="Who we are">
          <p>
            SeedQuill is a writing studio for novelists, operated by LeRenyae Watkins. We&apos;re
            reachable at{' '}
            <a className="text-sage-deep underline" href="mailto:hello@seedquill.com">
              hello@seedquill.com
            </a>
            .
          </p>
        </Section>

        <Section title="What we collect">
          <ul>
            <li>
              <strong>Account information:</strong> email address, name (if provided), and
              authentication identifiers from Clerk (our auth provider).
            </li>
            <li>
              <strong>Subscription data:</strong> Stripe customer ID, plan tier, and renewal
              status. We never see your card number — Stripe handles that.
            </li>
            <li>
              <strong>Usage metadata:</strong> daily AI assist count (resets each day), Pro
              status, project word counts (so we can warn you about plan caps).
            </li>
            <li>
              <strong>Manuscript content:</strong> stored locally in your browser by default.
              When you use an AI feature, the relevant chapter or selection is sent to
              Anthropic&apos;s API for processing, then discarded after the response is returned.
            </li>
          </ul>
        </Section>

        <Section title="What we don't do">
          <ul>
            <li>We do not train models on your manuscripts.</li>
            <li>We do not sell your data to third parties.</li>
            <li>We do not place trackers on you for advertising.</li>
            <li>
              We do not store your manuscript content on our servers unless you explicitly
              opt in to cloud sync (not yet available).
            </li>
          </ul>
        </Section>

        <Section title="How AI processing works">
          <p>
            SeedQuill is built on Claude, made by Anthropic. When you click Beta Reader,
            Style Profile, Inline Rewrite, or any AI-powered tool, the relevant text from your
            manuscript is sent to Anthropic&apos;s API, processed, and the response is returned
            to your browser. Anthropic&apos;s policy is{' '}
            <a
              className="text-sage-deep underline"
              href="https://www.anthropic.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              not to train on API content
            </a>
            .
          </p>
        </Section>

        <Section title="Cookies + auth">
          <p>
            We use Clerk for authentication, which sets standard session cookies so you stay
            signed in. We do not use third-party analytics or advertising cookies.
          </p>
        </Section>

        <Section title="Your rights">
          <ul>
            <li>
              <strong>Access:</strong> request a copy of your account data at any time by
              emailing hello@seedquill.com.
            </li>
            <li>
              <strong>Deletion:</strong> request full account deletion. Your manuscripts are
              local-first, so they live in your browser — clear browser data and they&apos;re
              gone. Server-side account data is removed within 30 days.
            </li>
            <li>
              <strong>Portability:</strong> use the Backup feature in Settings to download
              your full project as JSON.
            </li>
            <li>
              <strong>Cancellation:</strong> cancel your subscription anytime via the Customer
              Portal. Existing manuscripts remain intact.
            </li>
          </ul>
        </Section>

        <Section title="Children">
          <p>
            SeedQuill is not directed to children under 13. We do not knowingly collect data
            from anyone under 13. If you believe we have, contact us and we&apos;ll delete it.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make material changes, we&apos;ll notify active users by email and update
            the &quot;Last updated&quot; date. Continued use after a change means you accept
            the revised policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy or your data:{' '}
            <a className="text-sage-deep underline" href="mailto:hello@seedquill.com">
              hello@seedquill.com
            </a>
            . We aim to respond within 3 business days.
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
