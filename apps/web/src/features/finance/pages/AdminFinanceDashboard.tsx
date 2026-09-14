import { useState } from "react";
import { motion } from "framer-motion";
import { SearchNormal1, DocumentText, DocumentFilter } from "iconsax-reactjs";
import { useAdminFinanceReports } from "../api/financeApi";
import PageLoader from "../../../components/PageLoader";
import { Pagination } from "../../../components/Pagination";

export const AdminFinanceDashboard = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    // Simple debounce approach without custom hook for brevity
    setTimeout(() => {
      setDebouncedSearch(e.target.value);
      setPage(1);
    }, 500);
  };

  const { data, isLoading, error } = useAdminFinanceReports({
    page,
    page_size: pageSize,
    search: debouncedSearch,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-base-content/8 pb-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-base-content sm:text-2xl">
            Organization Finances
          </h1>
          <p className="mt-0.5 text-xs text-base-content/50">
            Overview of all users' earnings and payments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base-content/40">
              <SearchNormal1 size={16} />
            </div>
            <input
              type="text"
              className="block w-full rounded-xl border border-base-content/10 bg-base-100 p-2 pl-9 text-sm text-base-content placeholder-base-content/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search users..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-base-content uppercase tracking-wider flex items-center gap-2">
            <DocumentFilter size={18} className="text-primary" />
            Users Financial Report
          </h2>
        </div>

        {isLoading ? (
          <div className="py-12">
            <PageLoader />
          </div>
        ) : error || !data ? (
          <div className="flex h-32 flex-col items-center justify-center text-base-content/50">
            <DocumentText size={32} className="mb-2 opacity-20" />
            <p className="text-sm">Could not load reports.</p>
          </div>
        ) : data.results.length === 0 ? (
          <div className="py-12 text-center text-sm text-base-content/50">
            No financial records found.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-base-content/10 bg-base-200/20 text-xs font-semibold text-base-content/50">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Active Projects</th>
                    <th className="p-3 text-right">Total Income</th>
                    <th className="p-3 text-right">Total Paid</th>
                    <th className="p-3 pr-4 text-right">Current Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-content/5 text-base-content/80">
                  {data.results.map((r: any) => (
                    <tr key={r.user_id} className="hover:bg-base-200/30 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-base-content">
                          {r.first_name || r.last_name
                            ? `${r.first_name} ${r.last_name}`
                            : r.username}
                        </div>
                        <div className="text-[10px] text-base-content/50">
                          @{r.username}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="rounded-md bg-base-200 px-2 py-1 text-xs font-semibold">
                          {r.active_projects}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-primary">
                        {r.total_income.toLocaleString()} IRR
                      </td>
                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">
                        {r.total_paid.toLocaleString()} IRR
                      </td>
                      <td className="p-3 pr-4 text-right font-semibold text-amber-500">
                        {r.current_balance.toLocaleString()} IRR
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
                onPageSizeChange={(s: number) => { setPageSize(s); setPage(1); }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminFinanceDashboard;
