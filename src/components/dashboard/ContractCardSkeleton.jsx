import { Skeleton } from '@/components/ui/skeleton';

export default function ContractCardSkeleton() {
  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-5 w-48 bg-zinc-800" />
            <Skeleton className="h-5 w-16 bg-zinc-800 rounded-full" />
          </div>
          <div className="flex items-center gap-4 mb-3">
            <Skeleton className="h-4 w-28 bg-zinc-800" />
            <Skeleton className="h-4 w-1 bg-zinc-800" />
            <Skeleton className="h-4 w-28 bg-zinc-800" />
          </div>
          <div className="flex items-center gap-5">
            <Skeleton className="h-4 w-32 bg-zinc-800" />
            <Skeleton className="h-4 w-20 bg-zinc-800" />
          </div>
        </div>
        <Skeleton className="h-5 w-5 bg-zinc-800 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}

export function ContractCardSkeletonList({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ContractCardSkeleton key={i} />
      ))}
    </div>
  );
}
