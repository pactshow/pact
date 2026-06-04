import { Skeleton } from '@/components/ui/skeleton';

export default function ContractDetailSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back link */}
        <Skeleton className="h-4 w-32 bg-zinc-800 mb-6" />

        {/* Title block */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-9 w-64 bg-zinc-800" />
            <Skeleton className="h-6 w-20 bg-zinc-800 rounded-full" />
          </div>
          <Skeleton className="h-4 w-80 bg-zinc-800 mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 bg-zinc-800 rounded-xl" />
            <Skeleton className="h-9 w-28 bg-zinc-800 rounded-xl" />
            <Skeleton className="h-9 w-28 bg-zinc-800 rounded-xl" />
          </div>
        </div>

        {/* Parties block */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 mb-6">
          <Skeleton className="h-5 w-24 bg-zinc-800 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 bg-zinc-800" />
              <Skeleton className="h-5 w-40 bg-zinc-800" />
              <Skeleton className="h-4 w-48 bg-zinc-800" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 bg-zinc-800" />
              <Skeleton className="h-5 w-40 bg-zinc-800" />
              <Skeleton className="h-4 w-48 bg-zinc-800" />
            </div>
          </div>
        </div>

        {/* Performance details */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 mb-6">
          <Skeleton className="h-5 w-40 bg-zinc-800 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24 bg-zinc-800" />
                <Skeleton className="h-5 w-32 bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Payments block */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 mb-6">
          <Skeleton className="h-5 w-32 bg-zinc-800 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 bg-zinc-800 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24 bg-zinc-800" />
                    <Skeleton className="h-3 w-32 bg-zinc-800" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
