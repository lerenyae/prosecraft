import { Hero } from '@/components/marketing/Hero';
import { Features } from '@/components/marketing/Features';
import { ForWriters } from '@/components/marketing/ForWriters';
import { FounderBio } from '@/components/marketing/FounderBio';
import { EmailCapture } from '@/components/marketing/EmailCapture';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <ForWriters />
      <FounderBio />
      <EmailCapture source="landing" />
    </>
  );
}
