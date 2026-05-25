import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Send, Loader2, Sparkles, Upload, FileText, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ContractFormFields from "@/components/contracts/ContractFormFields";
import { useSubscriptionAccess } from "@/lib/useSubscriptionAccess";
import PaywallScreen from "@/components/account/PaywallScreen";
import { useFolderLabel } from "@/lib/useFolderLabel";
import { FolderOpen } from "lucide-react";

// Outer wrapper handles the paywall gate so hooks in the inner form
// component never get conditionally skipped (Rules of Hooks).
export default function ContractForm() {
  const params = new URLSearchParams(window.location.search);
  const isCreateMode = !params.get('id');
  const access = useSubscriptionAccess();

  if (isCreateMode) {
    if (access.isLoading) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      );
    }
    if (!access.canCreateContracts) {
      return <PaywallScreen blockReason={access.blockReason} />;
    }
  }

  return <ContractFormInner />;
}

function ContractFormInner() {
  const navigate = useNavigate();
  const { isPro } = useSubscriptionAccess();
  const [lockedFields, setLockedFields] = useState({});
  const [contract, setContract] = useState({
    status: 'draft',
    title: '',
    contractor_name: '',
    contractor_email: '',
    client_name: '',
    client_email: '',
    client_address: '',
    performance_date: '',
    performance_end_date: '',
    load_in_time: '',
    performance_time: '',
    set_length: '',
    total_amount: null,
    deposit_amount: null,
    deposit_due_date: '',
    balance_due_date: '',
    technical_requirements: '',
    hospitality_requirements: '',
    additional_terms: '',
    source: 'generated',
    uploaded_file_path: null,
    uploaded_file_name: null,
    event_group_id: null,
  });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [counterToId, setCounterToId] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [fileError, setFileError] = useState(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.ContractTemplate.list(),
  });

  // Folders only fetched for Pro users — Basic doesn't see the picker.
  const { data: folders = [] } = useQuery({
    queryKey: ['event-groups'],
    queryFn: () => base44.entities.EventGroup.list('-created_date'),
    enabled: isPro,
  });
  const folderLabel = useFolderLabel();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const template = params.get('template');
    const counterTo = params.get('counter_to');
    const eventGroupId = params.get('event_group_id');

    // Pre-fill from the folder when creating inside one — pull dates +
    // venue. Leave any field the user has already typed alone (this
    // effect runs once on mount, before they could have edited).
    if (eventGroupId && !id) {
      (async () => {
        try {
          const folder = await base44.entities.EventGroup.get(eventGroupId);
          if (!folder) return;
          setContract((prev) => ({
            ...prev,
            event_group_id: eventGroupId,
            performance_date: prev.performance_date || folder.start_date || '',
            performance_end_date:
              prev.performance_end_date ||
              (folder.end_date && folder.end_date !== folder.start_date ? folder.end_date : ''),
            client_address: prev.client_address || folder.venue || '',
          }));
        } catch (err) {
          console.warn('Folder pre-fill failed:', err);
          setContract((prev) => ({ ...prev, event_group_id: eventGroupId }));
        }
      })();
    } else if (eventGroupId) {
      setContract((prev) => ({ ...prev, event_group_id: eventGroupId }));
    }

    if (id) {
      setEditId(id);
      loadContract(id);
    } else if (counterTo) {
      setCounterToId(counterTo);
      loadCounterContract(counterTo);
    } else if (template) {
      setTemplateId(template);
      loadTemplate(template);
    }

    // Pre-fill from profile
    const prefillContractor = params.get('prefill_contractor');
    const prefillContractorEmail = params.get('prefill_contractor_email');
    const prefillClient = params.get('prefill_client');
    const prefillClientEmail = params.get('prefill_client_email');
    const prefillClientAddress = params.get('prefill_client_address');

    if (prefillContractor || prefillClient) {
      setContract(prev => ({
        ...prev,
        ...(prefillContractor && { contractor_name: prefillContractor }),
        ...(prefillContractorEmail && { contractor_email: prefillContractorEmail }),
        ...(prefillClient && { client_name: prefillClient }),
        ...(prefillClientEmail && { client_email: prefillClientEmail }),
        ...(prefillClientAddress && { client_address: prefillClientAddress }),
      }));
    }
  }, []);

  const loadContract = async (id) => {
    const data = await base44.entities.Contract.list();
    const found = data.find(c => c.id === id);
    if (found) {
      setContract(found);
    }
  };

  const loadCounterContract = async (id) => {
    const data = await base44.entities.Contract.list();
    const found = data.find(c => c.id === id);
    if (found) {
      const { contractor_signature, client_signature, contractor_signed_date, client_signed_date,
              contractor_signed_device, client_signed_device, status, id: _id, created_date,
              updated_date, created_by, pdf_url, ...rest } = found;
      setContract({
        ...rest,
        title: `Counter: ${found.title}`,
        status: 'draft',
        counter_offer_to: id,
      });
    }
  };

  const loadTemplate = async (id) => {
    const data = await base44.entities.ContractTemplate.list();
    const found = data.find(t => t.id === id);
    if (found) {
      setContract({
        ...contract,
        set_length: found.set_length || '',
        technical_requirements: found.technical_requirements || '',
        hospitality_requirements: found.hospitality_requirements || '',
        additional_terms: found.additional_terms || ''
      });
    }
  };

  const applyTemplate = (template) => {
    if (!template) return;

    setContract({
      ...contract,
      set_length: template.set_length || contract.set_length,
      technical_requirements: template.technical_requirements || contract.technical_requirements,
      hospitality_requirements: template.hospitality_requirements || contract.hospitality_requirements,
      additional_terms: template.additional_terms || contract.additional_terms,
      contract_sections: template.contract_sections || []
    });
    setTemplateId(template.id);
  };

  const handleFileSelect = (file) => {
    setFileError(null);
    if (!file) {
      setPendingFile(null);
      return;
    }
    if (file.type !== 'application/pdf') {
      setFileError('Only PDF files are accepted');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setFileError('File must be under 20 MB');
      return;
    }
    setPendingFile(file);
  };

  const uploadContractFile = async (contractId, file) => {
    const path = `${contractId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from('contract-uploads')
      .upload(path, file, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw uploadError;
    return { path, fileName: file.name };
  };

  const handleSave = async (status = 'draft') => {
    // Required-field check up front so the user gets a useful message
    // instead of a NOT NULL violation from Postgres.
    const missing = [];
    if (!contract.title?.trim()) missing.push('Contract Title');
    if (!contract.contractor_name?.trim()) missing.push('Contractor Name');
    if (!contract.client_name?.trim()) missing.push('Client Name');
    if (!contract.performance_date) missing.push('Performance Date');
    if (!contract.total_amount || contract.total_amount <= 0) missing.push('Total Amount');
    if (contract.source === 'uploaded' && !pendingFile && !contract.uploaded_file_path) {
      missing.push('Contract PDF');
    }
    if (missing.length > 0) {
      alert(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    // Sanity checks — DB has CHECK constraints (migration 0016) but
    // catching them here gives a friendlier error than a Postgres
    // constraint-violation message.
    const violations = [];
    if (contract.total_amount != null && contract.total_amount <= 0) {
      violations.push('Total Amount must be greater than $0');
    }
    if (contract.deposit_amount != null && contract.deposit_amount < 0) {
      violations.push('Deposit Amount cannot be negative');
    }
    if (
      contract.deposit_amount != null &&
      contract.total_amount != null &&
      Number(contract.deposit_amount) > Number(contract.total_amount)
    ) {
      violations.push('Deposit Amount cannot exceed Total Amount');
    }
    if (contract.performance_date && contract.performance_end_date &&
        contract.performance_end_date < contract.performance_date) {
      violations.push('Performance End Date must be on or after Performance Date');
    }
    if (contract.deposit_due_date && contract.performance_date &&
        contract.deposit_due_date > contract.performance_date) {
      violations.push('Deposit Due Date must be on or before Performance Date');
    }
    if (contract.deposit_due_date && contract.balance_due_date &&
        contract.balance_due_date < contract.deposit_due_date) {
      violations.push('Balance Due Date must be on or after Deposit Due Date');
    }
    if (violations.length > 0) {
      alert(violations.join('\n'));
      return;
    }

    setSaving(true);

    // Postgres rejects '' for date columns. Coerce any empty optional
    // date fields to null before sending.
    const blankToNull = (v) => (v === '' ? null : v);
    const data = {
      ...contract,
      status,
      deposit_due_date: blankToNull(contract.deposit_due_date),
      balance_due_date: blankToNull(contract.balance_due_date),
      performance_date: blankToNull(contract.performance_date),
      performance_end_date: blankToNull(contract.performance_end_date),
    };

    // Uploaded contracts skip the structured-content fields. Null them out
    // so the detail page renders the PDF viewer cleanly.
    if (data.source === 'uploaded') {
      data.technical_requirements = null;
      data.hospitality_requirements = null;
      data.additional_terms = null;
      data.contract_sections = [];
    }

    try {
      if (editId) {
        if (pendingFile) {
          const { path, fileName } = await uploadContractFile(editId, pendingFile);
          data.uploaded_file_path = path;
          data.uploaded_file_name = fileName;
        }
        await base44.entities.Contract.update(editId, data);
      } else {
        const created = await base44.entities.Contract.create(data);
        if (pendingFile && data.source === 'uploaded') {
          const { path, fileName } = await uploadContractFile(created.id, pendingFile);
          await base44.entities.Contract.update(created.id, {
            uploaded_file_path: path,
            uploaded_file_name: fileName,
          });
        }
        if (data.deposit_amount && data.deposit_amount > 0) {
          await base44.entities.Payment.create({
            contract_id: created.id,
            type: 'deposit',
            amount: data.deposit_amount,
            due_date: data.deposit_due_date || null,
            status: 'pending',
            payer_name: data.client_name,
            payee_name: data.contractor_name
          });
        }
        if (data.total_amount && data.deposit_amount && (data.total_amount - data.deposit_amount) > 0) {
          await base44.entities.Payment.create({
            contract_id: created.id,
            type: 'balance',
            amount: data.total_amount - data.deposit_amount,
            due_date: data.balance_due_date || null,
            status: 'pending',
            payer_name: data.client_name,
            payee_name: data.contractor_name
          });
        }
      }
      navigate(createPageUrl("Contracts"));
    } catch (err) {
      console.error('Contract save failed:', err);
      alert(`Could not save contract: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            to={createPageUrl("Contracts")}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contracts
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {editId ? 'Edit Contract' : counterToId ? 'Counter Offer' : 'New Contract'}
          </h1>
          <p className="mt-1 text-zinc-400">
            {editId ? 'Update the contract details below' : counterToId ? 'Propose updated terms as a counter offer' : 'Fill in the details to create a new performance contract'}
          </p>
        </motion.div>

        {/* Template Selector */}
        {!editId && templates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-fuchsia-600/20 border border-violet-500/20 p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <Label className="text-white font-semibold">Start with a Template</Label>
            </div>
            <div className="flex gap-3">
              <Select
                value={templateId || 'none'}
                onValueChange={(v) => {
                  if (v === 'none') {
                    setTemplateId(null);
                  } else {
                    const template = templates.find(t => t.id === v);
                    applyTemplate(template);
                  }
                }}
              >
                <SelectTrigger className="flex-1 bg-zinc-900/50 border-zinc-700 text-white">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none">No Template</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link to={createPageUrl("Templates")}>
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Manage Templates
                </Button>
              </Link>
            </div>
            <p className="text-sm text-zinc-400 mt-2">
              Templates pre-fill terms, riders, and payment structures
            </p>
          </motion.div>
        )}

        {/* Upload-your-own-contract toggle (Pro feature).
            Visible if Pro, OR if a non-Pro is editing an existing
            uploaded contract — in that case the toggle is omitted so
            they can't accidentally lose Pro access mid-edit, but they
            keep the file UI to manage the existing PDF. */}
        {(isPro || contract.source === 'uploaded') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5 mb-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-white font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-violet-400" />
                Upload your own contract
              </Label>
              <p className="text-sm text-zinc-400 mt-1">
                Use your own PDF instead of Pact's structured form. Parties, payment terms, and performance details still apply.
              </p>
            </div>
            {isPro && (
              <Switch
                checked={contract.source === 'uploaded'}
                onCheckedChange={(checked) => {
                  setContract({ ...contract, source: checked ? 'uploaded' : 'generated' });
                  if (!checked) {
                    setPendingFile(null);
                    setFileError(null);
                  }
                }}
              />
            )}
          </div>

          {contract.source === 'uploaded' && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              {!pendingFile && !contract.uploaded_file_name && (
                <label className="flex items-center justify-center gap-3 px-4 py-8 rounded-xl border-2 border-dashed border-zinc-700 hover:border-violet-500 hover:bg-violet-500/5 transition-colors cursor-pointer">
                  <Upload className="w-5 h-5 text-zinc-400" />
                  <span className="text-sm text-zinc-300">Click to choose a PDF (max 20 MB)</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  />
                </label>
              )}
              {(pendingFile || contract.uploaded_file_name) && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-violet-400 shrink-0" />
                    <span className="text-sm text-white truncate">
                      {pendingFile?.name || contract.uploaded_file_name}
                    </span>
                    {pendingFile && (
                      <span className="text-xs text-zinc-500 shrink-0">
                        {(pendingFile.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingFile(null);
                      setContract({ ...contract, uploaded_file_path: null, uploaded_file_name: null });
                    }}
                    className="text-zinc-400 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {fileError && (
                <p className="mt-2 text-sm text-rose-400">{fileError}</p>
              )}
            </div>
          )}
        </motion.div>
        )}

        {/* Folder picker (Pro feature) — assign this contract to a Tour/Event */}
        {isPro && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5 mb-4"
          >
            <Label className="text-white font-semibold flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-violet-400" />
              {folderLabel.singular}
            </Label>
            <p className="text-sm text-zinc-400 mt-1 mb-3">
              Optionally group this contract under a {folderLabel.lowerSingular}.
            </p>
            <Select
              value={contract.event_group_id ?? '__none__'}
              onValueChange={(v) =>
                setContract({ ...contract, event_group_id: v === '__none__' ? null : v })
              }
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder={`No ${folderLabel.lowerSingular}`} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                <SelectItem value="__none__">No {folderLabel.lowerSingular}</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        )}

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 sm:p-8"
        >
          <ContractFormFields
            contract={contract}
            onChange={setContract}
            lockedFields={lockedFields}
            hideStructuredContent={contract.source === 'uploaded'}
          />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-10 pt-6 border-t border-zinc-800">
            <Button
              onClick={() => handleSave('draft')}
              disabled={saving}
              variant="outline"
              className="flex-1 sm:flex-none border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2 rounded-xl h-11"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSave('sent')}
              disabled={saving || !contract.title || !contract.contractor_name || !contract.client_name}
              className="flex-1 sm:flex-none bg-violet-600 hover:bg-violet-700 text-white gap-2 rounded-xl h-11"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Save & Send
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
