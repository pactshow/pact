import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldAlert,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function computePerformanceStart(contract) {
  // Multi-day: dispute window references the last night so the artist has
  // played the full run before the window opens.
  const referenceDate = contract.performance_end_date || contract.performance_date;
  if (!referenceDate) return null;
  const [y, mo, d] = referenceDate.split('-').map(n => parseInt(n, 10));
  const raw = contract.performance_time || '';
  let h = 0, mi = 0;
  const m24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  const m12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m24) {
    h = parseInt(m24[1], 10);
    mi = parseInt(m24[2], 10);
  } else if (m12) {
    let hh = parseInt(m12[1], 10);
    mi = parseInt(m12[2], 10);
    const period = m12[3].toUpperCase();
    if (period === 'PM' && hh !== 12) hh += 12;
    if (period === 'AM' && hh === 12) hh = 0;
    h = hh;
  }
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

function diffParts(future, now) {
  const diff = future.getTime() - now.getTime();
  if (diff <= 0) return null;
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  };
}

export default function DisputeSection({ contract, onFileDispute, userType = "contractor" }) {
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSection, setDisputeSection] = useState("");
  const [tick, setTick] = useState(0);

  const contractSections = contract.contract_sections || [];

  // Re-render every minute so the countdown stays accurate.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const performanceStart = computePerformanceStart(contract);
  const closeTime = contract.dispute_window_closes
    ? parseISO(contract.dispute_window_closes)
    : null;

  const beforePerformance = performanceStart && now < performanceStart;
  const windowOpen = !beforePerformance && closeTime && now < closeTime;
  const windowClosed = closeTime && now >= closeTime;
  const timeUntilOpen = beforePerformance ? diffParts(performanceStart, now) : null;
  const timeRemaining = windowOpen ? diffParts(closeTime, now) : null;

  const handleFileDispute = async () => {
    if (!disputeReason.trim()) return;
    if (contractSections.length > 0 && !disputeSection) return;

    await onFileDispute(userType, disputeReason, disputeSection);
    setDisputeDialogOpen(false);
    setDisputeReason("");
    setDisputeSection("");
  };

  const disputeWindowOpen = windowOpen;
  const disputeWindowClosed = windowClosed;
  
  // Check if user has already disputed
  const userDisputed = userType === "contractor" ? contract.contractor_disputed : contract.client_disputed;
  const otherPartyDisputed = userType === "contractor" ? contract.client_disputed : contract.contractor_disputed;

  const anyDisputes = contract.contractor_disputed || contract.client_disputed;

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${anyDisputes ? 'bg-red-500/20' : 'bg-violet-500/20'}`}>
            {anyDisputes ? (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            ) : contract.ach_transfer_triggered ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Clock className="w-5 h-5 text-violet-400" />
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold">Payment Dispute Window</h3>
            <p className="text-sm text-zinc-400">
              {contract.ach_transfer_triggered
                ? "ACH transfer completed"
                : disputeWindowClosed
                ? "Dispute window closed"
                : beforePerformance
                ? `Opens at performance start${performanceStart ? ` (${format(performanceStart, "MMM d, h:mm a")})` : ''}`
                : "24-hour dispute period"}
            </p>
          </div>
        </div>

        {beforePerformance && timeUntilOpen && (
          <Badge variant="outline" className="border-zinc-600 text-zinc-400 gap-1.5">
            <Clock className="w-3 h-3" />
            opens in {timeUntilOpen.hours}h {timeUntilOpen.minutes}m
          </Badge>
        )}

        {disputeWindowOpen && timeRemaining && (
          <Badge variant="outline" className="border-violet-500/30 text-violet-400 gap-1.5">
            <Clock className="w-3 h-3" />
            {timeRemaining.hours}h {timeRemaining.minutes}m remaining
          </Badge>
        )}
      </div>

      {/* ACH Transfer Status */}
      {contract.ach_transfer_triggered && (
        <Alert className="bg-emerald-500/10 border-emerald-500/30">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          <AlertDescription className="text-emerald-300">
            <span className="font-medium">ACH transfer initiated</span> on{" "}
            {format(parseISO(contract.ach_transfer_date), "MMM d, yyyy 'at' h:mm a")}
          </AlertDescription>
        </Alert>
      )}

      {/* Window Closed - No Disputes */}
      {disputeWindowClosed && !anyDisputes && !contract.ach_transfer_triggered && (
        <Alert className="bg-emerald-500/10 border-emerald-500/30">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <AlertDescription className="text-emerald-300">
            No disputes filed. ACH transfer will be processed automatically.
          </AlertDescription>
        </Alert>
      )}

      {/* Active Disputes Display */}
      {anyDisputes && (
        <div className="space-y-3">
          <Alert className="bg-red-500/10 border-red-500/30">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              <span className="font-medium">Active Dispute:</span> Payment is on hold pending resolution
            </AlertDescription>
          </Alert>

          {/* Contractor Dispute */}
          {contract.contractor_disputed && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-white">Contractor Dispute</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {format(parseISO(contract.contractor_dispute_date), "MMM d, h:mm a")}
                </span>
              </div>
              {contract.contractor_dispute_section && (
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">
                    Citing: {contractSections.find(s => s.id === contract.contractor_dispute_section)?.title || contract.contractor_dispute_section}
                  </span>
                </div>
              )}
              <p className="text-sm text-zinc-300 leading-relaxed">
                {contract.contractor_dispute_reason}
              </p>
            </div>
          )}

          {/* Client Dispute */}
          {contract.client_disputed && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-white">Client Dispute</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {format(parseISO(contract.client_dispute_date), "MMM d, h:mm a")}
                </span>
              </div>
              {contract.client_dispute_section && (
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">
                    Citing: {contractSections.find(s => s.id === contract.client_dispute_section)?.title || contract.client_dispute_section}
                  </span>
                </div>
              )}
              <p className="text-sm text-zinc-300 leading-relaxed">
                {contract.client_dispute_reason}
              </p>
            </div>
          )}
        </div>
      )}

      {/* File Dispute Button */}
      {disputeWindowOpen && !userDisputed && (
        <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              File a Dispute
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                File Payment Dispute
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Provide detailed justification for disputing this payment. Both parties will see this.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <AlertDescription className="text-amber-300 text-sm">
                  Filing a dispute will hold the ACH transfer until the issue is resolved.
                </AlertDescription>
              </Alert>

              {contractSections.length > 0 && (
                <div>
                  <label className="text-sm text-zinc-300 mb-2 block flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Breached Contract Section <span className="text-red-400">*</span>
                  </label>
                  <Select value={disputeSection} onValueChange={setDisputeSection}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select the section that was breached..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {contractSections.map((section, idx) => (
                        <SelectItem key={section.id} value={section.id}>
                          §{idx + 1} — {section.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm text-zinc-300 mb-2 block">
                  Dispute Explanation <span className="text-red-400">*</span>
                </label>
                <Textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain how the other party breached this section..."
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-32"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDisputeDialogOpen(false)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFileDispute}
                disabled={!disputeReason.trim() || (contractSections.length > 0 && !disputeSection)}
                className="bg-red-600 hover:bg-red-700"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                File Dispute
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {userDisputed && (
        <Alert className="bg-zinc-800/50 border-zinc-700">
          <CheckCircle2 className="h-4 w-4 text-zinc-400" />
          <AlertDescription className="text-zinc-400">
            You have filed a dispute for this contract.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}