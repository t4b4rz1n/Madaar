import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Coin,
  Card,
  Receipt21,
  Clock,
  DollarCircle,
  FolderOpen,
  Briefcase,
  Moneys,
} from "iconsax-reactjs";
import { useMyFinanceDashboard } from "../api/financeApi";
import PageLoader from "../../../components/PageLoader";

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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (isLoading) return <PageLoader />;

  if (error || !dashboard) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-base-content/50">
        <Receipt21 size={48} className="opacity-20" />
        <p className="font-medium">Could not load financial data.</p>
        {error && (
          <p className="text-xs text-error bg-error/10 px-3 py-1.5 rounded-lg">
            {String(error)}
          </p>
        )}
      </div>
    );
  }

  // Set initial selected project if none selected
  const activeProjectId = selectedProjectId || (dashboard.projects.length > 0 ? dashboard.projects[0].project_id : null);
  const selectedProject = dashboard.projects.find((p) => p.project_id === activeProjectId);

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
            Overview of your earnings and payments.
          </p>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="madaar-surface relative overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/90 p-5 shadow-madaar-card"
        >
          <div className="absolute -right-4 -top-4 rounded-full bg-primary/5 p-8 blur-2xl" />
          <div className="relative">
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
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="madaar-surface relative overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/90 p-5 shadow-madaar-card"
        >
           <div className="absolute -right-4 -top-4 rounded-full bg-emerald-500/5 p-8 blur-2xl" />
          <div className="relative">
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
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="madaar-surface relative overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/90 p-5 shadow-madaar-card"
        >
          <div className="absolute -right-4 -top-4 rounded-full bg-amber-500/5 p-8 blur-2xl" />
          <div className="relative">
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
          </div>
        </motion.div>
      </div>

      {/* ── Project Selection & Details ──────────────────────────── */}
      {dashboard.projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-base-content/40">
          <DollarCircle size={36} className="opacity-20" />
          <p className="text-sm">No project earnings found.</p>
          <p className="text-xs">
            Ask your manager to set your salary in each project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr] xl:grid-cols-[350px_1fr]">
          {/* Projects List sidebar */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-2 px-1 text-base-content/60">
              <FolderOpen size={18} />
              <h3 className="text-sm font-semibold tracking-wide">Your Projects</h3>
            </div>
            
            <div className="flex flex-row overflow-x-auto pb-2 space-x-3 lg:flex-col lg:space-x-0 lg:space-y-3 lg:pb-0 scrollbar-thin scrollbar-thumb-base-300">
              {dashboard.projects.map((project) => (
                <button
                  key={project.project_id}
                  onClick={() => setSelectedProjectId(project.project_id)}
                  className={`flex shrink-0 w-64 lg:w-full items-center justify-between rounded-2xl p-4 transition-all duration-200 border ${
                    activeProjectId === project.project_id
                      ? "border-primary/30 bg-primary/5 shadow-sm"
                      : "border-base-content/10 bg-base-100 hover:border-primary/30 hover:bg-base-200/50 hover:shadow-madaar-raised"
                  }`}
                >
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="w-full truncate text-left text-sm font-semibold text-base-content">
                      {project.project_name}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <PaymentTypeBadge type={project.payment_type} />
                      {project.salary_override && (
                        <span className="rounded bg-amber-500/12 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                          Override
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Project Details */}
          <div className="min-w-0">
             <AnimatePresence mode="wait">
               {selectedProject ? (
                 <motion.div
                   key={selectedProject.project_id}
                   initial={{ opacity: 0, x: 10 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -10 }}
                   transition={{ duration: 0.2 }}
                   className="madaar-surface relative overflow-hidden rounded-[24px] border border-base-content/10 bg-base-100/90 shadow-madaar-card"
                 >
                    {/* Decorative Header Background */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 to-transparent" />
                    
                    <div className="relative p-6 sm:p-8">
                      <div className="flex items-center gap-3">
                        <div className="grid size-12 place-items-center rounded-xl bg-primary/20 text-primary">
                          <Briefcase size={24} variant="Bulk" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-base-content">
                            {selectedProject.project_name}
                          </h2>
                          <div className="mt-1 flex items-center gap-2 text-sm text-base-content/60">
                             Earnings Details
                          </div>
                        </div>
                      </div>

                      {/* Main Rate Card */}
                      <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
                              Your Salary Rate
                            </span>
                            <div className="mt-2 flex items-baseline gap-2 text-3xl font-black text-primary">
                              {selectedProject.rate > 0 ? formatCurrency(selectedProject.rate, selectedProject.currency) : "—"}
                              {selectedProject.rate > 0 && (
                                <span className="text-sm font-medium text-primary/70">
                                  / {selectedProject.payment_type === "hourly" ? "hr" : "mo"}
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedProject.salary_override && (
                            <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 sm:mt-0">
                              <Moneys size={14} />
                              Specific rate for this project
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                         <div className="rounded-xl border border-base-content/5 bg-base-200/50 p-4">
                            <div className="flex items-center gap-2 text-base-content/40">
                              <Clock size={16} />
                              <span className="text-xs font-semibold">Hours Logged</span>
                            </div>
                            <p className="mt-2 text-lg font-bold">
                              {selectedProject.total_worked_hours !== null
                                ? `${selectedProject.total_worked_hours.toFixed(1)}h`
                                : "—"}
                            </p>
                         </div>
                         <div className="rounded-xl border border-base-content/5 bg-base-200/50 p-4">
                            <div className="flex items-center gap-2 text-primary/60">
                              <Wallet size={16} />
                              <span className="text-xs font-semibold">Earned</span>
                            </div>
                            <p className="mt-2 text-lg font-bold text-primary">
                              {formatCurrency(selectedProject.total_earned, selectedProject.currency)}
                            </p>
                         </div>
                         <div className="rounded-xl border border-base-content/5 bg-base-200/50 p-4">
                            <div className="flex items-center gap-2 text-emerald-500/70">
                              <Card size={16} />
                              <span className="text-xs font-semibold">Paid</span>
                            </div>
                            <p className="mt-2 text-lg font-bold text-emerald-600">
                              {formatCurrency(selectedProject.total_paid, selectedProject.currency)}
                            </p>
                         </div>
                         <div className="rounded-xl border border-base-content/5 bg-base-200/50 p-4">
                            <div className="flex items-center gap-2 text-amber-500/70">
                              <Coin size={16} />
                              <span className="text-xs font-semibold">Balance</span>
                            </div>
                            <p className="mt-2 text-lg font-bold text-amber-500">
                              {formatCurrency(selectedProject.current_balance, selectedProject.currency)}
                            </p>
                         </div>
                      </div>
                    </div>
                 </motion.div>
               ) : (
                 <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-base-content/10 bg-base-100/50 text-base-content/40">
                    <FolderOpen size={48} className="mb-4 opacity-20" />
                    <p>Select a project to view details</p>
                 </div>
               )}
             </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default UserFinanceDashboard;
