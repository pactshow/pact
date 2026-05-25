import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search,
  Edit,
  Trash2,
  Copy,
  Loader2,
  Sparkles
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import SectionPicker from "@/components/contracts/SectionPicker";
import { useSubscriptionAccess } from "@/lib/useSubscriptionAccess";
import ProUpgradeScreen from "@/components/account/ProUpgradeScreen";

// Outer wrapper handles the Pro gate so hooks in TemplatesInner are
// always called in the same order across renders.
export default function Templates() {
  const access = useSubscriptionAccess();

  if (access.isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }
  if (!access.isPro) {
    return <ProUpgradeScreen feature="templates" />;
  }
  return <TemplatesInner />;
}

function TemplatesInner() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formDialog, setFormDialog] = useState({ open: false, template: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, template: null });
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    set_length: '',
    deposit_percentage: 50,
    deposit_due_days_before: 14,
    balance_due_timing: 'day_of',
    technical_requirements: '',
    hospitality_requirements: '',
    additional_terms: '',
    load_in_hours_before: 2,
    contract_sections: []
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.ContractTemplate.list('-created_date'),
  });

  const createTemplate = useMutation({
    mutationFn: (data) => base44.entities.ContractTemplate.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContractTemplate.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id) => base44.entities.ContractTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const filteredTemplates = templates.filter(t => 
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openForm = (template = null) => {
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        name: '',
        description: '',
        set_length: '',
        deposit_percentage: 50,
        deposit_due_days_before: 14,
        balance_due_timing: 'day_of',
        technical_requirements: '',
        hospitality_requirements: '',
        additional_terms: '',
        load_in_hours_before: 2,
        contract_sections: []
      });
    }
    setFormDialog({ open: true, template });
  };

  const handleSave = async () => {
    setSaving(true);
    if (formDialog.template) {
      await updateTemplate.mutateAsync({ id: formDialog.template.id, data: formData });
    } else {
      await createTemplate.mutateAsync(formData);
    }
    setSaving(false);
    setFormDialog({ open: false, template: null });
  };

  const handleDelete = async () => {
    await deleteTemplate.mutateAsync(deleteDialog.template.id);
    setDeleteDialog({ open: false, template: null });
  };

  const handleDuplicate = (template) => {
    setFormData({
      ...template,
      name: `${template.name} (Copy)`
    });
    setFormDialog({ open: true, template: null });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Contract Templates</h1>
            <p className="mt-1 text-zinc-400">{templates.length} templates • Reusable terms & riders</p>
          </div>
          <Button 
            onClick={() => openForm()}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2 rounded-xl h-11 px-5"
          >
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </motion.div>

        {/* Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 rounded-xl"
            />
          </div>
        </motion.div>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredTemplates.map((template, i) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="group rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 hover:border-violet-500/50 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-violet-500/10">
                      <Sparkles className="w-6 h-6 text-violet-400" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDuplicate(template)}
                        className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openForm(template)}
                        className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteDialog({ open: true, template })}
                        className="h-8 w-8 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{template.description}</p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    {template.set_length && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Set Length</span>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                          {template.set_length}
                        </Badge>
                      </div>
                    )}
                    {template.deposit_percentage && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Deposit</span>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                          {template.deposit_percentage}%
                        </Badge>
                      </div>
                    )}
                    {template.load_in_hours_before && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Load-in</span>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                          {template.load_in_hours_before}h before
                        </Badge>
                      </div>
                    )}
                    <div className="pt-2 border-t border-zinc-800 flex flex-wrap gap-1">
                      {template.technical_requirements && (
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                          Tech Rider
                        </Badge>
                      )}
                      {template.hospitality_requirements && (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                          Hospitality
                        </Badge>
                      )}
                      {template.additional_terms && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                          Terms
                        </Badge>
                      )}
                      {template.contract_sections?.length > 0 && (
                        <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
                          {template.contract_sections.length} Clause{template.contract_sections.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-12 text-center"
          >
            <Sparkles className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {search ? "No templates found" : "No templates yet"}
            </h3>
            <p className="text-zinc-400 mb-4">
              {search 
                ? "Try adjusting your search"
                : "Create templates with standard terms, riders, and payment structures"}
            </p>
            {!search && (
              <Button 
                onClick={() => openForm()}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            )}
          </motion.div>
        )}

        {/* Form Dialog */}
        <Dialog open={formDialog.open} onOpenChange={(open) => setFormDialog({ open, template: open ? formDialog.template : null })}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {formDialog.template ? 'Edit Template' : 'New Template'}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Create reusable contract terms and riders
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-zinc-300">Template Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Standard Club Show, Festival Set, Corporate Event"
                    className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="What is this template for?"
                    className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-300">Set Length</Label>
                  <Input
                    value={formData.set_length}
                    onChange={(e) => setFormData({...formData, set_length: e.target.value})}
                    placeholder="e.g., 90 minutes, 2 hours"
                    className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Load-in Time (hours before)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="168"
                    step="0.5"
                    value={formData.load_in_hours_before || ''}
                    onChange={(e) => setFormData({...formData, load_in_hours_before: parseFloat(e.target.value) || null})}
                    placeholder="2"
                    className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="text-amber-400">💰</span> Payment Structure
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-300">Deposit Percentage</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={formData.deposit_percentage || ''}
                      onChange={(e) => setFormData({...formData, deposit_percentage: parseFloat(e.target.value) || null})}
                      placeholder="50"
                      className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <p className="text-xs text-zinc-500 mt-1">% of total contract amount</p>
                  </div>
                  <div>
                    <Label className="text-zinc-300">Deposit Due (days before)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.deposit_due_days_before || ''}
                      onChange={(e) => setFormData({...formData, deposit_due_days_before: parseInt(e.target.value) || null})}
                      placeholder="14"
                      className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-zinc-300">Balance Due</Label>
                  <Select 
                    value={formData.balance_due_timing} 
                    onValueChange={(v) => setFormData({...formData, balance_due_timing: v})}
                  >
                    <SelectTrigger className="mt-1.5 bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="before_performance">Before Performance</SelectItem>
                      <SelectItem value="day_of">Day of Performance</SelectItem>
                      <SelectItem value="after_performance">After Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-zinc-300">Technical Requirements</Label>
                <Textarea
                  value={formData.technical_requirements}
                  onChange={(e) => setFormData({...formData, technical_requirements: e.target.value})}
                  placeholder="Sound system, backline, stage specs, lighting..."
                  rows={4}
                  className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              <div>
                <Label className="text-zinc-300">Hospitality Requirements</Label>
                <Textarea
                  value={formData.hospitality_requirements}
                  onChange={(e) => setFormData({...formData, hospitality_requirements: e.target.value})}
                  placeholder="Catering, dressing room, accommodations..."
                  rows={4}
                  className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              <div>
                <Label className="text-zinc-300">Additional Terms</Label>
                <Textarea
                  value={formData.additional_terms}
                  onChange={(e) => setFormData({...formData, additional_terms: e.target.value})}
                  placeholder="Cancellation policy, force majeure, liability..."
                  rows={4}
                  className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="pt-2 border-t border-zinc-700">
                <Label className="text-zinc-300 block mb-1">Contract Clauses</Label>
                <p className="text-xs text-zinc-500 mb-3">Select prewritten legal sections to include in contracts using this template. You can edit any section's text.</p>
                <SectionPicker
                  sections={formData.contract_sections || []}
                  onChange={(sections) => setFormData({...formData, contract_sections: sections})}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setFormDialog({ open: false, template: null })}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formData.name}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {formDialog.template ? 'Update' : 'Create'} Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, template: open ? deleteDialog.template : null })}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Template?</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                This will permanently delete "{deleteDialog.template?.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}