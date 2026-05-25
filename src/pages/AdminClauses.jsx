import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useMyProfile } from "@/lib/RoleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, ShieldCheck, BookOpen, Save, Variable, ChevronDown, ChevronUp } from "lucide-react";
import { extractTemplateKeys, substituteTemplate } from "@/lib/utils";

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 64);

// Variable keys are typed letter by letter, so we preserve underscores
// during input (slugify would strip a trailing underscore before the user
// could type the next letter). Just lowercase and drop invalid chars.
const normalizeVarKey = (s) =>
  (s || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 64);

export default function AdminClauses() {
  const { myProfile, isLoadingProfile } = useMyProfile();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null | clause object | 'new'
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expanded, setExpanded] = useState({}); // { [id]: true } — preview visible

  const { data: clauses = [], isLoading } = useQuery({
    queryKey: ['admin-clause-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clause_library')
        .select('*')
        .order('category')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(myProfile?.is_admin),
  });

  const upsertMutation = useMutation({
    mutationFn: async (clause) => {
      const payload = {
        slug: clause.slug || slugify(clause.title),
        title: clause.title,
        category: clause.category,
        content: clause.content,
        sort_order: Number(clause.sort_order ?? 0),
        is_active: clause.is_active ?? true,
        variables: Array.isArray(clause.variables) ? clause.variables : [],
      };
      if (clause.id) {
        const { error } = await supabase
          .from('clause_library').update(payload).eq('id', clause.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clause_library').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clause-library'] });
      queryClient.invalidateQueries({ queryKey: ['clause-library'] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('clause_library').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clause-library'] });
      queryClient.invalidateQueries({ queryKey: ['clause-library'] });
      setConfirmDelete(null);
    },
  });

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!myProfile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  const grouped = clauses.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-amber-300 text-xs flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5" />
        Admin Mode — changes affect all future contracts platform-wide
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-violet-400" />
              Clause Library
            </h1>
            <p className="mt-1 text-zinc-400">
              The reusable clauses that appear in the contract builder. Edits apply to <span className="text-white font-medium">future</span> contracts only — already-signed contracts keep their original text.
            </p>
          </div>
          <Button
            onClick={() => setEditing('new')}
            className="bg-violet-600 hover:bg-violet-700 gap-2 rounded-xl h-11 px-5 shrink-0"
          >
            <Plus className="w-4 h-4" /> New clause
          </Button>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, items]) => (
              <section key={category}>
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">{category}</h2>
                <div className="space-y-2">
                  {items.map(c => {
                    const isOpen = !!expanded[c.id];
                    return (
                      <div
                        key={c.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                          className="w-full flex items-center gap-3 p-4 text-left"
                        >
                          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-medium">{c.title}</h3>
                            {!c.is_active && (
                              <Badge className="bg-zinc-700 text-zinc-300 border-0 text-xs">Inactive</Badge>
                            )}
                            {Array.isArray(c.variables) && c.variables.length > 0 && (
                              <Badge className="bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs gap-1">
                                <Variable className="w-3 h-3" />
                                {c.variables.length} var{c.variables.length === 1 ? '' : 's'}
                              </Badge>
                            )}
                            <span className="text-xs text-zinc-600 font-mono">{c.slug}</span>
                            <span className="text-xs text-zinc-600 ml-auto">#{c.sort_order}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setEditing(c)}
                              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setConfirmDelete(c)}
                              className="text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <span className="text-zinc-500 ml-1">
                              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
            {clauses.length === 0 && (
              <p className="text-center text-zinc-500 py-12">No clauses yet. Click "New clause" to add one.</p>
            )}
          </div>
        )}
      </div>

      <ClauseEditor
        clause={editing}
        onClose={() => setEditing(null)}
        onSave={(c) => upsertMutation.mutate(c)}
        saving={upsertMutation.isPending}
        error={upsertMutation.error?.message}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this clause?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              <span className="block">"{confirmDelete?.title}" will be removed from the library.</span>
              <span className="block mt-2 text-amber-300">Already-signed contracts keep this text unchanged. Only future contracts lose access.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(confirmDelete.id)}
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

function ClauseEditor({ clause, onClose, onSave, saving, error }) {
  const isNew = clause === 'new';
  const [draft, setDraft] = useState(null);

  // Initialise draft when the dialog opens with a different clause
  if (clause && draft === null) {
    setDraft(isNew
      ? { title: '', category: '', content: '', sort_order: 0, is_active: true, slug: '', variables: [] }
      : { ...clause, variables: Array.isArray(clause.variables) ? clause.variables : [] }
    );
  }
  if (!clause && draft !== null) setDraft(null);
  if (!clause || !draft) return null;

  const placeholderKeys = extractTemplateKeys(draft.content);
  const variableKeys = new Set((draft.variables ?? []).map(v => v.key));
  const orphanPlaceholders = placeholderKeys.filter(k => !variableKeys.has(k));
  const orphanVariables = (draft.variables ?? []).filter(v => v.key && !placeholderKeys.includes(v.key));

  const previewValues = Object.fromEntries((draft.variables ?? []).map(v => [v.key, v.default ?? '']));
  const previewText = substituteTemplate(draft.content, previewValues);

  const updateVariable = (idx, patch) => {
    const next = [...(draft.variables ?? [])];
    next[idx] = { ...next[idx], ...patch };
    setDraft({ ...draft, variables: next });
  };
  const addVariable = (key = '') => {
    setDraft({
      ...draft,
      variables: [
        ...(draft.variables ?? []),
        { key, label: '', default: '', type: 'text', suffix: '' },
      ],
    });
  };
  const removeVariable = (idx) => {
    setDraft({ ...draft, variables: (draft.variables ?? []).filter((_, i) => i !== idx) });
  };

  const canSave = draft.title.trim() && draft.category.trim() && draft.content.trim() && !saving;

  return (
    <Dialog open={!!clause} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isNew ? 'New clause' : `Edit: ${clause.title}`}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isNew
              ? 'Add a new reusable clause to the library.'
              : 'Changes apply to future contracts only. Already-signed contracts keep the text they were signed with.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-300 text-sm">Title</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Late Start Penalty"
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300 text-sm">Category</Label>
              <Input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="e.g. Performance"
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-zinc-300 text-sm">Content</Label>
            <Textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              rows={8}
              placeholder="The full text of the clause. Use {{variable_name}} for per-contract values."
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white text-sm leading-relaxed"
            />
            <p className="text-xs text-zinc-500 mt-1.5">
              Wrap any value users should be able to override in <code className="text-violet-300 bg-zinc-800 px-1 rounded">{`{{snake_case_name}}`}</code>. Then add it below.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300 text-sm flex items-center gap-1.5">
                <Variable className="w-4 h-4 text-violet-400" />
                Variables
              </Label>
              <Button
                type="button" size="sm" variant="outline"
                onClick={() => addVariable()}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-7 text-xs gap-1"
              >
                <Plus className="w-3 h-3" /> Add variable
              </Button>
            </div>

            {(draft.variables ?? []).length === 0 && (
              <p className="text-xs text-zinc-500 italic">No variables yet. Add one for each <code className="text-violet-300">{`{{...}}`}</code> placeholder in the content.</p>
            )}

            {(draft.variables ?? []).map((v, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start">
                <Input
                  value={v.key}
                  onChange={(e) => updateVariable(i, { key: normalizeVarKey(e.target.value) })}
                  placeholder="late_fee_percent"
                  className="col-span-3 bg-zinc-800 border-zinc-700 text-white font-mono text-xs h-9"
                />
                <Input
                  value={v.label}
                  onChange={(e) => updateVariable(i, { label: e.target.value })}
                  placeholder="Late fee per week"
                  className="col-span-3 bg-zinc-800 border-zinc-700 text-white text-xs h-9"
                />
                <Input
                  value={v.default}
                  onChange={(e) => updateVariable(i, { default: e.target.value })}
                  placeholder="5"
                  className="col-span-2 bg-zinc-800 border-zinc-700 text-white text-xs h-9"
                />
                <select
                  value={v.type || 'text'}
                  onChange={(e) => updateVariable(i, { type: e.target.value })}
                  className="col-span-2 bg-zinc-800 border-zinc-700 border text-white text-xs h-9 rounded-md px-2"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="days">Days</option>
                </select>
                <Input
                  value={v.suffix || ''}
                  onChange={(e) => updateVariable(i, { suffix: e.target.value })}
                  placeholder="%"
                  className="col-span-1 bg-zinc-800 border-zinc-700 text-white text-xs h-9"
                />
                <button
                  type="button"
                  onClick={() => removeVariable(i)}
                  className="col-span-1 h-9 text-zinc-500 hover:text-rose-400 flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {(orphanPlaceholders.length > 0 || orphanVariables.length > 0) && (
              <div className="text-xs space-y-1 pt-2 border-t border-zinc-800">
                {orphanPlaceholders.map(k => (
                  <p key={k} className="text-amber-400">
                    <code className="text-amber-300">{`{{${k}}}`}</code> is in the content but has no variable defined.{' '}
                    <button type="button" onClick={() => addVariable(k)} className="underline hover:text-amber-200">
                      Add it
                    </button>
                  </p>
                ))}
                {orphanVariables.map(v => (
                  <p key={v.key} className="text-zinc-500">
                    Variable <code className="text-zinc-400">{v.key}</code> is defined but not used in the content.
                  </p>
                ))}
              </div>
            )}

            {placeholderKeys.length > 0 && (draft.variables ?? []).length > 0 && (
              <div className="pt-2 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">Preview with default values:</p>
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 rounded p-2 border border-zinc-800">
                  {previewText}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label className="text-zinc-300 text-sm">Sort order</Label>
              <Input
                type="number"
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: parseInt(e.target.value || '0', 10) })}
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">Lower = appears earlier within the category.</p>
            </div>
            <div>
              <Label className="text-zinc-300 text-sm">Slug {!isNew && <span className="text-zinc-600">(careful — used to match existing contracts)</span>}</Label>
              <Input
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
                placeholder={slugify(draft.title) || 'auto-generated from title'}
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <div>
              <Label className="text-zinc-300 text-sm">Active</Label>
              <p className="text-xs text-zinc-500">Inactive clauses don't appear in the contract builder.</p>
            </div>
            <Switch
              checked={draft.is_active}
              onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSave(draft)}
            disabled={!canSave}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Create clause' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
