import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  DollarSign, FileText, CheckCircle2, AlertCircle,
  Search, ChevronDown, ChevronUp, ShieldCheck, Landmark, Users, User, Briefcase
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

const TAX_LABEL = {
  individual_sole_proprietor: "Individual / Sole Proprietor",
  c_corporation: "C Corporation",
  s_corporation: "S Corporation",
  partnership: "Partnership",
  trust_estate: "Trust / Estate",
  llc: "LLC",
  other: "Other",
};

export default function VenuePaymentRecords() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => base44.entities.Profile.list("-created_date"),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-paid_date"),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-performance_date"),
  });

  const filteredProfiles = profiles.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPaidFor = (profile) => {
    return contracts
      .filter((c) => c.contractor_profile_id === profile.id || c.contractor_name?.toLowerCase() === profile.name?.toLowerCase())
      .reduce((sum, c) => {
        const contractPayments = payments.filter(
          (p) => p.contract_id === c.id && p.status === "paid"
        );
        return sum + contractPayments.reduce((s, p) => s + (p.amount || 0), 0);
      }, 0);
  };

  const contractsFor = (profile) =>
    contracts.filter(
      (c) => c.contractor_profile_id === profile.id || c.contractor_name?.toLowerCase() === profile.name?.toLowerCase()
    );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Briefcase className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Payment Records</h1>
              <p className="text-zinc-400 mt-0.5">W-9s and ACH records for all paid contractors</p>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 rounded-xl"
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Profiles", value: profiles.length, icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "W-9s Collected", value: profiles.filter(a => a.w9_signed).length, icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10" },
            { label: "ACH On File", value: profiles.filter(a => a.ach_routing_number).length, icon: Landmark, color: "text-blue-400", bg: "bg-blue-500/10" },
            {
              label: "Total Paid Out",
              value: `$${payments.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}`,
              icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10"
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
              <div className={`inline-flex p-2 rounded-lg ${bg} mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Profile Records */}
        <div className="space-y-3">
          {filteredProfiles.length === 0 && (
            <div className="text-center py-16 text-zinc-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No profiles found.</p>
            </div>
          )}
          {filteredProfiles.map((profile) => {
            const total = totalPaidFor(profile);
            const profileContracts = contractsFor(profile);
            const isOpen = expanded === profile.id;
            const hasACH = !!profile.ach_routing_number;
            const hasW9 = profile.w9_signed;

            return (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden"
              >
                {/* Row Header */}
                <button
                  className="w-full flex items-center gap-4 p-5 hover:bg-zinc-800/40 transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? null : profile.id)}
                >
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 shrink-0">
                    <User className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{profile.name}</span>
                    </div>
                    <div className="text-sm text-zinc-500 mt-0.5">{profile.email}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-lg font-bold text-white">${total.toLocaleString()}</div>
                      <div className="text-xs text-zinc-500">{profileContracts.length} contract{profileContracts.length !== 1 ? "s" : ""}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge className={`text-xs ${hasW9 ? "bg-violet-500/20 text-violet-300 border-violet-500/30" : "bg-zinc-800 text-zinc-500 border-zinc-700"}`}>
                        {hasW9 ? <><CheckCircle2 className="w-3 h-3 mr-1" />W-9</> : <>W-9</>}
                      </Badge>
                      <Badge className={`text-xs ${hasACH ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-zinc-800 text-zinc-500 border-zinc-700"}`}>
                        {hasACH ? <><CheckCircle2 className="w-3 h-3 mr-1" />ACH</> : <>ACH</>}
                      </Badge>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isOpen && (
                  <div className="border-t border-zinc-800 px-5 pb-5 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* W9 Summary */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-semibold text-white">W-9 Information</span>
                        {hasW9 ? (
                          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs ml-auto">
                            <ShieldCheck className="w-3 h-3 mr-1" /> Certified
                          </Badge>
                        ) : (
                          <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-xs ml-auto">
                            <AlertCircle className="w-3 h-3 mr-1" /> Not on file
                          </Badge>
                        )}
                      </div>
                      {profile.w9_legal_name || profile.w9_ein || profile.w9_tax_classification ? (
                        <div className="space-y-1.5 text-sm">
                          {profile.w9_legal_name && <Row label="Legal Name" value={profile.w9_legal_name} />}
                          {profile.w9_business_name && <Row label="Business Name" value={profile.w9_business_name} />}
                          {profile.w9_tax_classification && <Row label="Tax Classification" value={TAX_LABEL[profile.w9_tax_classification] || profile.w9_tax_classification} />}
                          {profile.w9_address && <Row label="Address" value={`${profile.w9_address}${profile.w9_city_state_zip ? ", " + profile.w9_city_state_zip : ""}`} />}
                          {profile.w9_ssn && <Row label="SSN (last 4)" value={`•••-••-${profile.w9_ssn}`} />}
                          {profile.w9_ein && <Row label="EIN" value={profile.w9_ein} />}
                          {profile.w9_signed_date && <Row label="Certified" value={format(parseISO(profile.w9_signed_date), "MMM d, yyyy")} />}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-600 italic">No W-9 data on file. Edit profile to add.</p>
                      )}
                    </div>

                    {/* ACH Summary */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Landmark className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-white">ACH Banking</span>
                        {hasACH ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs ml-auto">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> On file
                          </Badge>
                        ) : (
                          <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-xs ml-auto">
                            <AlertCircle className="w-3 h-3 mr-1" /> Not on file
                          </Badge>
                        )}
                      </div>
                      {profile.ach_bank_name || profile.ach_routing_number ? (
                        <div className="space-y-1.5 text-sm">
                          {profile.ach_account_holder && <Row label="Account Holder" value={profile.ach_account_holder} />}
                          {profile.ach_bank_name && <Row label="Bank" value={profile.ach_bank_name} />}
                          {profile.ach_account_type && <Row label="Account Type" value={profile.ach_account_type.charAt(0).toUpperCase() + profile.ach_account_type.slice(1)} />}
                          {profile.ach_routing_number && <Row label="Routing" value={`•••••${profile.ach_routing_number.slice(-4)}`} />}
                          {profile.ach_account_number && <Row label="Account" value={`•••••${profile.ach_account_number.slice(-4)}`} />}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-600 italic">No ACH info on file. Edit profile to add.</p>
                      )}

                      {/* Payment History */}
                      {profileContracts.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-semibold text-white">Payment History</span>
                          </div>
                          <div className="space-y-1.5">
                            {profileContracts.map((c) => {
                              const paid = payments
                                .filter((p) => p.contract_id === c.id && p.status === "paid")
                                .reduce((s, p) => s + (p.amount || 0), 0);
                              return (
                                <div key={c.id} className="flex items-center justify-between text-sm">
                                  <span className="text-zinc-400 truncate max-w-[60%]">{c.title}</span>
                                  <span className="text-emerald-400 font-medium">${paid.toLocaleString()}</span>
                                </div>
                              );
                            })}
                            <div className="flex items-center justify-between text-sm font-semibold pt-1.5 border-t border-zinc-800">
                              <span className="text-white">Total Paid</span>
                              <span className="text-amber-400">${total.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className="text-zinc-200 text-right">{value}</span>
    </div>
  );
}
