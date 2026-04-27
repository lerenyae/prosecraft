import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream py-16 px-6">
      <SignUp />
    </div>
  );
}
