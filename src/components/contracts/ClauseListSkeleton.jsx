import { Skeleton } from '@/components/ui/skeleton';

function ClauseRowSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <Skeleton className="h-5 w-44 bg-zinc-800" />
          <Skeleton className="h-4 w-12 bg-zinc-800 rounded-full" />
          <Skeleton className="h-3 w-24 bg-zinc-800" />
        </div>
        <Skeleton className="h-8 w-8 bg-zinc-800 rounded-md" />
        <Skeleton className="h-8 w-8 bg-zinc-800 rounded-md" />
      </div>
    </div>
  );
}

export default function ClauseListSkeleton({ groupCount = 2, perGroup = 3 }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: groupCount }).map((_, g) => (
        <section key={g}>
          <Skeleton className="h-3 w-28 bg-zinc-800 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: perGroup }).map((_, r) => (
              <ClauseRowSkeleton key={r} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
