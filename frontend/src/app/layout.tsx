import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur-md dark:border-purple-900/50 dark:bg-[#0d0b11]/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
                Berlin Culture
              </h1>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Your queer + indie guide to Berlin
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-400 dark:border-purple-900/50 dark:text-stone-500">
          From SO36 to Sinema Transtopia &mdash; your Berlin, curated.
        </footer>
      </body>
    </html>
  );
}
