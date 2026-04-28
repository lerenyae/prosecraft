import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * SeedQuill route protection.
 *
 * Anonymous users can browse:
 *   - /                 (marketing landing)
 *   - /pricing          (pricing page)
 *   - /sign-in/*        (Clerk sign-in)
 *   - /sign-up/*        (Clerk sign-up)
 *   - /api/ai/*         (still public — switch to auth() later if you want gating)
 *
 * Authenticated-only:
 *   - /dashboard, /project, /studio, /welcome
 *   - /api/stripe/portal, /api/me/*  (subscription + account self-service)
 */
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/project(.*)',
  '/studio(.*)',
  '/welcome(.*)',
  '/api/stripe/portal(.*)',
  '/api/me(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals + static files unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
