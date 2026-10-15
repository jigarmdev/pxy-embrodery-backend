import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navigation from "../components/Navigation";
import JsonLd from "../components/JsonLd";
import { KEYWORDS, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, abs } from "../lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  category: 'design',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US', url: '/', title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  twitter: { card: 'summary_large_image', title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  other: { 'llms-txt': abs('/llms.txt') },
};

const siteJsonLd = [
  { '@context': 'https://schema.org', '@type': 'Organization', '@id': abs('/#org'), name: SITE_NAME, url: SITE_URL, logo: abs('/favicon.ico') },
  { '@context': 'https://schema.org', '@type': 'WebSite', '@id': abs('/#site'), url: SITE_URL, name: SITE_NAME, description: SITE_DESCRIPTION, inLanguage: 'en', publisher: { '@id': abs('/#org') } },
];

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b14",
};

// Runs before first paint: dark by default, honours a saved choice.
const themeInit = `try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">
        <JsonLd data={siteJsonLd} />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-indigo-600 focus:text-white focus:px-3 focus:py-2 focus:rounded-lg">Skip to content</a>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
