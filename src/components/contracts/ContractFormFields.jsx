import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Briefcase, User, DollarSign, Clock, FileText, BookOpen, UserCheck, Percent } from "lucide-react";
import SectionPicker from "./SectionPicker";
import NetworkProfilePicker from "./NetworkProfilePicker";
import { useMyProfile } from "@/lib/RoleContext";
import { feeBreakdown, formatUSD, PACT_FEE_BPS } from "@/lib/feeMath";

export default function ContractFormFields({ contract, onChange, lockedFields = {}, hideStructuredContent = false }) {
  const { myProfile } = useMyProfile();

  const handleChange = (field, value) => {
    if (lockedFields[field]) return;
    onChange({ ...contract, [field]: value });
  };

  const handleSelectContractor = (profile) => {
    onChange({
      ...contract,
      contractor_profile_id: profile.id,
      contractor_name: profile.name || contract.contractor_name,
      contractor_email: profile.email || contract.contractor_email,
    });
  };

  const handleSelectClient = (profile) => {
    onChange({
      ...contract,
      client_profile_id: profile.id,
      client_name: profile.name || contract.client_name,
      client_email: profile.email || contract.client_email,
      client_address: [profile.address, profile.city, profile.state, profile.zip_code].filter(Boolean).join(', ') || contract.client_address,
    });
  };

  const lockedInputClass = "mt-1.5 bg-zinc-800/30 border-zinc-700/50 text-zinc-400 cursor-not-allowed";
  const editableInputClass = "mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500";

  return (
    <div className="space-y-8">
      {/* Basic Info */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-violet-400 mb-4">
          <FileText className="w-5 h-5" />
          <h3 className="font-semibold text-white">Contract Details</h3>
        </div>

        <div>
          <Label className="text-zinc-300">Contract Title / Event Name</Label>
          <Input
            value={contract.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., Summer Music Festival 2024"
            maxLength={200}
            className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
          />
        </div>
      </section>

      {/* Contractor Info */}
      <section className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-violet-400">
            <User className="w-5 h-5" />
            <h3 className="font-semibold text-white">Contractor Information</h3>
          </div>
          <div className="flex items-center gap-2">
            {myProfile && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleSelectContractor(myProfile)}
                className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 h-8 px-3 gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" /> Use my info
              </Button>
            )}
            <NetworkProfilePicker onSelect={handleSelectContractor} label="Pick from Network" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-300 flex items-center gap-2">
              Contractor Name
              {lockedFields.contractor_name && <span className="text-xs text-violet-400 font-normal">● from profile</span>}
            </Label>
            <Input
              value={contract.contractor_name || ''}
              onChange={(e) => handleChange('contractor_name', e.target.value)}
              placeholder="Contractor name"
              readOnly={!!lockedFields.contractor_name}
              className={lockedFields.contractor_name ? lockedInputClass : editableInputClass}
            />
          </div>
          <div>
            <Label className="text-zinc-300 flex items-center gap-2">
              Contractor Email
              {lockedFields.contractor_email && <span className="text-xs text-violet-400 font-normal">● from profile</span>}
            </Label>
            <Input
              type="email"
              value={contract.contractor_email || ''}
              onChange={(e) => handleChange('contractor_email', e.target.value)}
              placeholder="contractor@email.com"
              readOnly={!!lockedFields.contractor_email}
              className={lockedFields.contractor_email ? lockedInputClass : editableInputClass}
            />
          </div>
        </div>
      </section>

      {/* Client Info */}
      <section className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-violet-400">
            <Briefcase className="w-5 h-5" />
            <h3 className="font-semibold text-white">Client Information</h3>
          </div>
          <div className="flex items-center gap-2">
            {myProfile && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleSelectClient(myProfile)}
                className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 h-8 px-3 gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" /> Use my info
              </Button>
            )}
            <NetworkProfilePicker onSelect={handleSelectClient} label="Pick from Network" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-300 flex items-center gap-2">
              Client Name
              {lockedFields.client_name && <span className="text-xs text-violet-400 font-normal">● from profile</span>}
            </Label>
            <Input
              value={contract.client_name || ''}
              onChange={(e) => handleChange('client_name', e.target.value)}
              placeholder="Client name"
              readOnly={!!lockedFields.client_name}
              className={lockedFields.client_name ? lockedInputClass : editableInputClass}
            />
          </div>
          <div>
            <Label className="text-zinc-300 flex items-center gap-2">
              Client Email
              {lockedFields.client_email && <span className="text-xs text-violet-400 font-normal">● from profile</span>}
            </Label>
            <Input
              type="email"
              value={contract.client_email || ''}
              onChange={(e) => handleChange('client_email', e.target.value)}
              placeholder="client@email.com"
              readOnly={!!lockedFields.client_email}
              className={lockedFields.client_email ? lockedInputClass : editableInputClass}
            />
          </div>
        </div>

        <div>
          <Label className="text-zinc-300 flex items-center gap-2">
            Client Address
            {lockedFields.client_address && <span className="text-xs text-violet-400 font-normal">● from profile</span>}
          </Label>
          <Input
            value={contract.client_address || ''}
            onChange={(e) => handleChange('client_address', e.target.value)}
            placeholder="Full address"
            readOnly={!!lockedFields.client_address}
            className={lockedFields.client_address ? lockedInputClass : editableInputClass}
          />
        </div>
      </section>

      {/* Performance Details */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-violet-400 mb-4">
          <Clock className="w-5 h-5" />
          <h3 className="font-semibold text-white">Performance Details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-zinc-300">Performance Date</Label>
            <Input
              type="date"
              value={contract.performance_date || ''}
              onChange={(e) => handleChange('performance_date', e.target.value)}
              className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <Checkbox
                checked={!!contract.performance_end_date}
                onCheckedChange={(checked) => {
                  // Toggling on: default end date to performance_date so the
                  // user just bumps it, doesn't have to type from scratch.
                  // Toggling off: null out the field so the contract reads
                  // as single-day.
                  if (checked) {
                    handleChange('performance_end_date', contract.performance_date || '');
                  } else {
                    handleChange('performance_end_date', null);
                  }
                }}
                id="multi-day-toggle"
                className="border-zinc-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
              />
              <span className="text-sm text-zinc-400">Multi-day performance</span>
            </label>
          </div>
          {contract.performance_end_date !== null && contract.performance_end_date !== undefined && (
            <div>
              <Label className="text-zinc-300">End Date</Label>
              <Input
                type="date"
                min={contract.performance_date || undefined}
                value={contract.performance_end_date || ''}
                onChange={(e) => handleChange('performance_end_date', e.target.value)}
                className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
              />
            </div>
          )}
          <div>
            <Label className="text-zinc-300">Set Length</Label>
            <Input
              value={contract.set_length || ''}
              onChange={(e) => handleChange('set_length', e.target.value)}
              placeholder="e.g., 90 minutes"
              className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-300">Load-in / Soundcheck Time</Label>
            <Input
              type="time"
              step="900"
              value={contract.load_in_time || ''}
              onChange={(e) => handleChange('load_in_time', e.target.value)}
              className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 [color-scheme:dark]"
            />
          </div>
          <div>
            <Label className="text-zinc-300">Performance Time</Label>
            <Input
              type="time"
              step="900"
              value={contract.performance_time || ''}
              onChange={(e) => handleChange('performance_time', e.target.value)}
              className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 [color-scheme:dark]"
            />
          </div>
        </div>
      </section>

      {/* Payment Terms */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-violet-400 mb-4">
          <DollarSign className="w-5 h-5" />
          <h3 className="font-semibold text-white">Payment Terms</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-zinc-300">Total Amount ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={contract.total_amount || ''}
              onChange={(e) => handleChange('total_amount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
            />
          </div>
          <div>
            <Label className="text-zinc-300">Deposit Amount ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={contract.deposit_amount || ''}
              onChange={(e) => handleChange('deposit_amount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
            />
          </div>
          <div>
            <Label className="text-zinc-300">Deposit Payment Date</Label>
            <Input
              type="date"
              value={contract.deposit_due_date || ''}
              onChange={(e) => handleChange('deposit_due_date', e.target.value)}
              className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
            />
            <p className="mt-1 text-xs text-zinc-500">Date the client must initiate the deposit payment by.</p>
          </div>
        </div>

        <div>
          <Label className="text-zinc-300">Balance Payment Date</Label>
          <Input
            type="date"
            value={contract.balance_due_date || ''}
            onChange={(e) => handleChange('balance_due_date', e.target.value)}
            className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 md:w-1/3"
          />
          <p className="mt-1 text-xs text-zinc-500">Date the client must initiate the balance payment by.</p>
        </div>

        <FeePayerPicker contract={contract} handleChange={handleChange} locked={!!lockedFields.fee_payer} />

        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-zinc-300">
          <p className="font-medium text-violet-300 mb-1">How payouts work</p>
          <p className="text-zinc-400">
            Once the client pays, the funds settle in Stripe (Pact's payment processor) through the dispute window.
            After the window closes with no dispute, Stripe releases the funds to the contractor's
            connected bank account — typically arriving within <span className="text-zinc-200 font-medium">5–10 business days</span>.
          </p>
        </div>
      </section>

      {/* Additional Terms — hidden when uploading own contract */}
      {!hideStructuredContent && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-violet-400 mb-4">
            <FileText className="w-5 h-5" />
            <h3 className="font-semibold text-white">Riders & Terms</h3>
          </div>

          <div>
            <Label className="text-zinc-300">Technical Requirements</Label>
            <Textarea
              value={contract.technical_requirements || ''}
              onChange={(e) => handleChange('technical_requirements', e.target.value)}
              placeholder="Sound system requirements, backline, stage specs..."
              rows={4}
              maxLength={10000}
              className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
            />
          </div>

          <div>
            <Label className="text-zinc-300">Hospitality Requirements</Label>
            <Textarea
              value={contract.hospitality_requirements || ''}
              onChange={(e) => handleChange('hospitality_requirements', e.target.value)}
              placeholder="Catering, dressing room, accommodations..."
              maxLength={10000}
              rows={4}
              className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
            />
          </div>

          <div>
            <Label className="text-zinc-300">Additional Terms & Notes</Label>
            <Textarea
              value={contract.additional_terms || ''}
              onChange={(e) => handleChange('additional_terms', e.target.value)}
              placeholder="Any other terms, cancellation policy, etc..."
              rows={4}
              maxLength={20000}
              className="mt-1.5 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500"
            />
          </div>
        </section>
      )}

      {/* Contract Clauses — hidden when uploading own contract */}
      {!hideStructuredContent && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-violet-400 mb-4">
            <BookOpen className="w-5 h-5" />
            <h3 className="font-semibold text-white">Contract Clauses</h3>
          </div>
          <SectionPicker
            sections={contract.contract_sections || []}
            onChange={(sections) => handleChange('contract_sections', sections)}
          />
        </section>
      )}
    </div>
  );
}

function FeePayerPicker({ contract, handleChange, locked }) {
  const feePayer = contract.fee_payer || 'contractor';
  const totalCents = Math.round((parseFloat(contract.total_amount) || 0) * 100);
  const breakdown = feeBreakdown(totalCents, feePayer);
  const feePct = (PACT_FEE_BPS / 100).toFixed(0);

  const options = [
    {
      key: 'contractor',
      label: 'Contractor pays',
      sub: 'Fee deducted from the contractor\'s payout.',
    },
    {
      key: 'client',
      label: 'Client pays',
      sub: 'Added to what the client is charged.',
    },
    {
      key: 'split',
      label: 'Split 50/50',
      sub: 'Half added to client charge, half deducted from payout.',
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
      <div className="flex items-center gap-2 text-zinc-300">
        <Percent className="w-4 h-4 text-violet-400" />
        <h4 className="font-semibold text-sm">Who pays Pact's {feePct}% transaction fee?</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map(opt => {
          const selected = feePayer === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              disabled={locked}
              onClick={() => handleChange('fee_payer', opt.key)}
              className={`text-left rounded-lg border p-3 transition-all ${
                selected
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
              } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <p className="text-sm font-medium text-white">{opt.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{opt.sub}</p>
            </button>
          );
        })}
      </div>

      {totalCents > 0 && (
        <div className="text-xs text-zinc-400 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <div className="rounded-md bg-zinc-900/50 px-3 py-2">
            <p className="text-zinc-500">Client pays</p>
            <p className="text-zinc-200 font-mono mt-0.5">{formatUSD(breakdown.chargeCents)}</p>
          </div>
          <div className="rounded-md bg-zinc-900/50 px-3 py-2">
            <p className="text-zinc-500">Fee to Pact</p>
            <p className="text-zinc-200 font-mono mt-0.5">{formatUSD(breakdown.feeCents)}</p>
          </div>
          <div className="rounded-md bg-zinc-900/50 px-3 py-2">
            <p className="text-zinc-500">Contractor receives</p>
            <p className="text-zinc-200 font-mono mt-0.5">{formatUSD(breakdown.transferCents)}</p>
          </div>
        </div>
      )}

      {locked && (
        <p className="text-xs text-zinc-500">Locked — fee terms can't change after the contract is sent.</p>
      )}
    </div>
  );
}
