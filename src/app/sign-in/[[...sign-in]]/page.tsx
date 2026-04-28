import { SignIn } from '@clerk/nextjs';

/**
 * Sign-in page.
 *
 * Existing users always land on /dashboard after sign-in. New users
 * who somehow reach sign-in instead of sign-up still get sent to
 * /welcome to pick a plan (the welcome page short-circuits to
 * dashboard if they already have a tier set, so this is safe).
 */
export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream py-16 px-6">
      <SignIn
        forceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/welcome"
      />
    </div>
  );
}
