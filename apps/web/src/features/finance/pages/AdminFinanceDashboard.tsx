import { useState } from "react";
import { motion } from "framer-motion";
import {
  SearchNormal1,
  People,
  DollarCircle,
  TrendUp,
  Briefcase,
  DocumentText,
} from "iconsax-reactjs";
import { useAdminFinanceReports } from "../api/financeApi";
import PageLoader from "../../../components/PageLoader";
import { Pagination } from "../../../components/Pagination";
import type { AdminFinanceReport } from "../types/financeTypes";

const formatCurrency = (value: number, currency = "IRR") =>
  `${value.toLocaleString()} ${currency}`;

const getUserDisplayName = (r: AdminFinanceReport) => {
  const name = `${r.first_name} ${r.last_name}`.trim();
  return name || r.username;
};

const getInitial = (r: AdminFinanceReport) =>
  (r.first_name?.[0] || r.username?.[0] || "?").toUpperCase();

export const AdminFinanceDashboard = () => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
    setSearchTimer(t);
  };

  const { data, isLoading, error } = useAdminFinanceReports({
    page,
    page_size: pageSize,
    search: debouncedSearch,
  });

  const results = data?.results ?? [];

  // Aggregate totals from current page
  const totalIncome = results.reduce((s, r) => s + (r.total_income ?? 0), 0);
  const totalPaid = results.reduce((s, r) => s + (r.total_paid ?? 0), 0);
  const totalBalance = results.reduce((s, r) => s + (r.current_balance ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 border-b border-base-content/8 pb-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-base-content sm:text-2xl">
            Organization Finances
          </h1>
          <p className="mt-0.5 text-xs text-base-content/50">
            Payroll overview for all members in your organization.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base-content/40">
            <SearchNormal1 size={15} />
          </div>
          <input
            id="finance-search"
            type="text"
            className="block w-full rounded-xl border border-base-content/10 bg-base-100 py-2 pl-9 pr-3 text-sm text-base-content placeholder-base-content/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Search members..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* ── Aggregate Summary Cards ──────────────────────────────── */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
            <div className="flex items-center justify-between text-base-content/40">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Payroll</span>
              <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                <DollarCircle size={16} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-base-content">
              {formatCurrency(totalIncome)}
            </p>
            <p className="mt-1 text-[11px] text-base-content/40">
              {data.total_results} members
            </p>
          </div>

          <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
            <div className="flex items-center justify-between text-base-content/40">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Paid</span>
              <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
                <TrendUp size={16} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalPaid)}
            </p>
          </div>

          <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
            <div className="flex items-center justify-between text-base-content/40">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Owed</span>
              <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-500">
                <People size={16} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-amber-500">
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>
      )}

      {/* ── Members Table ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
        <div className="mb-5 flex items-center gap-2 border-b border-base-content/8 pb-4">
          <Briefcase size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-base-content uppercase tracking-wider">
            Member Finance Report
          </h2>
        </div>

        {isLoading ? (
          <div className="py-12">
            <PageLoader />
          </div>
        ) : error || !data ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-base-content/50">
            <DocumentText size={32} className="opacity-20" />
            <p className="text-sm">Could not load reports.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-12 text-center text-sm text-base-content/50">
            {debouncedSearch ? "No members match your search." : "No financial records found."}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-base-content/10 text-xs font-semibold text-base-content/50">
                  <tr>
                    <th className="pb-3 pl-2">Member</th>
                    <th className="pb-3 text-center">Projects</th>
                    <th className="pb-3 text-right">Total Income</th>
                    <th className="pb-3 text-right">Paid</th>
                    <th className="pb-3 pr-2 text-right">Balance Owed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-content/5">
                  {results.map((r: AdminFinanceReport) => (
                    <tr
                      key={r.user_id}
                      className="hover:bg-base-200/30 transition-colors"
                    >
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {getInitial(r)}
                          </div>
                          <div>
                            <p className="font-bold text-base-content leading-tight">
                              {getUserDisplayName(r)}
                            </p>
                            <p className="text-[10px] text-base-content/50">
                              @{r.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-base-200 px-2 py-1 text-xs font-semibold">
                          <Briefcase size={11} />
                          {r.active_projects}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-primary">
                        {formatCurrency(r.total_income, r.currency)}
                      </td>
                      <td className="py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatCurrency(r.total_paid, r.currency)}
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <span
                          className={`font-bold ${
                            r.current_balance > 0
                              ? "text-amber-500"
                              : "text-base-content/40"
                          }`}
                        >
                          {formatCurrency(r.current_balance, r.currency)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={data.total_pages}
                totalCount={data.total_results}
                pageSize={pageSize}
                onPageChange={(p: number) => setPage(p)}
                onPageSizeChange={() => {}}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminFinanceDashboard;
