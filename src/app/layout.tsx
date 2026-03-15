import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Sitemapr — Cyberpunk Sitemap Generator',
  description: 'A premium sitemap generator and web crawler with a cyberpunk interface. Discover, analyze, and export sitemaps from any website.',
  keywords: ['sitemap', 'crawler', 'web scraper', 'SEO', 'sitemap generator'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  themeColor: '#0a0a0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrains.variable} antialiased`}>
        <div className="scanline" aria-hidden="true" />
        <div className="grid-bg min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
