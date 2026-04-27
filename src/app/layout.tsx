import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'SeedQuill — Plant the seed. Grow the story.',
  description:
    'A writing studio for novelists. AI-augmented manuscript drafting that learns your voice.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#5d7a4a',
          colorBackground: '#faf7f0',
          colorText: '#2a2419',
          colorInputBackground: '#faf7f0',
          colorInputText: '#2a2419',
          colorTextSecondary: '#6b6357',
          borderRadius: '0.5rem',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        elements: {
          card: 'bg-cream border border-edge shadow-md',
          headerTitle: 'font-display text-bark',
          headerSubtitle: 'text-muted',
          formButtonPrimary: 'bg-bark hover:opacity-95 text-cream',
          footerActionLink: 'text-sage-deep hover:text-sage',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
          />
        </head>
        <body className="min-h-screen bg-cream text-ink font-sans antialiased">
          <StoreProvider>{children}</StoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
