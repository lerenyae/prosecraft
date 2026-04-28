import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

/**
 * Site footer.
 *
 * Standard four-column footer common to every premium SaaS:
 * brand + tagline, product links, resources, legal.
 * Premium products always have a proper footer — it's a trust signal.
 */
export function Footer() {
  return (
    <footer className="bg-cream-2 border-t border-edge px-6 sm:px-14 pt-16 pb-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size={28} fontSize={20} />
            <p className="mt-4 text-[14px] text-muted leading-[1.6] max-w-[240px]">
              A writing studio for novelists. Plant the seed. Grow the story.
            </p>
            <p className="mt-5 text-[12px] text-muted/80 leading-[1.6]">
              Built on Claude · Anthropic
              <br />
              Made by{' '}
              <a
                href="https://lerenyaewatkins.com"
                className="underline decoration-edge hover:decoration-bark hover:text-bark transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                LeRenyae Watkins
              </a>
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-[12px] font-semibold text-bark uppercase tracking-wide mb-4">
              Product
            </p>
            <ul className="space-y-2.5 text-[14px]">
              <li>
                <Link href="/#product" className="text-muted hover:text-bark transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#writers" className="text-muted hover:text-bark transition-colors">
                  For writers
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-muted hover:text-bark transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="text-muted hover:text-bark transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-[12px] font-semibold text-bark uppercase tracking-wide mb-4">
              Company
            </p>
            <ul className="space-y-2.5 text-[14px]">
              <li>
                <Link href="/about" className="text-muted hover:text-bark transition-colors">
                  About
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@seedquill.com"
                  className="text-muted hover:text-bark transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="https://lerenyaewatkins.com"
                  className="text-muted hover:text-bark transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Founder
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[12px] font-semibold text-bark uppercase tracking-wide mb-4">
              Legal
            </p>
            <ul className="space-y-2.5 text-[14px]">
              <li>
                <Link href="/privacy" className="text-muted hover:text-bark transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted hover:text-bark transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="text-muted hover:text-bark transition-colors">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-edge flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[13px] text-muted">© 2026 SeedQuill. All rights reserved.</p>
          <p className="text-[13px] text-muted italic">Plant the seed. Grow the story.</p>
        </div>
      </div>
    </footer>
  );
}
