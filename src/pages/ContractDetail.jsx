import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatTime } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BiometricSign from "@/components/signature/BiometricSign";
import DisputeSection from "@/components/contracts/DisputeSection";
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Mail,
  FileText,
  Briefcase,
  User,
  Loader2,
  Fingerprint,
  ShieldCheck,
  RefreshCw,
  Download,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { contractStatusLabel } from "@/lib/contractStatus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PaymentRow from "@/components/dashboard/PaymentRow";
import PaymentDialog from "@/components/payments/PaymentDialog";
import BankSetupFlow from "@/components/payments/BankSetupFlow";
import UploadedContractCard from "@/components/contracts/UploadedContractCard";
import ContractAISummary from "@/components/contracts/ContractAISummary";
import ContractDetailSkeleton from "@/components/contracts/ContractDetailSkeleton";
import { QueryErrorCard } from "@/lib/QueryState";
import { useMyProfile } from "@/lib/RoleContext";
import { useSubscriptionAccess } from "@/lib/useSubscriptionAccess";
import { feeBreakdown, formatUSD, feePayerLabel, PACT_FEE_BPS } from "@/lib/feeMath";

const statusStyles = {
  draft: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  sent: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  received: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  signed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  completed: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  cancelled: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  countered: "bg-orange-500/20 text-orange-300 border-orange-500/30"
};

export default function ContractDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [contractId, setContractId] = useState(null);
  const [signatureDialog, setSignatureDialog] = useState({ open: false, type: null });
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState({ open: false, payment: null });
  const [bankPromptOpen, setBankPromptOpen] = useState(false);
  const { myProfile } = useMyProfile();
  const { isGuest } = useSubscriptionAccess();

  // Guest artists must complete Stripe Connect before they can sign as
  // contractor — otherwise there's no payout destination when the
  // client pays them.
  const needsBankBeforeSign =
    isGuest
    && myProfile?.user_side === 'artist'
    && !myProfile?.stripe_onboarding_complete;

  const handlePay = (payment) => {
    setPaymentDialog({ open: true, payment });
  };

  const handlePaymentSuccess = () => {
    const paid = paymentDialog.payment;
    setPaymentDialog({ open: false, payment: null });
    // Optimistically flip the row to 'processing'. We defer the actual
    // refetch by ~2s because the webhook (which writes the real status to
    // the DB) typically arrives within 1–2 seconds of confirmPayment. If we
    // refetched immediately we'd race the webhook and snap the row back to
    // 'pending' until the user manually refreshes — bad UX, especially on
    // mobile where pull-to-refresh isn't obvious.
    if (paid) {
      queryClient.setQueriesData({ queryKey: ['payments'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map(p => p.id === paid.id ? { ...p, status: 'processing' } : p);
      });
    }
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    }, 2000);
  };

  const handleDownloadPDF = async () => {
    setGeneratingPDF(true);
    const res = await base44.functions.invoke('generateContractPDF', { contract_id: contractId });
    setGeneratingPDF(false);
    const dataUri = res.data?.pdf_url;
    if (dataUri) {
      // Convert data URI to blob and trigger download
      const byteStr = atob(dataUri.split(',')[1]);
      const bytes = new Uint8Array(byteStr.length);
      for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contract.title || 'contract'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setContractId(params.get('id'));

    // Refresh after returning from Stripe Checkout. Webhook fires almost
    // instantly but isn't strictly synchronous, so poll once after a brief
    // delay too.
    if (params.get('payment') === 'success') {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [queryClient]);

  const contractsQuery = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const paymentsQuery = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
  });

  const contracts = contractsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const contract = contracts.find(c => c.id === contractId);
  const contractPayments = payments.filter(p => p.contract_id === contractId);

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Contract.delete(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      navigate(createPageUrl("Contracts"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Contract.update(contractId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const handleBiometricSign = async (name, deviceInfo) => {
    const updateData = signatureDialog.type === 'contractor'
      ? {
          contractor_signature: name,
          contractor_signed_date: new Date().toISOString().split('T')[0],
          contractor_signed_device: deviceInfo
        }
      : {
          client_signature: name,
          client_signed_date: new Date().toISOString().split('T')[0],
          client_signed_device: deviceInfo
        };

    // Check if both will be signed after this
    const bothSigned = signatureDialog.type === 'contractor'
      ? contract.client_signature && name
      : contract.contractor_signature && name;
    
    if (bothSigned) {
      updateData.status = 'signed';
      // dispute_window_closes is computed by the
      // set_dispute_window_on_full_signature DB trigger when both
      // signatures land — frontend can't write it directly anymore
      // (enforce_contract_field_ownership rejects).
    }
    
    await updateMutation.mutateAsync(updateData);
    setSignatureDialog({ open: false, type: null });
    // No-op: PDF is generated on demand via the Download button
  };

  const handleCounterOffer = () => {
    // Mark original as countered, then open a new contract form pre-filled with original data
    updateMutation.mutateAsync({ status: 'countered' });
    const params = new URLSearchParams({
      counter_to: contractId,
      prefill_contractor: contract.contractor_name || '',
      prefill_contractor_email: contract.contractor_email || '',
      prefill_client: contract.client_name || '',
      prefill_client_email: contract.client_email || '',
      prefill_client_address: contract.client_address || '',
    });
    navigate(createPageUrl('ContractForm') + '?' + params.toString());
  };

  const handleFileDispute = async (userType, reason, sectionId) => {
    const updateData = userType === 'contractor'
      ? {
          contractor_disputed: true,
          contractor_dispute_reason: reason,
          contractor_dispute_section: sectionId || null,
          contractor_dispute_date: new Date().toISOString()
        }
      : {
          client_disputed: true,
          client_dispute_reason: reason,
          client_dispute_section: sectionId || null,
          client_dispute_date: new Date().toISOString()
        };

    await updateMutation.mutateAsync(updateData);
  };

  if (contractsQuery.isLoading) {
    return <ContractDetailSkeleton />;
  }

  if (contractsQuery.isError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to={createPageUrl("Contracts")}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Contracts
          </Link>
          <QueryErrorCard
            onRetry={() => contractsQuery.refetch()}
            isRetrying={contractsQuery.isFetching}
          />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
        <div className="text-center">
          <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Contract not found</h2>
          <p className="text-zinc-400 mb-6">
            This contract may have been deleted or you don't have access.
          </p>
          <Link to={createPageUrl("Contracts")}>
            <Button variant="outline" className="border-zinc-700 text-zinc-300">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Contracts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
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
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{contract.title}</h1>
                <Badge className={`${statusStyles[contract.status]} border text-sm`}>
                  {contractStatusLabel(contract.status)}
                </Badge>
              </div>
              <p className="text-zinc-400">
                Created {format(new Date(contract.created_date), "MMM d, yyyy")}
              </p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleDownloadPDF}
                disabled={generatingPDF}
                variant="outline"
                className="bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white gap-2 rounded-xl"
              >
                {generatingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {contract.pdf_url && !generatingPDF ? 'Download PDF' : generatingPDF ? 'Generating…' : 'Generate PDF'}
              </Button>

              <Link to={createPageUrl(`ContractForm?id=${contract.id}`)}>
                <Button variant="outline" className="bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white gap-2 rounded-xl">
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              </Link>

              {contract.status === 'received' && (
                <Button
                  onClick={handleCounterOffer}
                  className="bg-orange-600 hover:bg-orange-700 text-white gap-2 rounded-xl"
                >
                  <RefreshCw className="w-4 h-4" />
                  Counter Offer
                </Button>
              )}
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="bg-zinc-900 border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 gap-2 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Delete Contract?</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                      This will permanently delete this contract and cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Details */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-fuchsia-600/20 border border-violet-500/20 p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Performance Details</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/10">
                    <Calendar className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">{contract.performance_end_date ? "Dates" : "Date"}</p>
                    <p className="font-medium">
                      {contract.performance_date
                        ? contract.performance_end_date
                          ? `${format(parseISO(contract.performance_date), "EEE, MMM d")} → ${format(parseISO(contract.performance_end_date), "EEE, MMM d, yyyy")}`
                          : format(parseISO(contract.performance_date), "EEEE, MMMM d, yyyy")
                        : "TBD"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/10">
                    <Clock className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Show Time</p>
                    <p className="font-medium">{contract.performance_time ? formatTime(contract.performance_time) : "TBD"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/10">
                    <MapPin className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Load-in Time</p>
                    <p className="font-medium">{contract.load_in_time ? formatTime(contract.load_in_time) : "TBD"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/10">
                    <Clock className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Set Length</p>
                    <p className="font-medium">{contract.set_length || "TBD"}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Contractor */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6"
              >
                <div className="flex items-center gap-2 text-emerald-400 mb-4">
                  <User className="w-5 h-5" />
                  <h3 className="font-semibold">Contractor</h3>
                </div>
                <h4 className="text-xl font-bold text-white mb-2">{contract.contractor_name}</h4>
                {contract.contractor_email && (
                  <p className="text-sm text-zinc-400 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {contract.contractor_email}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-zinc-800">
                  {contract.contractor_signature ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Signed by {contract.contractor_signature}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <Fingerprint className="w-3 h-3" />
                        <span>Biometrically verified</span>
                      </div>
                      {contract.contractor_signed_device && (
                        <p className="text-xs text-zinc-600">{contract.contractor_signed_device}</p>
                      )}
                    </div>
                  ) : myProfile?.id === contract.contractor_profile_id ? (
                    <Dialog open={signatureDialog.open && signatureDialog.type === 'contractor'} onOpenChange={(open) => setSignatureDialog({ open, type: open ? 'contractor' : null })}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2"
                        onClick={() => {
                          if (needsBankBeforeSign) {
                            setBankPromptOpen(true);
                          } else {
                            setSignatureDialog({ open: true, type: 'contractor' });
                          }
                        }}
                      >
                        <Fingerprint className="w-4 h-4" />
                        Sign as Contractor
                      </Button>
                      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-white flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-violet-400" />
                            Contractor Signature
                          </DialogTitle>
                          <DialogDescription className="text-zinc-400">
                            Sign this contract using biometric authentication
                          </DialogDescription>
                        </DialogHeader>
                        <BiometricSign
                          onSign={handleBiometricSign}
                          onCancel={() => setSignatureDialog({ open: false, type: null })}
                          signerName={contract.contractor_name}
                          signerType="contractor"
                        />
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">Awaiting contractor signature</p>
                  )}
                </div>
              </motion.div>

              {/* Client */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6"
              >
                <div className="flex items-center gap-2 text-amber-400 mb-4">
                  <Briefcase className="w-5 h-5" />
                  <h3 className="font-semibold">Client</h3>
                </div>
                <h4 className="text-xl font-bold text-white mb-2">{contract.client_name}</h4>
                {contract.client_email && (
                  <p className="text-sm text-zinc-400 flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4" />
                    {contract.client_email}
                  </p>
                )}
                {contract.client_address && (
                  <p className="text-sm text-zinc-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {contract.client_address}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-zinc-800">
                  {contract.client_signature ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Signed by {contract.client_signature}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <Fingerprint className="w-3 h-3" />
                        <span>Biometrically verified</span>
                      </div>
                      {contract.client_signed_device && (
                        <p className="text-xs text-zinc-600">{contract.client_signed_device}</p>
                      )}
                    </div>
                  ) : myProfile?.id === contract.client_profile_id ? (
                    <Dialog open={signatureDialog.open && signatureDialog.type === 'client'} onOpenChange={(open) => setSignatureDialog({ open, type: open ? 'client' : null })}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2">
                          <Fingerprint className="w-4 h-4" />
                          Sign as Client
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-white flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-violet-400" />
                            Client Signature
                          </DialogTitle>
                          <DialogDescription className="text-zinc-400">
                            Sign this contract using biometric authentication
                          </DialogDescription>
                        </DialogHeader>
                        <BiometricSign
                          onSign={handleBiometricSign}
                          onCancel={() => setSignatureDialog({ open: false, type: null })}
                          signerName={contract.client_name}
                          signerType="client"
                        />
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">Awaiting client signature</p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Uploaded contract PDF */}
            {contract.source === 'uploaded' && (
              <UploadedContractCard contract={contract} />
            )}

            {/* Riders */}
            {contract.source !== 'uploaded' && (contract.technical_requirements || contract.hospitality_requirements || contract.additional_terms) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 space-y-6"
              >
                {contract.technical_requirements && (
                  <div>
                    <h3 className="font-semibold text-violet-400 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Technical Requirements
                    </h3>
                    <p className="text-zinc-300 whitespace-pre-wrap">{contract.technical_requirements}</p>
                  </div>
                )}
                
                {contract.hospitality_requirements && (
                  <div>
                    <h3 className="font-semibold text-violet-400 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Hospitality Requirements
                    </h3>
                    <p className="text-zinc-300 whitespace-pre-wrap">{contract.hospitality_requirements}</p>
                  </div>
                )}
                
                {contract.additional_terms && (
                  <div>
                    <h3 className="font-semibold text-violet-400 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Additional Terms
                    </h3>
                    <p className="text-zinc-300 whitespace-pre-wrap">{contract.additional_terms}</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Summary */}
            <ContractAISummary contract={contract} />

            {/* Payment Summary */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6"
            >
              <div className="flex items-center gap-2 text-amber-400 mb-4">
                <DollarSign className="w-5 h-5" />
                <h3 className="font-semibold">Payment Terms</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Total</span>
                  <span className="text-2xl font-bold text-white">${contract.total_amount?.toLocaleString()}</span>
                </div>
                
                {contract.deposit_amount > 0 && (
                  <>
                    <div className="h-px bg-zinc-800" />
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Deposit</span>
                      <span className="font-medium">${contract.deposit_amount?.toLocaleString()}</span>
                    </div>
                    {contract.deposit_due_date && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Pay by</span>
                        <span className="text-zinc-400">{format(parseISO(contract.deposit_due_date), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </>
                )}
                
                {contract.total_amount && contract.deposit_amount && (contract.total_amount - contract.deposit_amount) > 0 && (
                  <>
                    <div className="h-px bg-zinc-800" />
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Balance</span>
                      <span className="font-medium">${(contract.total_amount - contract.deposit_amount).toLocaleString()}</span>
                    </div>
                    {contract.balance_due_date && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Pay by</span>
                        <span className="text-zinc-400">{format(parseISO(contract.balance_due_date), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </>
                )}

                {contract.total_amount > 0 && (() => {
                  const totalCents = Math.round((contract.total_amount || 0) * 100);
                  const fp = contract.fee_payer || 'contractor';
                  const b = feeBreakdown(totalCents, fp);
                  const feePct = (PACT_FEE_BPS / 100).toFixed(0);
                  return (
                    <>
                      <div className="h-px bg-zinc-800" />
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-500">{feePct}% fee paid by</span>
                          <span className="text-zinc-300 font-medium">{feePayerLabel(fp)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-500">Client total to pay</span>
                          <span className="text-zinc-200 font-mono">{formatUSD(b.chargeCents)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-500">Contractor receives</span>
                          <span className="text-zinc-200 font-mono">{formatUSD(b.transferCents)}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </motion.div>

            {/* Related Payments */}
            {contractPayments.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6"
              >
                <h3 className="font-semibold mb-4">Payments</h3>
                <div className="divide-y divide-zinc-800/50">
                  {(() => {
                    const isClient = myProfile?.id === contract.client_profile_id;
                    const fullySigned = contract.contractor_signature && contract.client_signature;
                    const canPay = isClient && fullySigned;
                    // Sequential gating: a payment is locked if any earlier
                    // payment is not yet 'paid'. Order by payment type first
                    // (deposit → balance → bonus → other) so installment order
                    // is stable even when due_dates are missing, then by date.
                    const TYPE_ORDER = { full_payment: 0, deposit: 1, balance: 2, bonus: 3, other: 4 };
                    const ordered = [...contractPayments].sort((a, b) => {
                      const ta = TYPE_ORDER[a.type] ?? 99;
                      const tb = TYPE_ORDER[b.type] ?? 99;
                      if (ta !== tb) return ta - tb;
                      const ad = a.due_date || a.created_at || '';
                      const bd = b.due_date || b.created_at || '';
                      return ad.localeCompare(bd);
                    });
                    const lockedFromIdx = ordered.findIndex(p => p.status !== 'paid');
                    return ordered.map((payment, i) => {
                      const idx = ordered.findIndex(p => p.id === payment.id);
                      const isLocked = idx > lockedFromIdx && lockedFromIdx !== -1;
                      const reason = isLocked
                        ? 'Pay the earlier installment first'
                        : undefined;
                      return (
                        <PaymentRow
                          key={payment.id}
                          payment={payment}
                          index={i}
                          onPay={canPay ? handlePay : undefined}
                          payingId={payingId}
                          payDisabledReason={reason}
                        />
                      );
                    });
                  })()}
                </div>
              </motion.div>
            )}

            {/* Dispute Section - Show after both parties signed */}
            {contract.contractor_signature && contract.client_signature && contract.dispute_window_closes && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <DisputeSection
                  contract={contract}
                  onFileDispute={handleFileDispute}
                  userType={myProfile?.id === contract.client_profile_id ? "client" : "contractor"}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <PaymentDialog
        payment={paymentDialog.payment}
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog(d => ({ ...d, open }))}
        onSuccess={handlePaymentSuccess}
      />

      <BankSetupFlow
        profileId={myProfile?.id}
        open={bankPromptOpen}
        onOpenChange={setBankPromptOpen}
        title="Add a bank before signing"
        description="You need to verify your identity and link a bank account so the client can pay you when they sign this contract. Takes a few minutes — your signature is the next step after."
        dismissLabel="Not now"
      />
    </div>
  );
}