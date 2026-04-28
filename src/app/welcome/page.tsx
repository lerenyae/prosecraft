/**
 * Welcome / plan picker interstitial.
 *
 * After Clerk sign-up, new users land here and must pick a plan before
 * entering the studio. Existing users who already chose a plan (publicMetadata.tier
 * is set) are redirected straight to the dashboard.
 *
 * This is a server component so the auth + tier check happens before any
 * UI flashes. The actual plan choice cards are a client component.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, clerkClient } from '@clerk/nextjs/server';
import type { TierMetadata } from '@/lib/userTier';
import { WelcomePlanCards } from './WelcomePlanCards';

export default async function WelcomePage() {
  const { userId } = await auth();
  if (!userId) {
    // Not logged in: bounce to sign-up and bring them back here after.
    redirect('/sign-up?after_sign_up_url=%2Fwelcome');
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = (user.publicMetadata ?? {}) as TierMetadata;

  // If the user already has a tier set, they've already chosen — don't make
  // them pick again. Send them straight to the studio.
  if (meta.tier === 'pro' || meta.tier === 'free') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-cream py-20 px-6">
      <div className="max-w-[920px] mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-sage-deep tracking-wide uppercase mb-4">
            Welcome to SeedQuill
          </p>
          <h1 className="font-display text-bark text-[44px] sm:text-[56px] leading-[1.05] tracking-[-1.2px] mb-5">
            Pick the plan that fits
            <br />
            <em className="italic text-sage font-medium">where you are.</em>
          </h1>
          <p className="text-[17px] text-muted max-w-[560px] mx-auto leading-[1.55]">
            You can switch or cancel anytime. Your work stays yours either way.
          </p>
        </div>

        <WelcomePlanCards userId={userId} />

        <p className="text-center text-[12px] text-muted/70 tracking-wide mt-12">
          Built on Claude · Anthropic
        </p>

        <p className="text-center text-[13px] text-muted mt-3">
          Already paid?{' '}
          <Link href="/dashboard" className="text-sage-deep underline underline-offset-2 hover:text-sage">
            Skip to your dashboard.
          </Link>
        </p>
      </div>
    </div>
  );
}
