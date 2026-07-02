'use client';

import { useState } from 'react';

/**
 * Email capture for the weekly "Berlin this week" digest — the owned-audience funnel
 * (docs/DISTRIBUTION.md §18.2). Posts to /api/subscribe; on-device only until then.
 */
export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    setMessage('');

    try {
      const source = new URLSearchParams(window.location.search).get('utm_source') || 'homepage';
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      if (res.ok) {
        setStatus('done');
        return;
      }
      const data = await res.json().catch(() => ({}));
      setStatus('error');
      setMessage(data?.error || 'Something went wrong. Please try again.');
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-gradient-to-br from-fuchsia-50 to-purple-50 p-5 sm:p-6 dark:border-purple-900/50 dark:from-[#1b1226] dark:to-[#160f1f]">
      <h2 className="font-heading text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
        Get the weekly Berlin digest
      </h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        One email a week with the best indie, queer &amp; ND-friendly events. No spam,
        unsubscribe anytime.
      </p>

      {status === 'done' ? (
        <p className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold text-fuchsia-700 dark:bg-black/20 dark:text-fuchsia-300">
          {'\u2713'} You&apos;re in — see you in your inbox.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            aria-label="Email address"
            className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-800 outline-none transition-colors focus:border-fuchsia-500 dark:border-purple-900/50 dark:bg-[#16101e] dark:text-stone-100 dark:focus:border-fuchsia-500"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-full bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-fuchsia-700 active:scale-95 disabled:opacity-60 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600"
          >
            {status === 'loading' ? 'Subscribing\u2026' : 'Subscribe'}
          </button>
        </form>
      )}

      {status === 'error' ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{message}</p>
      ) : null}

      <p className="mt-3 text-[11px] text-stone-400 dark:text-stone-500">
        By subscribing you agree to receive emails from us. We only store your address to
        send the digest — see our{' '}
        <a href="/privacy" className="underline hover:text-fuchsia-600 dark:hover:text-fuchsia-400">
          privacy policy
        </a>
        .
      </p>
    </section>
  );
}
