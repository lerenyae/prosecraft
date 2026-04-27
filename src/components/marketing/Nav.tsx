import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { Logo } from '@/components/ui/Logo';

export async function Nav() {
  const { userId } = await auth();

  return (
    <nav className="sticky top-0 z-10 flex items-center justify-between bg-cream border-b border-edge py-[22px] px-14">
      <Logo />
      <ul className="flex gap-8 list-none text-sm text-muted font-medium">
        <li>
          <Link href="/#product" className="text-muted hover:text-bark transition-colors">
            Product
          </Link>
        </li>
        <li>
          <Link href="/#writers" className="text-muted hover:text-bark transition-colors">
            For writers
          </Link>
        </li>
        <li>
          <Link href="/about" className="text-muted hover:text-bark transition-colors">
            About
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
      <div className="flex gap-3.5 items-center">
        {userId ? (
          <>
            <Link
              href="/dashboard"
              className="bg-bark text-cream py-[9px] px-[18px] rounded-md text-sm font-medium hover:opacity-95 transition-opacity"
            >
              Open studio
            </Link>
            <UserButton />
          </>
        ) : (
          <>
            <Link href="/sign-in" className="text-bark text-sm font-medium hover:opacity-80">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="bg-bark text-cream py-[9px] px-[18px] rounded-md text-sm font-medium hover:opacity-95 transition-opacity"
            >
              Start free
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
