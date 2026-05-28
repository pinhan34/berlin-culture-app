'use client';

import { useState } from 'react';

const VENUES = [
  { id: 1,  name: 'Sinema Transtopia' },
  { id: 2,  name: 'MeetUp Groups' },
  { id: 3,  name: 'Village Berlin' },
  { id: 4,  name: 'Neurodivergent Berlin' },
  { id: 5,  name: 'SO36' },
  { id: 6,  name: 'Flutgraben' },
  { id: 7,  name: 'Telegram Groups' },
  { id: 8,  name: 'ART at Berlin' },
  { id: 9,  name: 'Festsaal Kreuzberg' },
  { id: 10, name: 'OYA Bar' },
  { id: 11, name: 'Gelegenheiten' },
];

export default function AddEventPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const [venueId, setVenueId] = useState(11);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [eventUrl, setEventUrl] = useState('');
  const [duration, setDuration] = useState('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setStatus('loading');
    const startTime = `${date}T${time}:00`;

    try {
      const resp = await fetch('/api/admin/add-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          venue_id: venueId,
          title: title.trim(),
          start_time: startTime,
          event_url: eventUrl.trim() || null,
          duration: duration.trim() || null,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Something went wrong');
        return;
      }

      setStatus('success');
      setMessage(`"${title}" added to ${VENUES.find(v => v.id === venueId)?.name}`);
      setTitle('');
      setDate('');
      setTime('20:00');
      setEventUrl('');
      setDuration('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message ?? 'Network error');
    }
  }

  if (!authenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center px-4">
        <h1 className="mb-6 font-heading text-xl font-bold text-stone-800 dark:text-stone-100">
          Admin Access
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password.trim()) setAuthenticated(true);
          }}
          className="w-full space-y-4"
        >
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 dark:border-purple-800 dark:bg-[#16101e] dark:text-stone-200"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-700 active:scale-[0.98]"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-2 font-heading text-2xl font-bold text-stone-800 dark:text-stone-100">
        Add Event
      </h1>
      <p className="mb-8 text-sm text-stone-500 dark:text-stone-400">
        Manually add events for venues that can&apos;t be auto-scraped.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Venue */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Venue
          </label>
          <select
            value={venueId}
            onChange={e => setVenueId(Number(e.target.value))}
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 dark:border-purple-800 dark:bg-[#16101e] dark:text-stone-200"
          >
            {VENUES.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Event Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Elektronischer Salon #42"
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 dark:border-purple-800 dark:bg-[#16101e] dark:text-stone-200"
          />
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 dark:border-purple-800 dark:bg-[#16101e] dark:text-stone-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 dark:border-purple-800 dark:bg-[#16101e] dark:text-stone-200"
            />
          </div>
        </div>

        {/* Event URL */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Event URL <span className="font-normal normal-case text-stone-400">(optional)</span>
          </label>
          <input
            type="url"
            value={eventUrl}
            onChange={e => setEventUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 dark:border-purple-800 dark:bg-[#16101e] dark:text-stone-200"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Duration <span className="font-normal normal-case text-stone-400">(optional, e.g. &quot;2 hours&quot;)</span>
          </label>
          <input
            type="text"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="e.g. 3 hours"
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 dark:border-purple-800 dark:bg-[#16101e] dark:text-stone-200"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-lg bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-fuchsia-700 active:scale-[0.98] disabled:opacity-60"
        >
          {status === 'loading' ? 'Adding...' : 'Add Event'}
        </button>

        {/* Feedback */}
        {status === 'success' && (
          <div className="animate-fade-up rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
            {message}
          </div>
        )}
        {status === 'error' && (
          <div className="animate-fade-up rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
