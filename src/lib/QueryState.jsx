import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

function isEmpty(data) {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  return false;
}

export function QueryErrorCard({ onRetry, isRetrying }) {
  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-12 text-center">
      <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">
        Sh*t broke, my bad...
      </h3>
      <p className="text-zinc-400 mb-6">
        Couldn't load this right now. Give it another shot.
      </p>
      <Button
        onClick={onRetry}
        disabled={isRetrying}
        className="bg-violet-600 hover:bg-violet-700 text-white gap-2 rounded-xl"
      >
        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Retrying...' : 'Retry'}
      </Button>
    </div>
  );
}

export default function QueryState({ query, skeleton, empty, children }) {
  const { data, isLoading, isError, isFetching, refetch } = query;

  if (isLoading) return skeleton ?? null;
  if (isError) {
    return <QueryErrorCard onRetry={() => refetch()} isRetrying={isFetching} />;
  }
  if (isEmpty(data)) return empty ?? null;

  return children(data);
}
