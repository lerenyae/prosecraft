import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'ProseCraft',
  description: 'AI Writing Studio for Fiction and Nonfiction Authors',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans antialiased"
      >
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
