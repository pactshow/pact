import { Skeleton } from '@/components/ui/skeleton';

export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-3 w-24 bg-zinc-800 mb-3" />
          <Skeleton className="h-8 w-32 bg-zinc-800 mb-2" />
          <Skeleton className="h-4 w-28 bg-zinc-800" />
        </div>
        <Skeleton className="h-12 w-12 bg-zinc-800 rounded-xl" />
      </div>
    </div>
  );
}

export function UpcomingGigSkeleton() {
  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5">
      <Skeleton className="h-3 w-28 bg-zinc-800 mb-2" />
      <Skeleton className="h-5 w-44 bg-zinc-800 mb-3" />
      <Skeleton className="h-4 w-36 bg-zinc-800 mb-2" />
      <Skeleton className="h-4 w-24 bg-zinc-800 mb-3" />
      <div className="pt-2 border-t border-zinc-800">
        <Skeleton className="h-7 w-28 bg-zinc-800" />
      </div>
    </div>
  );
}

export function UpcomingGigSkeletonList({ count = 2 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <UpcomingGigSkeleton key={i} />
      ))}
    </div>
  );
}

export function PaymentRowSkeleton() {
  return (
    <div className="flex items-start justify-between gap-3 py-4 border-b border-zinc-800/50 last:border-0">
      <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
        <Skeleton className="h-10 w-10 bg-zinc-800 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-24 bg-zinc-800 mb-2" />
          <Skeleton className="h-3 w-40 bg-zinc-800" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <Skeleton className="h-5 w-20 bg-zinc-800" />
        <Skeleton className="h-5 w-16 bg-zinc-800 rounded-full" />
      </div>
    </div>
  );
}

export function PaymentRowSkeletonList({ count = 4 }) {
  return (
    <div className="divide-y divide-zinc-800/50">
      {Array.from({ length: count }).map((_, i) => (
        <PaymentRowSkeleton key={i} />
      ))}
    </div>
  );
}
