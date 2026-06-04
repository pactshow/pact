import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText,
  DollarSign,
  Calendar,
  Plus,
  ArrowRight,
  LayoutDashboard
} from "lucide-react";

import StatsCard from "@/components/dashboard/StatsCard";
import ContractCard from "@/components/dashboard/ContractCard";
import PaymentRow from "@/components/dashboard/PaymentRow";
import UpcomingGig from "@/components/dashboard/UpcomingGig";
import CalendarView from "@/components/dashboard/CalendarView";
import QueryState from "@/lib/QueryState";
import { ContractCardSkeletonList } from "@/components/dashboard/ContractCardSkeleton";
import {
  StatsCardSkeleton,
  UpcomingGigSkeletonList,
  PaymentRowSkeletonList,
} from "@/components/dashboard/DashboardSkeletons";

export default function Dashboard() {
  const contractsQuery = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list('-created_date', 50),
  });

  const paymentsQuery = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date', 20),
  });

  const contracts = contractsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  const activeContracts = contracts.filter(c => c.status === 'signed' || c.status === 'sent');

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalReceived = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const statsLoading = contractsQuery.isLoading || paymentsQuery.isLoading;

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
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-zinc-400">Manage your contracts and payments</p>
          </div>
          <Link to={createPageUrl("ContractForm")}>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2 rounded-xl h-11 px-5">
              <Plus className="w-4 h-4" />
              New Contract
            </Button>
          </Link>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl mb-8 w-full sm:w-auto">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-400 gap-1.5">
              <LayoutDashboard className="w-4 h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-400 gap-1.5">
              <Calendar className="w-4 h-4" /> Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <CalendarView contracts={contracts} />
          </TabsContent>

          <TabsContent value="overview">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {statsLoading ? (
                <>
                  <StatsCardSkeleton />
                  <StatsCardSkeleton />
                </>
              ) : (
                <>
                  <Link to={`${createPageUrl("Contracts")}?status=active`} className="block">
                    <StatsCard
                      title="Contracts"
                      value={activeContracts.length}
                      subtitle={`${contracts.length} total`}
                      icon={FileText}
                      accentColor="purple"
                    />
                  </Link>
                  <Link to={createPageUrl("Payments")} className="block">
                    <StatsCard
                      title="Payments"
                      value={`$${totalPending.toLocaleString()}`}
                      subtitle={`$${totalReceived.toLocaleString()} received`}
                      icon={DollarSign}
                      accentColor="emerald"
                    />
                  </Link>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upcoming Gigs */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Upcoming Gigs</h2>
                  <Link
                    to={createPageUrl("Contracts")}
                    className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <QueryState
                  query={contractsQuery}
                  skeleton={<UpcomingGigSkeletonList count={2} />}
                  empty={
                    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-8 text-center">
                      <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-400">No upcoming gigs</p>
                      <Link to={createPageUrl("ContractForm")}>
                        <Button variant="link" className="text-violet-400 mt-2">
                          Create a contract
                        </Button>
                      </Link>
                    </div>
                  }
                >
                  {(allContracts) => {
                    const upcomingGigs = allContracts
                      .filter(c => c.performance_date && parseISO(c.performance_date) >= new Date() && c.status !== 'cancelled')
                      .sort((a, b) => parseISO(a.performance_date) - parseISO(b.performance_date))
                      .slice(0, 3);
                    if (upcomingGigs.length === 0) {
                      return (
                        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-8 text-center">
                          <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                          <p className="text-zinc-400">No upcoming gigs</p>
                          <Link to={createPageUrl("ContractForm")}>
                            <Button variant="link" className="text-violet-400 mt-2">
                              Create a contract
                            </Button>
                          </Link>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-4">
                        {upcomingGigs.map((contract, i) => (
                          <UpcomingGig key={contract.id} contract={contract} index={i} />
                        ))}
                      </div>
                    );
                  }}
                </QueryState>
              </div>

              {/* Recent Contracts */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Recent Contracts</h2>
                  <Link
                    to={createPageUrl("Contracts")}
                    className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <QueryState
                  query={contractsQuery}
                  skeleton={<ContractCardSkeletonList count={3} />}
                  empty={
                    <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-12 text-center">
                      <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No contracts yet</h3>
                      <p className="text-zinc-400 mb-4">Create your first contract to get started</p>
                      <Link to={createPageUrl("ContractForm")}>
                        <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2 rounded-xl">
                          <Plus className="w-4 h-4" />
                          Create Contract
                        </Button>
                      </Link>
                    </div>
                  }
                >
                  {(allContracts) => (
                    <div className="space-y-3">
                      {allContracts.slice(0, 5).map((contract, i) => (
                        <ContractCard key={contract.id} contract={contract} index={i} />
                      ))}
                    </div>
                  )}
                </QueryState>
              </div>
            </div>

            {/* Recent Payments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent Payments</h2>
                <Link
                  to={createPageUrl("Payments")}
                  className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6">
                <QueryState
                  query={paymentsQuery}
                  skeleton={<PaymentRowSkeletonList count={4} />}
                  empty={
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-400">No payments recorded yet</p>
                    </div>
                  }
                >
                  {(allPayments) => (
                    <div className="divide-y divide-zinc-800/50">
                      {allPayments.slice(0, 5).map((payment, i) => (
                        <PaymentRow key={payment.id} payment={payment} index={i} />
                      ))}
                    </div>
                  )}
                </QueryState>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
