import { useState } from 'react';
import useFormDraft from '@/lib/useFormDraft';
import DraftRestoredBanner from '@/components/DraftRestoredBanner';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus, Loader2, Folder, FolderOpen, Calendar, MapPin,
  Pencil, Trash2, ArrowLeft, FileText, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase';
import { useMyProfile } from '@/lib/RoleContext';
import { useSubscriptionAccess } from '@/lib/useSubscriptionAccess';
import { useFolderLabel } from '@/lib/useFolderLabel';
import ProUpgradeScreen from '@/components/account/ProUpgradeScreen';
import { createPageUrl } from '@/utils';
import QueryState, { QueryErrorCard } from '@/lib/QueryState';
import { Skeleton } from '@/components/ui/skeleton';

export default function Folders() {
  const access = useSubscriptionAccess();

  if (access.isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }
  if (!access.isPro) {
    return <ProUpgradeScreen feature="folders" />;
  }
  return <FoldersInner />;
}

function FoldersInner() {
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('id');
  return folderId ? <FolderDetail key={folderId} id={folderId} /> : <FoldersList />;
}

// ----------------------- LIST VIEW -----------------------

function FoldersList() {
  const { myProfile } = useMyProfile();
  const label = useFolderLabel();
  const [dialog, setDialog] = useState({ open: false, folder: null });

  const foldersQuery = useQuery({
    queryKey: ['event-groups', myProfile?.id],
    queryFn: () => base44.entities.EventGroup.list('-created_date'),
    enabled: !!myProfile?.id,
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">My {label.plural}</h1>
            <p className="mt-1 text-zinc-400">
              Group related contracts together. Each {label.lowerSingular} is private to you.
            </p>
          </div>
          <Button
            onClick={() => setDialog({ open: true, folder: null })}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> New {label.lowerSingular}
          </Button>
        </div>

        <QueryState
          query={foldersQuery}
          skeleton={<FolderCardSkeletonGrid count={3} />}
          empty={
            <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-12 text-center">
              <Folder className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-lg font-semibold mb-1">No {label.plural.toLowerCase()} yet</p>
              <p className="text-zinc-400 text-sm mb-5">
                Create your first {label.lowerSingular} to organize related contracts.
              </p>
              <Button
                onClick={() => setDialog({ open: true, folder: null })}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl gap-2"
              >
                <Plus className="w-4 h-4" /> New {label.lowerSingular}
              </Button>
            </div>
          }
        >
          {(folders) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map((f) => (
                <FolderCard key={f.id} folder={f} />
              ))}
            </div>
          )}
        </QueryState>
      </div>

      {dialog.open && (
        <FolderFormDialog
          key={dialog.folder?.id ?? 'new'}
          folder={dialog.folder}
          profileId={myProfile?.id}
          label={label}
          onClose={() => setDialog({ open: false, folder: null })}
        />
      )}
    </div>
  );
}

function FolderCardSkeleton() {
  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="h-9 w-9 bg-zinc-800 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40 bg-zinc-800" />
          <Skeleton className="h-3 w-32 bg-zinc-800" />
        </div>
      </div>
      <Skeleton className="h-3 w-24 bg-zinc-800" />
    </div>
  );
}

function FolderCardSkeletonGrid({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <FolderCardSkeleton key={i} />
      ))}
    </div>
  );
}

function FolderDetailSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Skeleton className="h-4 w-40 bg-zinc-800 mb-6" />
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Skeleton className="h-10 w-10 bg-zinc-800 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-64 bg-zinc-800" />
              <Skeleton className="h-4 w-44 bg-zinc-800" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-5">
          <Skeleton className="h-5 w-48 bg-zinc-800 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-44 bg-zinc-800" />
                  <Skeleton className="h-3 w-32 bg-zinc-800" />
                </div>
                <Skeleton className="h-5 w-16 bg-zinc-800 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderCard({ folder }) {
  const dateRange = formatDateRange(folder.start_date, folder.end_date);
  return (
    <Link
      to={createPageUrl(`Folders?id=${folder.id}`)}
      className="block rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/50 p-5 transition-colors"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-violet-500/10 shrink-0">
          <FolderOpen className="w-5 h-5 text-violet-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-white truncate">{folder.name}</h3>
          {folder.venue && (
            <p className="text-sm text-zinc-400 truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              {folder.venue}
            </p>
          )}
        </div>
      </div>
      {dateRange && (
        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          {dateRange}
        </p>
      )}
    </Link>
  );
}

// ----------------------- DETAIL VIEW -----------------------

function FolderDetail({ id }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { myProfile } = useMyProfile();
  const label = useFolderLabel();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBulkSend, setConfirmBulkSend] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);

  const folderQuery = useQuery({
    queryKey: ['event-group', id],
    queryFn: () => base44.entities.EventGroup.get(id),
    enabled: !!id,
  });
  const folder = folderQuery.data;
  const isLoading = folderQuery.isLoading;

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['event-group-contracts', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id, title, status, performance_date, contractor_name, client_name, total_amount')
        .eq('event_group_id', id)
        .order('performance_date', { ascending: true });
      return data ?? [];
    },
    enabled: !!id,
  });

  const deleteFolder = useMutation({
    mutationFn: () => base44.entities.EventGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-groups'] });
      navigate(createPageUrl('Folders'));
    },
  });

  const draftCount = contracts.filter((c) => c.status === 'draft').length;

  // Single bulk UPDATE flips all draft contracts in this folder to
  // 'sent'. The notification trigger on contracts fires per row, so
  // counterparties are notified individually — same as if the user
  // had sent each one manually.
  const handleBulkSend = async () => {
    setBulkSending(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'sent' })
        .eq('event_group_id', id)
        .eq('status', 'draft');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['event-group-contracts', id] });
      setConfirmBulkSend(false);
    } catch (err) {
      alert(err.message || 'Failed to send contracts');
    } finally {
      setBulkSending(false);
    }
  };

  if (isLoading) return <FolderDetailSkeleton />;

  if (folderQuery.isError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link to={createPageUrl('Folders')} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> All {label.plural.toLowerCase()}
          </Link>
          <QueryErrorCard
            onRetry={() => folderQuery.refetch()}
            isRetrying={folderQuery.isFetching}
          />
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">{label.singular} not found.</p>
          <Link to={createPageUrl('Folders')}>
            <Button variant="outline" className="border-zinc-700 text-zinc-300">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to {label.plural.toLowerCase()}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const dateRange = formatDateRange(folder.start_date, folder.end_date);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link to={createPageUrl('Folders')} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> All {label.plural.toLowerCase()}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-violet-500/10 shrink-0">
                <FolderOpen className="w-6 h-6 text-violet-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight truncate">{folder.name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-zinc-400">
                  {folder.venue && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {folder.venue}</span>
                  )}
                  {dateRange && (
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {dateRange}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} className="text-zinc-400 hover:text-white">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-zinc-400 hover:text-rose-400">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {folder.notes && (
            <p className="text-sm text-zinc-300 mt-4 pt-4 border-t border-zinc-800 whitespace-pre-wrap">
              {folder.notes}
            </p>
          )}
        </motion.div>

        <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h2 className="font-semibold">Contracts in this {label.lowerSingular}</h2>
            <div className="flex items-center gap-2">
              {draftCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmBulkSend(true)}
                  className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 gap-2"
                >
                  <Send className="w-4 h-4" /> Send {draftCount} draft{draftCount === 1 ? '' : 's'}
                </Button>
              )}
              <Link to={createPageUrl(`ContractForm?event_group_id=${folder.id}`)}>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
                  <Plus className="w-4 h-4" /> New contract
                </Button>
              </Link>
            </div>
          </div>
          {contractsLoading && <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />}
          {!contractsLoading && contracts.length === 0 && (
            <p className="text-sm text-zinc-500 py-4 text-center">
              No contracts in this {label.lowerSingular} yet. Create one or assign existing contracts to it.
            </p>
          )}
          {!contractsLoading && contracts.length > 0 && (
            <ul className="divide-y divide-zinc-800">
              {contracts.map((c) => (
                <li key={c.id}>
                  <Link
                    to={createPageUrl(`ContractDetail?id=${c.id}`)}
                    className="flex items-center justify-between py-3 hover:bg-zinc-800/40 px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.title || 'Untitled contract'}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {c.client_name || 'TBD'} · {c.contractor_name || 'TBD'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusPill status={c.status} />
                      {c.performance_date && (
                        <span className="text-xs text-zinc-500">{formatDate(c.performance_date)}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {editOpen && (
        <FolderFormDialog
          key={folder.id}
          folder={folder}
          profileId={myProfile?.id}
          label={label}
          onClose={() => setEditOpen(false)}
        />
      )}

      <AlertDialog open={confirmBulkSend} onOpenChange={setConfirmBulkSend}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Send {draftCount} draft contract{draftCount === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              All draft contracts in this {label.lowerSingular} will be sent at once. Each counterparty gets notified individually. Already-sent contracts are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300" disabled={bulkSending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkSend(); }}
              disabled={bulkSending}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {bulkSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send all drafts'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {label.lowerSingular}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Contracts inside will be unassigned but kept. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFolder.mutate()}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ----------------------- CREATE / EDIT DIALOG -----------------------

function FolderFormDialog({ folder, profileId, label, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = !!folder?.id;
  const draftKey = isEdit ? `folder:edit:${folder.id}` : 'folder:new';
  const initial = initialForm(folder);

  const [form, setForm, { restoredFromDraft, clearDraft, discardDraft }] =
    useFormDraft(draftKey, initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!form.name.trim() || !profileId) return;
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError('End date must be on or after start date.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        profile_id: profileId,
        name: form.name.trim(),
        venue: form.venue.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes.trim() || null,
      };
      if (isEdit) {
        await base44.entities.EventGroup.update(folder.id, payload);
      } else {
        await base44.entities.EventGroup.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['event-groups'] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ['event-group', folder.id] });
      clearDraft();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${label.lowerSingular}` : `New ${label.lowerSingular}`}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Group related contracts together for easier management.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {restoredFromDraft && (
            <DraftRestoredBanner onDiscard={() => discardDraft(initial)} />
          )}
          <div>
            <Label className="text-zinc-300">{label.singular} name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={label.singular === 'Tour' ? 'e.g. Spring 2026 East Coast' : 'e.g. Summer Festival 2026'}
              maxLength={200}
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
          <div>
            <Label className="text-zinc-300">Venue (optional)</Label>
            <Input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="Multiple venues, leave blank"
              maxLength={200}
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-300">Start date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">End date</Label>
              <Input
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>
          <div>
            <Label className="text-zinc-300">Notes (optional)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              maxLength={5000}
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? 'Save changes' : `Create ${label.lowerSingular}`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initialForm(folder) {
  return {
    name: folder?.name ?? '',
    venue: folder?.venue ?? '',
    start_date: folder?.start_date ?? '',
    end_date: folder?.end_date ?? '',
    notes: folder?.notes ?? '',
  };
}

function StatusPill({ status }) {
  const map = {
    draft: { label: 'Draft', cls: 'bg-zinc-700 text-zinc-300' },
    sent: { label: 'Sent', cls: 'bg-amber-500/15 text-amber-300' },
    countered: { label: 'Countered', cls: 'bg-amber-500/15 text-amber-300' },
    signed: { label: 'Signed', cls: 'bg-emerald-500/15 text-emerald-300' },
    completed: { label: 'Completed', cls: 'bg-emerald-500/15 text-emerald-300' },
  };
  const m = map[status] ?? { label: status, cls: 'bg-zinc-700 text-zinc-300' };
  return <span className={`text-xs px-2 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateRange(start, end) {
  if (!start && !end) return null;
  if (start && end) {
    return `${formatDate(start)} – ${formatDate(end)}`;
  }
  return formatDate(start || end);
}
