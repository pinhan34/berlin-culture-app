/**
 * Helpers shared by the event lists (home page and "Coming up").
 * Moved from components/EventFeed.tsx so both pages can use them.
 *
 * Written out step by step: full names, one thing per line, no shortcuts.
 * The behaviour is exactly the same as the original code.
 *
 * Reminder: in JavaScript a date is one big number, the milliseconds since
 * 1 January 1970. `.getTime()` gives you that number. A bigger number = later.
 */

import type { Event } from './types';

const MILLISECONDS_PER_MINUTE = 60000;

/** Returns '' for exactly 1 and 's' otherwise, so we can write "1 hour" but "2 hours". */
function pluralEnding(count: number): string
{
  if (count === 1)
  {
    return '';
  }
  return 's';
}

/**
 * Turns a moment in the past into text like "just now", "5 mins ago",
 * "3 hours ago" or "2 days ago".
 */
export function timeAgo(pastMomentInMilliseconds: number): string
{
  const nowInMilliseconds = Date.now();
  const millisecondsSince = nowInMilliseconds - pastMomentInMilliseconds;

  // Math.floor rounds down: 4.9 minutes becomes 4 minutes.
  const minutesAgo = Math.floor(millisecondsSince / MILLISECONDS_PER_MINUTE);
  if (minutesAgo < 1)
  {
    return 'just now';
  }
  if (minutesAgo < 60)
  {
    return minutesAgo + ' min' + pluralEnding(minutesAgo) + ' ago';
  }

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24)
  {
    return hoursAgo + ' hour' + pluralEnding(hoursAgo) + ' ago';
  }

  const daysAgo = Math.floor(hoursAgo / 24);
  return daysAgo + ' day' + pluralEnding(daysAgo) + ' ago';
}

/** Same day as `date`, but with the clock set to 00:00:00.000 (midnight, start of the day). */
function startOfDay(date: Date): Date
{
  const dateCopy = new Date(date); // a copy, so the original date is not changed
  dateCopy.setHours(0, 0, 0, 0); // hours, minutes, seconds, milliseconds
  return dateCopy;
}

/** Same day as `date`, but with the clock set to 23:59:59.999 (the last moment of the day). */
function endOfDay(date: Date): Date
{
  const dateCopy = new Date(date); // a copy, so the original date is not changed
  dateCopy.setHours(23, 59, 59, 999); // hours, minutes, seconds, milliseconds
  return dateCopy;
}

/**
 * Turns a date filter choice into a time window: a start number and an end number
 * (both in milliseconds). An event is shown if its start time falls between them.
 *
 * `range` is one of: 'today', 'tomorrow', 'weekend', 'week', 'month', 'all',
 * or one specific day written as 'YYYY-MM-DD' (for example '2026-12-24').
 */
export function getDateWindow(range: string): { start: number; end: number }
{
  const now = new Date();

  // 31 December 9999: "no end". Careful: months count from 0, so 11 means December.
  const farFutureDate = new Date(9999, 11, 31);
  const farFuture = farFutureDate.getTime();

  switch (range)
  {
    case 'today':
    {
      // From this moment until tonight 23:59:59.999.
      const endOfToday = endOfDay(now);
      return {
        start: now.getTime(),
        end: endOfToday.getTime(),
      };
    }

    case 'tomorrow':
    {
      // Today at 00:00, then a copy moved one day forward.
      const today = startOfDay(now);
      // getDate() is the day of the month (1 to 31). Adding 1 moves one day forward.
      // JavaScript handles the month change by itself: 30 November + 1 = 1 December.
      
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const endOfTomorrow = endOfDay(tomorrow);
      return {
        start: tomorrow.getTime(),
        end: endOfTomorrow.getTime(),
      };
    }

    case 'weekend':
    {
      // getDay() is the day of the week: 0 = Sunday, 1 = Monday, ... 6 = Saturday.
      const dayOfWeek = now.getDay();

      // How many days until Saturday. The "% 7" (remainder after dividing by 7)
      // keeps the answer between 0 and 6. Example: on Wednesday (3): (6 - 3 + 7) % 7 = 3.
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;

      const saturday = startOfDay(now);
      saturday.setDate(saturday.getDate() + daysUntilSaturday);

      const sunday = new Date(saturday);
      sunday.setDate(sunday.getDate() + 1);

      // If it is already the weekend, start from now. Otherwise start on Saturday morning.
      const isAlreadyWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      let startOfWindow;
      if (isAlreadyWeekend)
      {
        startOfWindow = now.getTime();
      }
      else
      {
        startOfWindow = saturday.getTime();
      }

      const endOfSunday = endOfDay(sunday);
      return {
        start: startOfWindow,
        end: endOfSunday.getTime(),
      };
    }

    case 'week':
    {
      // From now until the end of Sunday.
      const daysUntilSunday = 7 - now.getDay();
      const endOfWeek = endOfDay(now);
      endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
      return {
        start: now.getTime(),
        end: endOfWeek.getTime(),
      };
    }

    case 'month':
    {
      // From now until the last moment of this month.
      // Trick: "day 0 of next month" means "the last day of this month".
      const year = now.getFullYear();
      const nextMonth = now.getMonth() + 1;
      const lastMomentOfThisMonth = new Date(year, nextMonth, 0, 23, 59, 59, 999);
      return {
        start: now.getTime(),
        end: lastMomentOfThisMonth.getTime(),
      };
    }

    case 'all':
    {
      // No limits: from the very beginning (0) to the far future.
      return {
        start: 0,
        end: farFuture,
      };
    }

    default:
    {
      // One specific day, written like '2026-12-24'.
      const chosenDay = new Date(range + 'T00:00:00');

      // If the text was not a real date, getTime() gives NaN ("Not a Number").
      const isRealDate = !Number.isNaN(chosenDay.getTime());
      if (isRealDate)
      {
        const startOfChosenDay = startOfDay(chosenDay);
        const endOfChosenDay = endOfDay(chosenDay);
        return {
          start: startOfChosenDay.getTime(),
          end: endOfChosenDay.getTime(),
        };
      }

      // Not a real date: show everything.
      return {
        start: 0,
        end: farFuture,
      };
    }
  }
}

/** The text shown on the filter chip for a date filter choice, e.g. 'This weekend'. */
export function dateRangeLabel(range: string): string
{
  switch (range)
  {
    case 'today':
      return 'Today';
    case 'tomorrow':
      return 'Tomorrow';
    case 'weekend':
      return 'This weekend';
    case 'week':
      return 'This week';
    case 'month':
      return 'This month';
    case 'all':
      return 'All upcoming';
    default:
    {
      // One specific day, written like '2026-12-24'.
      const chosenDay = new Date(range + 'T00:00:00');
      const isRealDate = !Number.isNaN(chosenDay.getTime());
      if (!isRealDate)
      {
        return 'All upcoming';
      }
      // Short form in the visitor's own language, e.g. "24 Dec".
      return chosenDay.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }
  }
}

// getDay() gives 0 to 6, getMonth() gives 0 to 11. These lists turn those numbers into names.
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Day heading such as "Saturday, 21 November 2026". */
function formatDateHeading(date: Date): string
{
  const weekdayName = WEEKDAY_NAMES[date.getDay()];
  const dayOfMonth = date.getDate();
  const monthName = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return weekdayName + ', ' + dayOfMonth + ' ' + monthName + ' ' + year;
}

/**
 * Puts events under day headings.
 * Result: a Map from heading (e.g. "Saturday, 21 November 2026") to that day's events,
 * in the same order as the events came in.
 */
export function groupByDate(events: Event[]): Map<string, Event[]>
{
  const eventsByDay = new Map<string, Event[]>();
  for (const event of events)
  {
    const startDate = new Date(event.start_time);
    const heading = formatDateHeading(startDate);

    let eventsOnThisDay = eventsByDay.get(heading);
    if (eventsOnThisDay === undefined)
    {
      // First event on this day: start a new, empty list for it.
      eventsOnThisDay = [];
      eventsByDay.set(heading, eventsOnThisDay);
    }
    eventsOnThisDay.push(event);
  }
  return eventsByDay;
}

/**
 * Which venue an event belongs to, for capping and mixing.
 * Uses the real venue (venue_key) when the scraper found one, so events at different
 * real venues inside one aggregator (e.g. Telegram) count separately. Otherwise falls
 * back to the source id, written like "id:7".
 */
export function venueBucketKey(event: Event): string
{
  if (event.venue_key !== null && event.venue_key !== undefined)
  {
    return event.venue_key;
  }
  return 'id:' + event.venue_id;
}

/**
 * Mixes one day's events so no single venue fills the top of the list.
 * It takes one event from each venue in turn (venue A, venue B, venue C, then A again...),
 * until every venue's list is empty.
 */
export function interleaveByVenue(dayEvents: Event[]): Event[]
{
  // Step 1: sort the events into one list per venue.
  const eventsByVenue = new Map<string, Event[]>();
  for (const event of dayEvents)
  {
    const venue = venueBucketKey(event);
    let eventsAtThisVenue = eventsByVenue.get(venue);
    if (eventsAtThisVenue === undefined)
    {
      eventsAtThisVenue = [];
      eventsByVenue.set(venue, eventsAtThisVenue);
    }
    eventsAtThisVenue.push(event);
  }

  // Step 2: take turns. Each round takes the first event from every venue's list.
  const venueLists = Array.from(eventsByVenue.values());
  const mixedEvents: Event[] = [];
  while (someListStillHasEvents(venueLists))
  {
    for (const venueList of venueLists)
    {
      // shift() removes the first item from the list and gives it back
      // (or undefined when the list is already empty).
      const nextEvent = venueList.shift();
      if (nextEvent !== undefined)
      {
        mixedEvents.push(nextEvent);
      }
    }
  }
  return mixedEvents;
}

/** True while at least one of the lists still has an event in it. */
function someListStillHasEvents(lists: Event[][]): boolean
{
  for (const list of lists)
  {
    if (list.length > 0)
    {
      return true;
    }
  }
  return false;
}

/** The most events shown per venue in the default (unfiltered) view. */
export const VENUE_DISPLAY_CAP = 30;

/**
 * Lower limits for some sources (by source venue_id), so high-volume aggregators
 * (Telegram, Village, MeetUp) don't crowd out real venues. See docs/VENUE_MODEL.md.
 */
export const VENUE_CAP_OVERRIDES: Record<number, number> = {
  1: 15, // Sinema Transtopia: many screenings, keep balanced with gallery events
  2: 12, // MeetUp Groups (aggregator)
  3: 12, // Village Berlin (aggregator, reposts a lot)
  7: 12, // Telegram: QUEER EVENTS Berlin (aggregator)
  8: 18, // ART at Berlin (gallery aggregator, but exhibitions are valuable)
};

/**
 * False for events we don't want to show: old Telegram links (https://t.me/...)
 * left in the database from before the link fix.
 */
export function isQualityEvent(event: Event): boolean
{
  const link = event.event_url;
  if (link !== null && link !== undefined && link.startsWith('https://t.me/'))
  {
    return false;
  }
  return true;
}
