import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Legal disclosure (Impressum) for Berlin Culture.',
  robots: { index: false },
};

/**
 * Impressum (legally required for a German-facing site, §5 DDG / former TMG).
 * ⚠️ DRAFT — replace every [PLACEHOLDER] with real details and have it reviewed
 * before launch. If you operate as a private individual, a service address may be
 * used where permitted; consult the current rules.
 */
export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
        <strong>Draft.</strong> Replace all placeholders in square brackets with real
        details and have a professional review this before launch.
      </div>

      <h1 className="font-heading text-2xl font-bold text-stone-900 dark:text-stone-100">
        Impressum
      </h1>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">
            Angaben gem&auml;&szlig; &sect; 5 DDG
          </h2>
          <p className="mt-2 whitespace-pre-line">
            {`[Full name / company name]
[Street and number]
[Postal code] Berlin
Germany`}
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">Kontakt</h2>
          <p className="mt-2 whitespace-pre-line">
            {`E-Mail: [your@email.tld]
Telefon: [optional]`}
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">
            Verantwortlich f&uuml;r den Inhalt nach &sect; 18 Abs. 2 MStV
          </h2>
          <p className="mt-2 whitespace-pre-line">
            {`[Full name]
[Address as above]`}
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">Haftungsausschluss</h2>
          <p className="mt-2">
            Diese Website verweist auf externe Veranstaltungs- und Ticketseiten. F&uuml;r die
            Inhalte externer Links sind ausschlie&szlig;lich deren Betreiber verantwortlich.
            Veranstaltungsangaben werden automatisiert aus &ouml;ffentlichen Quellen
            zusammengetragen; f&uuml;r deren Richtigkeit und Aktualit&auml;t wird keine Gew&auml;hr
            &uuml;bernommen.
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
