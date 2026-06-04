import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Search,
  ArrowDownLeft,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import StatsCard from "@/components/dashboard/StatsCard";
import QueryState from "@/lib/QueryState";
import { StatsCardSkeleton } from "@/components/dashboard/DashboardSkeletons";
import PaymentListSkeleton from "@/components/payments/PaymentListSkeleton";

const statusStyles = {
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  overdue: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  disputed: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
};

const typeLabels = {
  deposit: "Deposit",
  balance: "Balance",
  full_payment: "Full Payment",
  bonus: "Bonus",
  other: "Other"
};

export default function Payments() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");


  const paymentsQuery = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
  });

  const contractsQuery = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const payments = paymentsQuery.data ?? [];
  const contracts = contractsQuery.data ?? [];
  const statsLoading = paymentsQuery.isLoading || contractsQuery.isLoading;

  const getContractTitle = (contractId) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract?.title || 'Unknown Contract';
  };

  const disputedContractIds = new Set(
    contracts.filter(c => c.contractor_disputed || c.client_disputed).map(c => c.id)
  );

  const disputedPayments = payments.filter(p => disputedContractIds.has(p.contract_id));
  const totalDisputed = disputedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const filteredPayments = payments.filter(payment => {
    const contractTitle = getContractTitle(payment.contract_id);
    const matchesSearch = 
      contractTitle.toLowerCase().includes(search.toLowerCase()) ||
      payment.payer_name?.toLowerCase().includes(search.toLowerCase()) ||
      payment.payee_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" 
      ? true 
      : statusFilter === "disputed"
        ? disputedContractIds.has(payment.contract_id)
        : payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Payments</h1>
          <p className="mt-1 text-zinc-400">Track and manage all your payments</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statsLoading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              <StatsCard
                title="Pending"
                value={`$${totalPending.toLocaleString()}`}
                subtitle={`${payments.filter(p => p.status === 'pending').length} payments`}
                icon={DollarSign}
                accentColor="gold"
              />
              <StatsCard
                title="Received"
                value={`$${totalPaid.toLocaleString()}`}
                subtitle={`${payments.filter(p => p.status === 'paid').length} payments`}
                icon={CheckCircle2}
                accentColor="emerald"
              />
              <StatsCard
                title="Disputed"
                value={`$${totalDisputed.toLocaleString()}`}
                subtitle={`${disputedPayments.length} on hold`}
                icon={Calendar}
                accentColor="rose"
              />
            </>
          )}
        </div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search payments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 rounded-xl"
            />
          </div>
          
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
            <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                All
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                Pending
              </TabsTrigger>
              <TabsTrigger value="paid" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                Paid
              </TabsTrigger>
              <TabsTrigger value="disputed" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                Disputed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Payments List */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
          <QueryState
            query={paymentsQuery}
            skeleton={<PaymentListSkeleton count={5} />}
            empty={
              <div className="text-center py-16">
                <DollarSign className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No payments yet</h3>
                <p className="text-zinc-400">
                  Payments will appear here when you create contracts
                </p>
              </div>
            }
          >
            {() => {
              if (filteredPayments.length === 0) {
                return (
                  <div className="text-center py-16">
                    <DollarSign className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No payments found</h3>
                    <p className="text-zinc-400">Try adjusting your search or filters</p>
                  </div>
                );
              }
              return (
                <div className="divide-y divide-zinc-800/50">
                  {filteredPayments.map((payment, i) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => navigate(`/ContractDetail?id=${payment.contract_id}`)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-500/10">
                          <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{getContractTitle(payment.contract_id)}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-zinc-400">
                            <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                              {typeLabels[payment.type]}
                            </Badge>
                            {payment.payer_name && <span>From {payment.payer_name}</span>}
                            {payment.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Due {format(parseISO(payment.due_date), "MMM d")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6">
                        <Badge className={`${statusStyles[payment.status]} border`}>
                          {payment.status}
                        </Badge>
                        <p className="text-xl font-bold text-emerald-400 min-w-[100px] text-right">
                          ${payment.amount?.toLocaleString()}
                        </p>
                        {payment.status === 'pending' && (
                          <span className="text-xs text-zinc-500 italic">Auto-processed via Stripe</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            }}
          </QueryState>
        </div>


      </div>
    </div>
  );
}