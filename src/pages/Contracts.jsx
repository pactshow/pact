import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  FileText,
} from "lucide-react";
import ContractCard from "@/components/dashboard/ContractCard";

export default function Contracts() {
  const [search, setSearch] = useState("");

  const initialStatus = () => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("status");
    if (s === "active") return "signed";
    if (s === "upcoming") return "signed";
    return s || "all";
  };
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list('-created_date'),
  });

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch =
      contract.title?.toLowerCase().includes(search.toLowerCase()) ||
      contract.contractor_name?.toLowerCase().includes(search.toLowerCase()) ||
      contract.client_name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Contracts</h1>
            <p className="mt-1 text-zinc-400">{contracts.length} total contracts</p>
          </div>
          <Link to={createPageUrl("ContractForm")}>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2 rounded-xl h-11 px-5">
              <Plus className="w-4 h-4" />
              New Contract
            </Button>
          </Link>
        </motion.div>

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
              placeholder="Search contracts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 rounded-xl"
            />
          </div>
          
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto overflow-x-auto">
            <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1 rounded-xl flex-nowrap">
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white whitespace-nowrap">
                All
              </TabsTrigger>
              <TabsTrigger value="draft" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white whitespace-nowrap">
                Draft
              </TabsTrigger>
              <TabsTrigger value="sent" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white whitespace-nowrap">
                Sent
              </TabsTrigger>
              <TabsTrigger value="received" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white whitespace-nowrap">
                Received
              </TabsTrigger>
              <TabsTrigger value="signed" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white whitespace-nowrap">
                Signed
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white whitespace-nowrap">
                Completed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Contract List */}
        {filteredContracts.length > 0 ? (
          <div className="space-y-3">
            {filteredContracts.map((contract, i) => (
              <ContractCard key={contract.id} contract={contract} index={i} />
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-12 text-center"
          >
            <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {search || statusFilter !== "all" ? "No contracts found" : "No contracts yet"}
            </h3>
            <p className="text-zinc-400 mb-4">
              {search || statusFilter !== "all" 
                ? "Try adjusting your search or filters"
                : "Create your first contract to get started"}
            </p>
            {!search && statusFilter === "all" && (
              <Link to={createPageUrl("ContractForm")}>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2 rounded-xl">
                  <Plus className="w-4 h-4" />
                  Create Contract
                </Button>
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}