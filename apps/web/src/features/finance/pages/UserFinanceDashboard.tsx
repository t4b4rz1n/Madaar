import { motion } from "framer-motion";
import {
  Wallet,
  Coin,
  Card,
  Receipt21,
  Clock,
  DollarCircle,
  TrendUp,
} from "iconsax-reactjs";
import { useMyFinanceDashboard } from "../api/financeApi";
import PageLoader from "../../../components/PageLoader";
import type { ProjectEarnings } from "../types/financeTypes";

const formatCurrency = (value: number, currency = "IRR") => {
  return `${value.toLocaleString()} ${currency}`;
};

const PaymentTypeBadge = ({ type }: { type: string | null }) => {
  if (!type) return <span className="text-base-content/30 text-xs">—</span>;
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        type === "hourly"
          ? "bg-blue-500/12 text-blue-600 dark:text-blue-400"
          : "bg-violet-500/12 text-violet-600 dark:text-violet-400"
      }`}
    >
      {type === "hourly" ? "Hourly" : "Monthly"}
    </span>
  );
};

export const UserFinanceDashboard = () => {
  const { data: dashboard, isLoading, error } = useMyFinanceDashboard();

  if (isLoading) return <PageLoader />;

  if (error || !dashboard) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-base-content/50">
        <Receipt21 size={48} className="opacity-20" />
        <p className="font-medium">Could not load financial data.</p>
        {error && (
          <p className="text-xs text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg">
            {String(error)}
          </p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 border-b border-base-content/8 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-base-content sm:text-2xl">
            My Finances
          </h1>
          <p className="mt-0.5 text-xs text-base-content/50">
            Overview of your earnings across all projects.
          </p>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Earnings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-base-content/8 bg-base-100 p-5"
        >
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Earnings
            </span>
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <Wallet size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-base-content">
            {formatCurrency(dashboard.total_income, dashboard.currency)}
          </p>
          <p className="mt-1 text-[11px] text-base-content/40">
            Across {dashboard.projects.length} project{dashboard.projects.length !== 1 ? "s" : ""}
          </p>
        </motion.div>

        {/* Received Payments */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-base-content/8 bg-base-100 p-5"
        >
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Received Payments
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
              <Card size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(dashboard.total_paid, dashboard.currency)}
          </p>
          <p className="mt-1 text-[11px] text-base-content/40">
            Total paid so far
          </p>
        </motion.div>

        {/* Current Balance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-base-content/8 bg-base-100 p-5"
        >
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Balance (Owed)
            </span>
            <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-500">
              <Coin size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-500">
            {formatCurrency(dashboard.current_balance, dashboard.currency)}
          </p>
          <p className="mt-1 text-[11px] text-base-content/40">
            Pending payment
          </p>
        </motion.div>
      </div>

      {/* ── Earnings by Project ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-base-content/8 bg-base-100 p-5"
      >
        <div className="mb-5 flex items-center gap-2 border-b border-base-content/8 pb-4">
          <TrendUp size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-base-content uppercase tracking-wider">
            Earnings by Project
          </h2>
        </div>

        {dashboard.projects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-base-content/40">
            <DollarCircle size={36} className="opacity-20" />
            <p className="text-sm">No project earnings found.</p>
            <p className="text-xs">
              Ask your manager to set your salary in each project.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-base-content/10 text-xs font-semibold text-base-content/50">
                <tr>
                  <th className="pb-3 pl-2">Project</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Rate</th>
                  <th className="pb-3">
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      Hours
                    </div>
                  </th>
                  <th className="pb-3 text-right">Earned</th>
                  <th className="pb-3 text-right">Paid</th>
                  <th className="pb-3 pr-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-content/5 text-base-content/80">
                {dashboard.projects.map((p: ProjectEarnings) => (
                  <tr
                    key={p.project_id}
                    className="hover:bg-base-200/30 transition-colors"
                  >
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-primary/60" />
                        <span className="font-medium text-base-content">
                          {p.project_name}
                        </span>
                        {p.salary_override && (
                          <span className="rounded bg-amber-500/12 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                            Override
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <PaymentTypeBadge type={p.payment_type} />
                    </td>
                    <td className="py-3 font-medium">
                      {p.rate > 0 ? formatCurrency(p.rate) : "—"}
                    </td>
                    <td className="py-3">
                      {p.total_worked_hours !== null
                        ? `${p.total_worked_hours.toFixed(1)}h`
                        : "—"}
                    </td>
                    <td className="py-3 text-right font-semibold text-primary">
                      {formatCurrency(p.total_earned)}
                    </td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.total_paid)}
                    </td>
                    <td className="py-3 pr-2 text-right font-bold text-amber-500">
                      {formatCurrency(p.current_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-base-content/10">
                <tr className="text-xs font-bold text-base-content/60">
                  <td colSpan={4} className="pb-2 pl-2 pt-3">
                    Total
                  </td>
                  <td className="pb-2 pt-3 text-right text-primary">
                    {formatCurrency(dashboard.total_income, dashboard.currency)}
                  </td>
                  <td className="pb-2 pt-3 text-right text-emerald-600">
                    {formatCurrency(dashboard.total_paid, dashboard.currency)}
                  </td>
                  <td className="pb-2 pr-2 pt-3 text-right text-amber-500">
                    {formatCurrency(dashboard.current_balance, dashboard.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default UserFinanceDashboard;
