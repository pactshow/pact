import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet, Download, Loader2, ShieldCheck, AlertCircle,
  ChevronLeft, ChevronRight, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useSubscriptionAccess } from '@/lib/useSubscriptionAccess';
import ProUpgradeScreen from '@/components/account/ProUpgradeScreen';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorCard } from '@/lib/QueryState';

export default function TaxReports() {
  const access = useSubscriptionAccess();

  if (access.isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }
  if (!access.isPro) {
    return <ProUpgradeScreen feature="tax_reports" />;
  }
  return <TaxReportsInner />;
}

function TaxReportsInner() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const reportQuery = useQuery({
    queryKey: ['tax-report', year],
    queryFn: () => base44.functions.invoke('getTaxReport', { year }),
  });
  const { data, isLoading, isError, isFetching } = reportQuery;

  const yearOptions = useMemo(() => {
    // Cover the next year (for late filings) and the past 6 calendar
    // years (IRS recommends keeping 7 years of records).
    const years = [];
    for (let y = currentYear + 1; y >= currentYear - 6; y--) years.push(y);
    return years;
  }, [currentYear]);

  const downloadCsv = () => {
    if (!data?.contractors?.length) return;
    const headers = [
      'Contractor name',
      'Email',
      'Stripe legal name',
      'Stripe business name',
      'Business type',
      'Tax info on file (Stripe)',
      'Total paid (gross)',
      'Total refunded',
      'Net paid',
      'Payment count',
      'Contract count',
      'Last paid date',
      'Over $600 threshold',
    ];
    const rows = data.contractors.map((c) => [
      csvCell(c.name),
      csvCell(c.email),
      csvCell(c.stripe_legal_name),
      csvCell(c.stripe_business_name),
      csvCell(c.stripe_business_type),
      c.tax_id_on_file ? 'Yes' : 'No',
      dollars(c.total_paid_cents),
      dollars(c.total_refunded_cents),
      dollars(c.net_paid_cents),
      String(c.payment_count),
      String(c.contract_count),
      c.last_paid_date ?? '',
      c.over_1099_threshold ? 'Yes' : 'No',
    ]);
    const body = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pact-tax-report-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = data?.totals;
  const contractors = data?.contractors ?? [];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Tax Reports</h1>
            <p className="mt-1 text-zinc-400">
              Everyone you paid through Pact, organized by contractor.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <YearSwitcher year={year} setYear={setYear} options={yearOptions} />
            <Button
              onClick={downloadCsv}
              disabled={!contractors.length}
              className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 mb-6 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-100">
            <p className="font-medium mb-1">How tax info works on Pact</p>
            <p className="text-blue-200/80">
              Stripe is the merchant of record for contractor payouts and collects tax info during onboarding.
              Stripe issues a 1099-K to contractors directly when they hit federal thresholds — Pact doesn't store SSNs or EINs.
              Use this report and the CSV export for your bookkeeping. If you need to issue a 1099-NEC yourself, ask the contractor for a W-9 directly.
            </p>
          </div>
        </div>

        {isLoading && <TaxReportSkeleton />}

        {isError && (
          <QueryErrorCard
            onRetry={() => reportQuery.refetch()}
            isRetrying={isFetching}
          />
        )}

        {!isLoading && !isError && totals && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <SummaryCard label="Total paid (gross)" value={dollarsLabel(totals.gross_cents)} />
              <SummaryCard label="Total refunded" value={dollarsLabel(totals.refunded_cents)} />
              <SummaryCard label="Net" value={dollarsLabel(totals.net_cents)} accent />
            </div>

            {contractors.length === 0 && (
              <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-12 text-center">
                <FileSpreadsheet className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-lg font-semibold mb-1">No payments in {year}</p>
                <p className="text-zinc-400 text-sm">
                  When you pay contractors through Pact, they'll show up here for tax time.
                </p>
              </div>
            )}

            {contractors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-900/70 text-zinc-400 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Contractor</th>
                        <th className="text-left px-4 py-3 font-medium">Tax info</th>
                        <th className="text-right px-4 py-3 font-medium">Net paid</th>
                        <th className="text-right px-4 py-3 font-medium">Payments</th>
                        <th className="text-right px-4 py-3 font-medium">Last paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {contractors.map((c) => (
                        <tr key={c.profile_id} className="hover:bg-zinc-900/40">
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">
                              {c.name || c.stripe_legal_name || '(no name)'}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {c.stripe_business_name && c.stripe_business_name !== c.name
                                ? `${c.stripe_business_name} · `
                                : ''}
                              {c.email || ''}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <TaxStatus
                              onFile={c.tax_id_on_file}
                              onboardingComplete={c.stripe_onboarding_complete}
                              offPlatform={c.off_platform}
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-white font-medium">
                              {dollarsLabel(c.net_paid_cents)}
                            </div>
                            {c.total_refunded_cents > 0 && (
                              <div className="text-xs text-zinc-500">
                                {dollarsLabel(c.total_paid_cents)} − {dollarsLabel(c.total_refunded_cents)} refunded
                              </div>
                            )}
                            {c.over_1099_threshold && (
                              <div className="text-xs text-amber-300 mt-0.5">
                                ≥ $600 (1099-NEC threshold)
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-300">
                            {c.payment_count} <span className="text-zinc-500">/ {c.contract_count} contract{c.contract_count === 1 ? '' : 's'}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-400">
                            {c.last_paid_date ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function YearSwitcher({ year, setYear, options }) {
  const idx = options.indexOf(year);
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setYear(options[Math.min(options.length - 1, idx + 1)])}
        disabled={idx >= options.length - 1}
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-9 w-9"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
          {options.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setYear(options[Math.max(0, idx - 1)])}
        disabled={idx <= 0}
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-9 w-9"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'bg-violet-500/10 border-violet-500/30' : 'bg-zinc-900/40 border-zinc-800'}`}>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accent ? 'text-violet-200' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

function TaxStatus({ onFile, onboardingComplete, offPlatform }) {
  if (offPlatform) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-1 rounded">
        <AlertCircle className="w-3 h-3" /> Off-platform — ask for W-9
      </span>
    );
  }
  if (onFile) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
        <ShieldCheck className="w-3 h-3" /> On file with Stripe
      </span>
    );
  }
  if (onboardingComplete) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
        <AlertCircle className="w-3 h-3" /> Onboarded — partial info
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-1 rounded">
      <AlertCircle className="w-3 h-3" /> Not onboarded
    </span>
  );
}

function dollars(cents) {
  return (Number(cents ?? 0) / 100).toFixed(2);
}

function dollarsLabel(cents) {
  return `$${(Number(cents ?? 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// CSV cell quoting — wrap in double quotes if value contains comma,
// quote, or newline; double-up internal quotes per RFC 4180.
function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function TaxReportSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5">
            <Skeleton className="h-3 w-32 bg-zinc-800 mb-3" />
            <Skeleton className="h-8 w-28 bg-zinc-800" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-900/70 px-4 py-3">
          <Skeleton className="h-3 w-32 bg-zinc-800" />
        </div>
        <div className="divide-y divide-zinc-800/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-44 bg-zinc-800" />
                <Skeleton className="h-3 w-32 bg-zinc-800" />
              </div>
              <Skeleton className="h-5 w-28 bg-zinc-800 rounded" />
              <Skeleton className="h-4 w-20 bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
