// Practice file for src/lib/feed.ts. It only prints results; it changes nothing.
//
// How to run it (in the terminal, inside the "frontend" folder):
//     npx tsx scripts/try-feed.ts
//
// Change things below (for example add 'week' or '2026-12-24' to the list) and run it again.

import { getDateWindow, dateRangeLabel, timeAgo } from '../src/lib/feed';

/** Turns a millisecond number into a normal, readable date and time. */
function readable(milliseconds: number): string
{
  const date = new Date(milliseconds);
  return date.toLocaleString('en-GB');
}

const nowInMilliseconds = Date.now();
console.log('Right now it is:      ' + readable(nowInMilliseconds));
console.log('Right now as a number: ' + nowInMilliseconds);
console.log('');

const choices = ['today', 'tomorrow', 'weekend'];
for (const choice of choices)
{
  const window = getDateWindow(choice);
  console.log(dateRangeLabel(choice) + ':');
  console.log('    starts ' + readable(window.start));
  console.log('    ends   ' + readable(window.end));
}
console.log('');

const fiveMinutesInMilliseconds = 5 * 60 * 1000;
const threeHoursInMilliseconds = 3 * 60 * 60 * 1000;
console.log('timeAgo for 5 minutes ago: ' + timeAgo(nowInMilliseconds - fiveMinutesInMilliseconds));
console.log('timeAgo for 3 hours ago:   ' + timeAgo(nowInMilliseconds - threeHoursInMilliseconds));
