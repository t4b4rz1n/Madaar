import { motion } from "framer-motion";
import {
  DollarCircle,
  People,
  Clock,
  InfoCircle,
  ReceiptEdit,
} from "iconsax-reactjs";
import { useProjectBilling } from "../../finance/api/financeApi";
import PageLoader from "../../../components/PageLoader";
import type { ProjectBillingMember } from "../../finance/types/financeTypes";

interface ProjectBillingTabProps {
  projectId: string;
}

const formatCurrency = (value: number, currency = "IRR") =>
  `${value.toLocaleString()} ${currency}`;

const PaymentBadge = ({ type }: { type: string | null }) => {
  if (!type)
    return (
      <span className="text-[10px] text-base-content/30 italic">No salary set</span>
    );
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

const getInitial = (m: ProjectBillingMember) =>
  (m.first_name?.[0] || m.username?.[0] || "?").toUpperCase();

const getUserName = (m: ProjectBillingMember) => {
  const name = `${m.first_name} ${m.last_name}`.trim();
  return name || m.username;
};

export const ProjectBillingTab = ({ projectId }: ProjectBillingTabProps) => {
  const { data, isLoading, error } = useProjectBilling(projectId);

  if (isLoading) return <PageLoader />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-base-content/50">
        <ReceiptEdit size={40} className="opacity-20" />
        <p className="font-medium text-sm">Could not load billing data.</p>
        <p className="text-xs text-base-content/40">
          You may not have permission to view this project's billing details.
        </p>
      </div>
    );
  }

  const members = data.members;
  const totalCost = data.total_cost;
  const membersWithSalary = members.filter((m) => m.payment_type);
  const overrideCount = members.filter((m) => m.salary_override).length;
  const hourlyMembers = members.filter((m) => m.payment_type === "hourly");
  const totalHourlyRate = hourlyMembers.reduce((s, m) => s + m.rate, 0);

  return (
    <div className="space-y-6">
      {/* ── Overview Cards ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {/* Total Cost */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Project Cost
            </span>
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <DollarCircle size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-base-content">
            {formatCurrency(totalCost, data.currency)}
          </p>
          <p className="mt-1 text-[11px] text-base-content/40">
            This billing period
          </p>
        </div>

        {/* Member Count */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Members
            </span>
            <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-500">
              <People size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-base-content">
            {members.length}
          </p>
          <p className="mt-1 text-[11px] text-base-content/40">
            {membersWithSalary.length} with salary configured
          </p>
        </div>

        {/* Hourly Total Rate */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Hourly Rate
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
              <Clock size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalHourlyRate > 0 ? formatCurrency(totalHourlyRate, data.currency) : "—"}
          </p>
          <p className="mt-1 text-[11px] text-base-content/40">
            {hourlyMembers.length} hourly member{hourlyMembers.length !== 1 ? "s" : ""}
          </p>
        </div>
      </motion.div>

      {/* Override Notice */}
      {overrideCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs"
        >
          <InfoCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-amber-600 dark:text-amber-400">
            <span className="font-bold">{overrideCount}</span> member
            {overrideCount !== 1 ? "s have" : " has"} a project-specific salary
            override — their rates in this project differ from their org-level
            defaults.
          </p>
        </motion.div>
      )}

      {/* ── Members Breakdown Table ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-base-content/8 bg-base-100 p-5"
      >
        <div className="mb-5 flex items-center gap-2 border-b border-base-content/8 pb-4">
          <ReceiptEdit size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-base-content uppercase tracking-wider">
            Cost per Member
          </h2>
        </div>

        {members.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-base-content/40">
            <People size={36} className="opacity-20" />
            <p className="text-sm">No members in this project yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-base-content/10 text-xs font-semibold text-base-content/50">
                <tr>
                  <th className="pb-3 pl-2">Member</th>
                  <th className="pb-3">Specialty</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-right">Rate</th>
                  <th className="pb-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Clock size={11} />
                      Worked
                    </div>
                  </th>
                  <th className="pb-3 pr-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-content/5">
                {members.map((m: ProjectBillingMember, idx) => (
                  <motion.tr
                    key={m.user_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="hover:bg-base-200/30 transition-colors"
                  >
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {getInitial(m)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-base-content leading-tight text-sm">
                              {getUserName(m)}
                            </p>
                            {m.salary_override && (
                              <span className="rounded bg-amber-500/12 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                                Override
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-base-content/50">
                            @{m.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      {m.specialty ? (
                        <span className="rounded-md bg-base-200 px-2 py-0.5 text-xs font-medium">
                          {m.specialty}
                        </span>
                      ) : (
                        <span className="text-base-content/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <PaymentBadge type={m.payment_type} />
                    </td>
                    <td className="py-3 text-right font-medium">
                      {m.rate > 0 ? formatCurrency(m.rate, m.currency) : "—"}
                    </td>
                    <td className="py-3 text-right text-base-content/60">
                      {m.total_worked_hours !== null
                        ? `${m.total_worked_hours.toFixed(1)}h`
                        : "—"}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <span
                        className={`font-bold ${
                          m.total_cost > 0 ? "text-primary" : "text-base-content/30"
                        }`}
                      >
                        {m.total_cost > 0
                          ? formatCurrency(m.total_cost, m.currency)
                          : "—"}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
              {/* Total row */}
              <tfoot className="border-t-2 border-base-content/10">
                <tr className="text-sm font-bold text-base-content">
                  <td colSpan={5} className="pb-2 pl-2 pt-3 text-base-content/60 uppercase tracking-wider text-xs">
                    Total Cost
                  </td>
                  <td className="pb-2 pr-2 pt-3 text-right text-primary text-base">
                    {formatCurrency(totalCost, data.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProjectBillingTab;
