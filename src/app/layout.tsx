import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  metadataBase: new URL('https://seedquill.com'),
  title: {
    default: 'SeedQuill · A writing studio for novelists',
    template: '%s · SeedQuill',
  },
  description:
    'A quiet writing studio with a thoughtful editor close by. Built on Claude. Made by a novelist, for novelists.',
  applicationName: 'SeedQuill',
  authors: [{ name: 'LeRenyae Watkins', url: 'https://lerenyaewatkins.com' }],
  creator: 'LeRenyae Watkins',
  publisher: 'SeedQuill',
  keywords: [
    'AI writing studio',
    'novelists',
    'manuscript editor',
    'beta reader',
    'voice profile',
    'Claude',
    'Anthropic',
    'writing software',
    'developmental editor',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://seedquill.com',
    siteName: 'SeedQuill',
    title: 'SeedQuill · A writing studio for novelists',
    description:
      'A quiet writing studio with a thoughtful editor close by. Built on Claude. Made by a novelist, for novelists.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'SeedQuill — Plant the seed. Grow the story.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SeedQuill · A writing studio for novelists',
    description:
      'Built on Claude. Made by a novelist. Beta Reader, voice fingerprint, tracked AI changes.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: '/favicon.ico',
  },
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
