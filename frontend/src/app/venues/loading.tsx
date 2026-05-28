import { VenueCardSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <div className="skeleton h-7 w-40 mb-2" />
        <div className="skeleton h-4 w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <VenueCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
