import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DraftRestoredBanner({ onDiscard }) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
      <Save className="h-4 w-4 flex-shrink-0 text-violet-300" />
      <div className="flex-1 text-sm text-zinc-200">
        We restored your unsaved draft.
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDiscard}
        className="h-8 gap-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800"
      >
        <X className="h-3.5 w-3.5" />
        Discard draft
      </Button>
    </div>
  );
}
