import { motion } from "framer-motion";
import { Wallet, Coin, Card, Receipt21 } from "iconsax-reactjs";
import { useMyFinanceDashboard } from "../api/financeApi";
import PageLoader from "../../../components/PageLoader";

export const UserFinanceDashboard = () => {
  const { data: dashboard, isLoading, error } = useMyFinanceDashboard();

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !dashboard) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-base-content/50">
        <Receipt21 size={48} className="mb-4 opacity-20" />
        <p>Could not load financial data.</p>
        <p className="mt-2 text-xs text-red-500">{error ? String(error) : "Dashboard data is empty"}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-base-content/8 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-base-content sm:text-2xl">
            My Finances
          </h1>
          <p className="mt-0.5 text-xs text-base-content/50">
            Overview of your earnings and payments.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Total Income */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Earnings
            </span>
            <Wallet size={18} className="text-primary" />
          </div>
          <p className="mt-3 text-2xl font-black text-base-content">
            {dashboard.total_income.toLocaleString()} <span className="text-sm font-semibold text-base-content/50">IRR</span>
          </p>
        </div>

        {/* Total Paid */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Received Payments
            </span>
            <Card size={18} className="text-emerald-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-base-content">
            {dashboard.total_paid.toLocaleString()} <span className="text-sm font-semibold text-base-content/50">IRR</span>
          </p>
        </div>

        {/* Current Balance */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Current Balance (Owed)
            </span>
            <Coin size={18} className="text-amber-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-amber-500">
            {dashboard.current_balance.toLocaleString()} <span className="text-sm font-semibold text-amber-500/60">IRR</span>
          </p>
        </div>
      </div>

      {/* Projects List */}
      <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
        <h2 className="mb-4 text-sm font-bold text-base-content uppercase tracking-wider">
          Earnings by Project
        </h2>
        {dashboard.projects.length === 0 ? (
          <p className="py-8 text-center text-xs text-base-content/40">
            No project earnings found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-base-content/10 text-xs font-semibold text-base-content/50">
                <tr>
                  <th className="pb-3 pl-2">Project Name</th>
                  <th className="pb-3">Payment Type</th>
                  <th className="pb-3">Rate</th>
                  <th className="pb-3">Worked Hours</th>
                  <th className="pb-3 text-right">Earned</th>
                  <th className="pb-3 text-right">Paid</th>
                  <th className="pb-3 pr-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-content/5 text-base-content/80">
                {dashboard.projects.map((p: any) => (
                  <tr key={p.project_id} className="hover:bg-base-200/30 transition-colors">
                    <td className="py-3 pl-2 font-medium text-base-content">
                      {p.project_name}
                    </td>
                    <td className="py-3 capitalize">{p.payment_type}</td>
                    <td className="py-3">
                      {p.rate.toLocaleString()} IRR
                    </td>
                    <td className="py-3">
                      {p.total_worked_hours !== null ? `${p.total_worked_hours}h` : "-"}
                    </td>
                    <td className="py-3 text-right font-medium text-primary">
                      {p.total_earned.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-400">
                      {p.total_paid.toLocaleString()}
                    </td>
                    <td className="py-3 pr-2 text-right font-semibold text-amber-500">
                      {p.current_balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default UserFinanceDashboard;
