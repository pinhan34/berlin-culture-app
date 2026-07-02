import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Berlin Culture handles data — what we store, why, and your rights.',
  robots: { index: false },
};

/**
 * Privacy policy / Datenschutzerklärung.
 * ⚠️ DRAFT — accurately reflects the app's current data flows (anonymous
 * interaction logging + local storage), but you must fill the controller details
 * and have it reviewed for GDPR/TTDSG before launch. A German translation is
 * recommended for a Berlin audience.
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
        <strong>Draft.</strong> This reflects how the app actually handles data today, but
        fill in the controller details and have it professionally reviewed (and ideally
        translated to German) before launch.
      </div>

      <h1 className="font-heading text-2xl font-bold text-stone-900 dark:text-stone-100">
        Privacy Policy
      </h1>
      <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
        Last updated: [date]
      </p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">
            1. Who is responsible
          </h2>
          <p className="mt-2 whitespace-pre-line">
            {`Controller: [Full name / company]
[Address], Berlin, Germany
Contact: [your@email.tld]`}
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">
            2. The short version
          </h2>
          <p className="mt-2">
            Berlin Culture works <strong>without accounts</strong> and stores{' '}
            <strong>no personal data such as your name, email address or location</strong>.
            Your personalisation (favourites, taste profile) lives in{' '}
            <strong>your browser</strong>. We additionally log{' '}
            <strong>anonymous usage signals</strong> to improve recommendations and
            understand what&apos;s popular.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">
            3. Data stored in your browser (local storage)
          </h2>
          <p className="mt-2">
            To make the app work and remember your preferences, we store the following on
            your device only (never sent to us as personal data):
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your favourites, hidden events and taste/vibe preferences.</li>
            <li>UI state (e.g. whether the &ldquo;How it works&rdquo; panel is collapsed).</li>
            <li>
              A random, anonymous identifier (a UUID) that contains no personal information
              and is used only to group your own usage signals.
            </li>
          </ul>
          <p className="mt-2">
            You can clear this at any time by clearing your browser storage for this site.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">
            4. Anonymous usage signals we collect
          </h2>
          <p className="mt-2">
            <strong>Only if you agree</strong> (via the consent banner shown on your first
            visit), when you interact with an event we record an anonymous event &mdash; the
            type of action (opening an event link, saving to calendar, favouriting, or
            hiding), the event and venue involved, the outbound ticket domain, and a
            timestamp, linked only to the random identifier above. This{' '}
            <strong>does not identify you</strong> and is used to power features like trending
            events and better recommendations, and to understand which venues and partners our
            audience is interested in.
          </p>
          <p className="mt-2">
            <strong>Legal basis:</strong> your consent (Art. 6(1)(a) GDPR). If you decline, no
            interaction data is sent to our server; on-device personalisation (section 3) still
            works. You can change your choice at any time by clearing this site&apos;s browser
            storage.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">
            5. Service providers (processors)
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Hosting:</strong> Vercel Inc. serves the website and may process
              technical connection data (e.g. IP address in server logs) as part of
              delivering the site.
            </li>
            <li>
              <strong>Database:</strong> Supabase stores event data and the anonymous usage
              signals described above.
            </li>
          </ul>
          <p className="mt-2">
            [Confirm the hosting regions and add Data Processing Agreements / standard
            contractual clauses as required.]
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">
            6. External links
          </h2>
          <p className="mt-2">
            Events link out to third-party venue and ticketing sites (e.g. Resident Advisor,
            Eventbrite, venue shops). Those sites have their own privacy policies; we are not
            responsible for their data handling.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">7. Your rights</h2>
          <p className="mt-2">
            Under the GDPR you have rights of access, rectification, erasure, restriction,
            objection and data portability. Because we hold no data that identifies you, we
            typically cannot link stored signals to an individual. To exercise your rights or
            ask questions, contact us at [your@email.tld]. You may also lodge a complaint with
            the Berlin data protection authority (Berliner Beauftragte f&uuml;r Datenschutz und
            Informationsfreiheit).
          </p>
        </section>
      </div>

      <p className="mt-10 text-xs text-stone-400 dark:text-stone-500">
        <a href="/" className="hover:text-fuchsia-600 dark:hover:text-fuchsia-400">
          &larr; Back to events
        </a>
      </p>
    </div>
  );
}
