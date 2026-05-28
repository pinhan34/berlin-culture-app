import { VenueStripSkeleton, EventFeedSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <div className="skeleton h-7 w-72 mb-2" />
        <div className="skeleton h-4 w-56" />
      </div>

      <VenueStripSkeleton />
      <EventFeedSkeleton />
    </div>
  );
}
