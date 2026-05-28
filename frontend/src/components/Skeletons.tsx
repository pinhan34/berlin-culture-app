export function EventCardSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-purple-900/40 dark:bg-[#16101e]">
      <div className="skeleton h-4 w-3/4 mb-3" />
      <div className="flex gap-3 mb-3">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-3 w-14" />
      </div>
      <div className="flex items-center justify-between">
        <div className="skeleton h-5 w-24 rounded-md" />
        <div className="skeleton h-6 w-28 rounded-md" />
      </div>
    </div>
  );
}

export function MoodTilesSkeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton mx-auto h-4 w-48" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border-2 border-stone-200 p-4 dark:border-purple-900/40">
            <div className="skeleton mx-auto mb-2 h-8 w-8 rounded-full" />
            <div className="skeleton mx-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function VenueStripSkeleton() {
  return (
    <section className="mb-8">
      <div className="skeleton h-4 w-28 mb-1" />
      <div className="skeleton h-3 w-52 mb-3" />
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton h-8 w-32 flex-shrink-0 rounded-full" />
        ))}
      </div>
    </section>
  );
}

export function EventFeedSkeleton() {
  return (
    <div className="space-y-8">
      <MoodTilesSkeleton />
      <div className="skeleton mx-auto h-8 w-48 rounded-2xl" />
      <div className="skeleton h-px w-full" />
      <div className="skeleton h-3 w-24" />
      <div className="space-y-6">
        {[1, 2].map(group => (
          <div key={group}>
            <div className="skeleton mb-3 h-3 w-40" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VenueCardSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-purple-900/40 dark:bg-[#16101e]">
      <div className="skeleton h-5 w-2/3 mb-2" />
      <div className="skeleton h-3 w-full mb-3" />
      <div className="flex gap-1.5 mb-4">
        <div className="skeleton h-5 w-14 rounded-full" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton h-3 w-3/4 mb-1" />
      <div className="flex items-center justify-between mt-4">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton h-7 w-24 rounded-full" />
      </div>
    </div>
  );
}
