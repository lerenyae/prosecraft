import { SignUp } from '@clerk/nextjs';

/**
 * Sign-up page.
 *
 * After successful sign-up, Clerk redirects to /welcome where the user
 * is forced to choose a plan (Seedling free or Author paid). The
 * /welcome page itself bounces existing users with a tier already set
 * straight to /dashboard, so this redirect is safe for repeat sign-ins
 * via the same component.
 */
export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream py-16 px-6">
      <SignUp
        forceRedirectUrl="/welcome"
        signInForceRedirectUrl="/dashboard"
      />
    </div>
  );
}
