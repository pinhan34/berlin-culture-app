import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

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
  title: "Berlin Culture App",
  description: "Your queer and indie guide to events, exhibitions, and community happenings across Berlin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
                Venues
              </a>
            </nav>
          </div>
          <div className="h-[3px] bg-gradient-to-r from-pink-500 via-fuchsia-500 via-purple-500 via-blue-400 via-teal-400 via-green-400 to-amber-400" />
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-400 dark:border-purple-900/50 dark:text-stone-500">
          From SO36 to Sinema Transtopia &mdash; your Berlin, curated.
        </footer>
      </body>
    </html>
  );
}
