import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, ChevronUp, Pencil, X, Loader2, Variable } from "lucide-react";
import { cn, substituteTemplate } from "@/lib/utils";

// sections: array of { id, title, content } — selected sections
// onChange: (sections) => void
export default function SectionPicker({ sections = [], onChange }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState({});

  const { data: library = [], isLoading } = useQuery({
    queryKey: ['clause-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clause_library')
        .select('id, slug, title, category, content, sort_order, variables, profile_id, variant_group, variant_group_label')
        .eq('is_active', true)
        .order('category')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []).map(c => ({
        id: c.slug,
        title: c.title,
        category: c.category,
        content: c.content,
        variables: Array.isArray(c.variables) ? c.variables : [],
        isCustom: !!c.profile_id,
        variantGroup: c.variant_group ?? null,
        variantGroupLabel: c.variant_group_label ?? null,
      }));
    },
  });

  const libraryById = new Map(library.map(c => [c.id, c]));

  const categories = Array.from(new Set(library.map(s => s.category))).sort();

  const selectedIds = new Set(sections.map(s => s.id));

  const displayed = activeCategory === "All"
    ? library
    : library.filter(s => s.category === activeCategory);

  // Group displayed clauses: standalone rows stay as-is, variant_group
  // rows collapse into a single entry the picker renders with radios.
  // Order is preserved by the position of the FIRST variant in the
  // original sorted library, so admin sort_order still controls layout.
  const pickerEntries = (() => {
    const out = [];
    const groupIdx = new Map();
    for (const c of displayed) {
      if (!c.variantGroup) {
        out.push({ kind: 'single', clause: c });
        continue;
      }
      const existing = groupIdx.get(c.variantGroup);
      if (existing != null) {
        out[existing].variants.push(c);
      } else {
        groupIdx.set(c.variantGroup, out.length);
        out.push({
          kind: 'group',
          group: c.variantGroup,
          label: c.variantGroupLabel || c.variantGroup,
          category: c.category,
          variants: [c],
        });
      }
    }
    return out;
  })();

  // For mutex-within-group selection, we need to know which variant
  // (if any) of a group is currently in the contract.
  const selectedByGroup = new Map();
  for (const s of sections) {
    const lib = libraryById.get(s.id);
    if (lib?.variantGroup) selectedByGroup.set(lib.variantGroup, s.id);
  }

  const buildSectionRow = (section) => {
    // Snapshot the resolved text + variable values onto the contract.
    // Once signed this is immutable, so future admin edits to the library
    // can't change what's on this contract.
    const variables = Object.fromEntries(
      (section.variables ?? []).map(v => [v.key, v.default ?? ''])
    );
    return {
      id: section.id,
      title: section.title,
      content: substituteTemplate(section.content, variables),
      template: section.content,
      variables,
    };
  };

  const toggleSection = (section) => {
    if (selectedIds.has(section.id)) {
      onChange(sections.filter(s => s.id !== section.id));
    } else {
      onChange([...sections, buildSectionRow(section)]);
    }
  };

  // Variant groups are mutex: picking a new variant replaces the
  // previously-selected one in place (preserves contract order).
  const selectVariant = (variant) => {
    const prevId = selectedByGroup.get(variant.variantGroup);
    if (prevId === variant.id) {
      onChange(sections.filter(s => s.id !== variant.id));
      return;
    }
    if (prevId) {
      onChange(sections.map(s => s.id === prevId ? buildSectionRow(variant) : s));
    } else {
      onChange([...sections, buildSectionRow(variant)]);
    }
  };

  const updateVariable = (sectionId, key, value) => {
    const lib = libraryById.get(sectionId);
    onChange(sections.map(s => {
      if (s.id !== sectionId) return s;
      const nextVars = { ...(s.variables ?? {}), [key]: value };
      const template = s.template ?? lib?.content ?? s.content;
      return {
        ...s,
        variables: nextVars,
        content: substituteTemplate(template, nextVars),
        template,
      };
    }));
  };

  const updateContent = (id, content) => {
    onChange(sections.map(s => s.id === id ? { ...s, content } : s));
    setEditing(prev => ({ ...prev, [id]: undefined }));
  };

  const removeSection = (id) => {
    onChange(sections.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Library */}
      <div>
        <p className="text-sm text-zinc-400 mb-3">Click sections below to add them to your template:</p>
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["All", ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                activeCategory === cat
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading clause library…
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {pickerEntries.map(entry => {
            if (entry.kind === 'single') {
              const section = entry.clause;
              const isSelected = selectedIds.has(section.id);
              return (
                <div
                  key={section.id}
                  className={cn(
                    "rounded-xl border transition-all",
                    isSelected
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                  )}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleSection(section)}
                      className={cn(
                        "flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        isSelected
                          ? "bg-violet-600 border-violet-600"
                          : "border-zinc-600 hover:border-violet-500"
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-white">{section.title}</span>
                      <Badge className="ml-2 bg-zinc-700/50 text-zinc-400 border-0 text-xs py-0">
                        {section.category}
                      </Badge>
                      {section.isCustom && (
                        <Badge className="ml-1.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs py-0">
                          Yours
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => setExpanded(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                      className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                    >
                      {expanded[section.id]
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  {expanded[section.id] && (
                    <div className="px-4 pb-3">
                      <p className="text-xs text-zinc-400 leading-relaxed">{section.content}</p>
                    </div>
                  )}
                </div>
              );
            }

            // Variant group: one header, radio-select among variants.
            const groupKey = `group:${entry.group}`;
            const selectedVariantId = selectedByGroup.get(entry.group) ?? null;
            const isGroupOpen = expanded[groupKey];
            return (
              <div
                key={groupKey}
                className={cn(
                  "rounded-xl border transition-all",
                  selectedVariantId
                    ? "border-violet-500/50 bg-violet-500/10"
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className={cn(
                    "flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                    selectedVariantId
                      ? "bg-violet-600 border-violet-600"
                      : "border-zinc-600"
                  )}>
                    {selectedVariantId && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-white">{entry.label}</span>
                    <Badge className="ml-2 bg-zinc-700/50 text-zinc-400 border-0 text-xs py-0">
                      {entry.category}
                    </Badge>
                    <Badge className="ml-1.5 bg-violet-500/10 text-violet-300/80 border border-violet-500/20 text-xs py-0">
                      Choose one
                    </Badge>
                  </div>
                  <span className="text-zinc-500 flex-shrink-0">
                    {isGroupOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>
                {isGroupOpen && (
                  <div className="px-4 pb-3 space-y-2 border-t border-zinc-800 pt-3">
                    {entry.variants.map(v => {
                      const isPicked = selectedVariantId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => selectVariant(v)}
                          className={cn(
                            "w-full text-left rounded-lg border p-3 transition-all",
                            isPicked
                              ? "border-violet-500 bg-violet-500/10"
                              : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className={cn(
                              "mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                              isPicked
                                ? "border-violet-500"
                                : "border-zinc-600"
                            )}>
                              {isPicked && <span className="w-2 h-2 rounded-full bg-violet-500" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{v.title}</p>
                              <p className="text-xs text-zinc-400 leading-relaxed mt-1">{v.content}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Sections */}
      {sections.length > 0 && (
        <div>
          <p className="text-sm font-medium text-white mb-3">
            Selected Sections ({sections.length})
          </p>
          <div className="space-y-3">
            {sections.map((section, idx) => (
              <div key={section.id} className="rounded-xl border border-violet-500/30 bg-zinc-900/80 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-mono">§{idx + 1}</span>
                    <span className="text-sm font-semibold text-white">{section.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(prev => ({ ...prev, [section.id]: section.content }))}
                      className="p-1.5 text-zinc-500 hover:text-violet-400 rounded-lg hover:bg-violet-500/10 transition-all"
                      title="Edit content"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeSection(section.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                      title="Remove section"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {(() => {
                  const lib = libraryById.get(section.id);
                  const vars = lib?.variables ?? [];
                  if (vars.length === 0) return null;
                  return (
                    <div className="mb-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-3">
                      <p className="text-xs text-violet-300 font-medium mb-2 flex items-center gap-1.5">
                        <Variable className="w-3 h-3" />
                        Customize
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {vars.map(v => (
                          <div key={v.key}>
                            <label className="text-xs text-zinc-400 block mb-1">{v.label || v.key}</label>
                            <div className="flex items-center gap-1">
                              <Input
                                type={v.type === 'number' || v.type === 'days' ? 'number' : 'text'}
                                value={section.variables?.[v.key] ?? v.default ?? ''}
                                onChange={(e) => updateVariable(section.id, v.key, e.target.value)}
                                className="bg-zinc-900 border-zinc-700 text-white text-xs h-8"
                              />
                              {v.suffix && (
                                <span className="text-xs text-zinc-500">{v.suffix}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {editing[section.id] !== undefined ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editing[section.id]}
                      onChange={(e) => setEditing(prev => ({ ...prev, [section.id]: e.target.value }))}
                      rows={4}
                      className="bg-zinc-800 border-zinc-600 text-white text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateContent(section.id, editing[section.id])}
                        className="bg-violet-600 hover:bg-violet-700 h-7 text-xs"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(prev => ({ ...prev, [section.id]: undefined }))}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 leading-relaxed">{section.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}