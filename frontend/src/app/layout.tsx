import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from "@/lib/site";
import { ConsentBanner } from "@/components/ConsentBanner";
import { VisitTracker } from "@/components/VisitTracker";
import { hasAffiliateConfig } from "@/lib/affiliate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} \u2014 ${SITE_TAGLINE}`,
    template: `%s \u00B7 ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Berlin events",
    "what's on in Berlin",
    "things to do in Berlin",
    "Berlin this weekend",
    "queer events Berlin",
    "indie Berlin",
    "neurodivergent Berlin",
    "Berlin nightlife",
    "Berlin exhibitions",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} \u2014 ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} \u2014 ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md dark:bg-[#0d0b11]/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <a href="/" className="block">
              <h1 className="font-heading text-lg font-bold tracking-tight bg-gradient-to-r from-fuchsia-600 via-pink-500 to-fuchsia-600 bg-clip-text text-transparent dark:from-fuchsia-400 dark:via-pink-400 dark:to-fuchsia-400">
                Berlin Culture
              </h1>
              <p className="text-xs font-medium bg-gradient-to-r from-fuchsia-400 via-amber-400 to-teal-400 bg-clip-text text-transparent dark:from-fuchsia-300 dark:via-amber-300 dark:to-teal-300">
                Your queer + indie guide to Berlin
              </p>
            </a>
            <nav>
              <a
                href="/venues"
                className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-fuchsia-700 hover:shadow-md active:scale-95 dark:bg-fuchsia-500 dark:shadow-fuchsia-500/20 dark:hover:bg-fuchsia-600 dark:hover:shadow-fuchsia-500/30"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                Venues & Communities
              </a>
            </nav>
          </div>
          <div className="h-[3px] bg-gradient-to-r from-pink-500 via-fuchsia-500 via-purple-500 via-blue-400 via-teal-400 via-green-400 to-amber-400" />
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 py-6 dark:border-purple-900/50">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:px-6">
            <p className="text-xs text-stone-400 dark:text-stone-500">
              From SO36 to Sinema Transtopia &mdash; your Berlin, curated.
            </p>
            {hasAffiliateConfig() && (
              <p className="max-w-xl text-[11px] text-stone-400 dark:text-stone-500">
                Some ticket links are affiliate links: if you buy through them we may earn a
                small commission at no extra cost to you. It helps keep the app free, and we
                never change prices or reorder events for commission.
              </p>
            )}
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-stone-400 dark:text-stone-500">
              <a href="/impressum" className="hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-colors">
                Impressum
              </a>
              <span aria-hidden="true">&middot;</span>
              <a href="/privacy" className="hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-colors">
                Privacy
              </a>
            </nav>
          </div>
        </footer>
        <ConsentBanner />
        <VisitTracker />
      </body>
    </html>
  );
}
