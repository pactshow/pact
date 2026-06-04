import { Skeleton } from '@/components/ui/skeleton';

export function PaymentListRowSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-4">
        <Skeleton className="h-11 w-11 bg-zinc-800 rounded-xl shrink-0" />
        <div>
          <Skeleton className="h-5 w-48 bg-zinc-800 mb-2" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 bg-zinc-800 rounded-full" />
            <Skeleton className="h-3 w-24 bg-zinc-800" />
            <Skeleton className="h-3 w-20 bg-zinc-800" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:gap-6">
        <Skeleton className="h-5 w-16 bg-zinc-800 rounded-full" />
        <Skeleton className="h-6 w-24 bg-zinc-800" />
      </div>
    </div>
  );
}

export default function PaymentListSkeleton({ count = 5 }) {
  return (
    <div className="divide-y divide-zinc-800/50">
      {Array.from({ length: count }).map((_, i) => (
        <PaymentListRowSkeleton key={i} />
      ))}
    </div>
  );
}
