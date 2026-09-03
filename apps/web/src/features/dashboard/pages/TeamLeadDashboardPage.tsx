/**
 * TeamLeadDashboardPage.tsx
 * -------------------------
 * Independent dashboard for Team Lead role.
 *
 * Data: GET /api/v1/reports/manager/dashboard/
 *   → team_id is not passed; backend finds the user's lead teams.
 *   → error 403: appropriate error state is shown.
 *
 * Design: Same design language (madaar-surface, DaisyUI tokens,
 *   iconsax-reactjs, Framer Motion) — no new components.
 *
 * ⚠️ Technical debt (recorded):
 *   - Texts are hardcoded (i18n is not implemented).
 *   - Inline components should be moved to /src/components/ui in the future.
 *
 */

import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Building,
  Calendar,
  Chart21,
  Clock,
  Danger,
  People,
  Refresh2,
  TaskSquare,
  Timer1,
  TickCircle,
  CloseCircle,
} from "iconsax-reactjs";
import { useMemo } from "react";
import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getManagerDashboard } from "../api/dashboardApi";
import type {
  ManagerDashboard,
  ManagerProjectSummary,
  ManagerAttendance,
} from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const formatHours = (seconds: number | null | undefined) => {
  const value = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
};

const formatTime = (isoString: string | null | undefined) => {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: getTimezone(),
  }).format(new Date(isoString));
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("fa-IR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

const getInitials = (
  firstName?: string,
  lastName?: string,
  fallback = "؟"
) =>
  `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || fallback;

/**
 * Color mapping for project.status — from backend real values (Project.Status)
 * "draft" | "active" | "on_hold" | "completed" | "archived"
 */
const getProjectStatusStyle = (
  status: string
): { label: string; tone: "success" | "warning" | "error" | "neutral" } => {
  switch (status) {
    case "active":
      return { label: "Active", tone: "success" };
    case "completed":
      return { label: "Completed", tone: "success" };
    case "on_hold":
      return { label: "On Hold", tone: "warning" };
    case "draft":
      return { label: "Draft", tone: "neutral" };
    case "archived":
      return { label: "Archived", tone: "neutral" };
    default:
      return { label: status, tone: "neutral" };
  }
};

const getProjectProgress = (project: ManagerProjectSummary) =>
  project.total_tasks > 0
    ? Math.round((project.done_tasks / project.total_tasks) * 100)
    : 0;

// ─── Design constants ─────────────────────────────────────────────────────────

const panelClass = "madaar-surface overflow-hidden";
const spring = { type: "spring" as const, stiffness: 360, damping: 32, bounce: 0 };

// ─── Sub-components (inline — Technical debt: should be moved to /components/ui) ──

const MetricCard = ({
  label,
  value,
  description,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  description: string;
  icon: ComponentType<{ size?: number }>;
  tone?: "primary" | "warning" | "success" | "secondary" | "error";
}) => {
  const iconClass =
    tone === "warning"
      ? "bg-warning/10 text-warning"
      : tone === "success"
        ? "bg-success/10 text-success"
        : tone === "secondary"
          ? "bg-secondary/10 text-secondary"
          : tone === "error"
            ? "bg-error/10 text-error"
            : "bg-primary/10 text-primary";

  return (
    <motion.section
      whileHover={{ y: -2 }}
      transition={spring}
      className={`${panelClass} p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-base-content/45">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black tracking-tight text-base-content">
            {value}
          </p>
          <p className="mt-1 text-xs font-semibold text-base-content/45">
            {description}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}
        >
          <Icon size={21} />
        </span>
      </div>
    </motion.section>
  );
};

const SectionHeading = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 px-5 pb-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h2 className="text-base font-black tracking-tight text-base-content">
        {title}
      </h2>
      <p className="mt-1 text-xs font-semibold text-base-content/45">
        {description}
      </p>
    </div>
    {action}
  </div>
);

// ─── Attendance Panel ─────────────────────────────────────────────────────────

const AttendancePanel = ({
  members,
}: {
  members: ManagerAttendance[];
}) => (
  <section className={panelClass}>
    <SectionHeading
      title="Member Attendance"
      description="Today's Check-in/Check-out status"
      action={
        <span className="text-[11px] font-bold text-base-content/35">
          Today
        </span>
      }
    />
    {members.length === 0 ? (
      <div className="px-5 pb-6">
        <div className="rounded-2xl bg-base-200/60 p-4 text-center">
          <p className="text-sm font-semibold text-base-content/45">
            No attendance information recorded.
          </p>
        </div>
      </div>
    ) : (
      <div className="divide-y divide-base-content/8">
        {members.map((member) => {
          const isPresent = Boolean(member.check_in);
          const isOut = Boolean(member.check_in && member.check_out);
          return (
            <motion.div
              key={member.user_id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                  {getInitials(member.first_name, undefined, member.username?.[0]?.toUpperCase())}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-base-content">
                    {member.first_name || member.username}
                  </p>
                  <p className="truncate text-xs text-base-content/40">
                    @{member.username}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                {member.is_remote && (
                  <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-black text-secondary">
                    Remote
                  </span>
                )}
                {!isPresent ? (
                  <span className="flex items-center gap-1 text-base-content/40">
                    <CloseCircle size={14} />
                    Absent
                  </span>
                ) : isOut ? (
                  <span className="flex items-center gap-1 text-base-content/50">
                    <TickCircle size={14} className="text-success" />
                    {formatTime(member.check_in)} — {formatTime(member.check_out)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-success">
                    <Activity size={14} />
                    Since {formatTime(member.check_in)}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    )}
  </section>
);

// ─── Work Hours Panel ─────────────────────────────────────────────────────────

const WorkHoursPanel = ({
  workHours,
  overdueByMember,
}: {
  workHours: ManagerDashboard["work_hours"];
  overdueByMember: ManagerDashboard["overdue_summary"]["by_member"];
}) => {
  const maxSeconds = Math.max(...workHours.map((w) => w.total_seconds), 1);
  // Mapping username → count from overdue_summary.by_member (in main response)
  const overdueMap = new Map(
    overdueByMember.map((m) => [m.username, m.count])
  );

  return (
    <section className={panelClass}>
      <SectionHeading
        title="Weekly Work Hours"
        description="Logged time per member this week"
        action={
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-base-content/35">
            <Clock size={13} />
            {formatHours(
              workHours.reduce((s, w) => s + Number(w.total_seconds || 0), 0)
            )}{" "}
            Total
          </span>
        }
      />
      {workHours.length === 0 ? (
        <div className="px-5 pb-6 text-sm font-semibold text-base-content/45">
          No work hours recorded this week.
        </div>
      ) : (
        <div className="divide-y divide-base-content/8">
          {workHours.map((item) => {
            const pct = Math.round((item.total_seconds / maxSeconds) * 100);
            const overdueTasks = overdueMap.get(item.username) ?? 0;
            return (
              <div key={item.user_id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-[11px] font-black text-secondary">
                      {getInitials(item.first_name, item.last_name, item.username?.[0]?.toUpperCase())}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-base-content">
                        {item.first_name} {item.last_name}
                      </p>
                      {overdueTasks > 0 && (
                        <p className="text-[10px] font-bold text-error">
                          {overdueTasks} Overdue Tasks
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-black text-base-content">
                    {formatHours(item.total_seconds)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-base-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.05 }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ─── Project Summary Panel ────────────────────────────────────────────────────

const ProjectSummaryPanel = ({
  projects,
}: {
  projects: ManagerProjectSummary[];
}) => (
  <section className={panelClass}>
    <SectionHeading
      title="Project Status"
      description="Summary of team projects"
      action={
        <Link
          to="/tasks"
          className="motion-interactive inline-flex items-center gap-1 text-xs font-black text-primary"
        >
          Workspace <ArrowRight size={14} />
        </Link>
      }
    />
    {projects.length === 0 ? (
      <div className="px-5 pb-6 text-sm font-semibold text-base-content/45">
        No projects recorded in this team.
      </div>
    ) : (
      <div className="grid gap-3 px-5 pb-5">
        {projects.map((project) => {
          const { label, tone } = getProjectStatusStyle(project.status);
          const progress = getProjectProgress(project);
          const toneClass =
            tone === "success"
              ? "bg-success/10 text-success"
              : tone === "warning"
                ? "bg-warning/10 text-warning"
                : tone === "error"
                  ? "bg-error/10 text-error"
                  : "bg-base-200 text-base-content/50";
          const barClass =
            tone === "success"
              ? "bg-success"
              : tone === "warning"
                ? "bg-warning"
                : tone === "error"
                  ? "bg-error"
                  : "bg-base-content/20";

          return (
            <motion.div
              key={project.id}
              layout
              className="rounded-2xl border border-base-content/8 bg-base-200/50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-base-content">
                    {project.name}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-base-content/40">
                    Deadline {formatDate(project.deadline)} ·{" "}
                    {project.active_member_count} members ·{" "}
                    {project.done_tasks}/{project.total_tasks} tasks
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${toneClass}`}
                >
                  {label}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-100">
                  <div
                    className={`h-full rounded-full ${barClass}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-black text-base-content/55">
                  {progress}%
                </span>
              </div>
              {project.total_time_seconds != null && (
                <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-base-content/40">
                  <Timer1 size={12} />
                  {formatHours(project.total_time_seconds)} logged
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    )}
  </section>
);

// ─── Overdue Summary Panel ────────────────────────────────────────────────────

const OverdueSummaryPanel = ({
  overdue,
}: {
  overdue: ManagerDashboard["overdue_summary"];
}) => (
  <section className={panelClass}>
    <SectionHeading
      title="Overdue Tasks"
      description="Members with overdue tasks"
      action={
        overdue.total_overdue > 0 ? (
          <span className="rounded-full bg-error/10 px-2.5 py-1 text-[11px] font-black text-error">
            {overdue.total_overdue} tasks
          </span>
        ) : (
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-black text-success">
            All Up to Date
          </span>
        )
      }
    />
    {overdue.total_overdue === 0 ? (
      <div className="px-5 pb-6">
        <div className="rounded-2xl bg-success/10 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-success">
            <TickCircle size={18} />
            No overdue tasks
          </div>
          <p className="mt-1 text-xs font-semibold text-base-content/45">
            The team is moving on schedule.
          </p>
        </div>
      </div>
    ) : (
      <div className="divide-y divide-base-content/8">
        {overdue.by_member.map((member) => (
          <div
            key={member.username}
            className="flex items-center justify-between gap-3 px-5 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error/10 text-[11px] font-black text-error">
                {member.first_name?.[0]?.toUpperCase() ||
                  member.username?.[0]?.toUpperCase() ||
                  "؟"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-base-content">
                  {member.first_name || member.username}
                </p>
                <p className="text-xs text-base-content/40">
                  @{member.username}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-error/10 px-2.5 py-1 text-xs font-black text-error">
              {member.count} tasks
            </span>
          </div>
        ))}
      </div>
    )}
  </section>
);

// ─── Task Stats / Workload Panel ──────────────────────────────────────────────

const TaskStatsPanel = ({
  taskStats,
}: {
  taskStats: ManagerDashboard["task_stats"];
}) => {
  const total = Math.max(
    taskStats.reduce((s, stat) => s + stat.count, 0),
    1
  );
  const palette = [
    "bg-primary",
    "bg-secondary",
    "bg-warning",
    "bg-success",
    "bg-error",
  ];

  return (
    <section className={panelClass}>
      <SectionHeading
        title="Task Distribution"
        description="Task breakdown by status"
      />
      <div className="px-5 pb-6">
        {taskStats.length === 0 ? (
          <p className="text-sm font-semibold text-base-content/45">
            No tasks in this team.
          </p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-base-200">
              {taskStats.map((stat, idx) => (
                <motion.div
                  key={`${stat.status_code}-${idx}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(stat.count / total) * 100}%` }}
                  transition={{ duration: 0.7, delay: idx * 0.06 }}
                  className={`${palette[idx % palette.length]} min-w-1`}
                />
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {taskStats.map((stat, idx) => (
                <div
                  key={`${stat.status_code}-legend`}
                  className="flex items-center justify-between rounded-xl bg-base-200/60 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${palette[idx % palette.length]}`}
                    />
                    <span className="truncate text-xs font-bold text-base-content/60">
                      {stat.status_name || stat.status_code || "Uncategorized"}
                    </span>
                  </div>
                  <span className="text-sm font-black text-base-content">
                    {stat.count}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const TeamLeadDashboardSkeleton = () => (
  <div className="mx-auto max-w-[1480px] animate-pulse space-y-6">
    <div className="h-28 rounded-3xl bg-base-100" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 rounded-2xl bg-base-100" />
      ))}
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="h-72 rounded-2xl bg-base-100" />
      <div className="h-72 rounded-2xl bg-base-100" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="h-64 rounded-2xl bg-base-100" />
      <div className="h-64 rounded-2xl bg-base-100" />
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const TeamLeadDashboardPage = () => {
  const timezone = useMemo(getTimezone, []);

  const dashboardQuery = useQuery<ManagerDashboard>({
    queryKey: ["reports", "team-lead-dashboard", timezone],
    queryFn: () => getManagerDashboard(null, timezone),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const dashboard = dashboardQuery.data;

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (dashboardQuery.isLoading) return <TeamLeadDashboardSkeleton />;

  // ─── Error / 403 state ──────────────────────────────────────────────────────
  if (dashboardQuery.isError || !dashboard) {
    const isAccessDenied =
      (dashboardQuery.error as { status?: number } | null)?.status === 403;

    return (
      <section className="mx-auto max-w-2xl py-14">
        <div className={`${panelClass} p-8 text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 text-warning">
            <Danger size={24} />
          </div>
          <h1 className="mt-4 text-xl font-black text-base-content">
            {isAccessDenied ? "Access Denied" : "Error Loading Dashboard"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-base-content/55">
            {isAccessDenied
              ? "This section is only accessible to authorized team members. If you believe this is a mistake, contact your manager."
              : "An error occurred fetching data. Please try again."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void dashboardQuery.refetch()}
              className="motion-interactive inline-flex items-center gap-2 rounded-xl border border-base-content/10 bg-base-100 px-4 py-2.5 text-xs font-black text-base-content/70 hover:border-primary/30 hover:text-primary"
            >
              <Refresh2 size={14} />
              Try Again
            </button>
            <Link
              to="/dashboard"
              className="motion-interactive inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-primary-content"
            >
              Personal Dashboard
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // ─── KPI aggregates ─────────────────────────────────────────────────────────
  const totalTasks = dashboard.task_stats.reduce(
    (sum, stat) => sum + stat.count,
    0
  );
  const doneTasks = dashboard.task_stats
    .filter((stat) => stat.status_code?.toLowerCase() === "done")
    .reduce((sum, stat) => sum + stat.count, 0);

  const totalWorkSeconds = dashboard.work_hours.reduce(
    (sum, w) => sum + Number(w.total_seconds || 0),
    0
  );

  const membersPresent = dashboard.members_attendance.filter(
    (m) => m.check_in
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-[1480px] space-y-5 sm:space-y-6"
    >
      {/* ─── Header ─── */}
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary">
            <Chart21 size={15} />
            Team Overview
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-base-content sm:text-4xl">
            Your Team Status
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/55 sm:text-base">
            Overview of attendance, tasks, and project progress of your team.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-base-content/10 bg-base-100 px-3 text-xs font-bold text-base-content/55">
            <Activity size={15} className="text-success" />
            Live Data
          </span>
          <button
            type="button"
            onClick={() => {
              void dashboardQuery.refetch();
            }}
            className="motion-interactive inline-flex h-10 items-center gap-2 rounded-xl border border-base-content/10 bg-base-100 px-3 text-xs font-bold text-base-content/60 hover:border-primary/30 hover:text-primary"
          >
            <Refresh2 size={15} />
            Refresh
          </button>
        </div>
      </section>

      {/* ─── Empty Team Banner ─── */}
      {dashboard.team_member_count === 0 && (
        <section
          className={`${panelClass} flex items-center gap-4 bg-base-100 p-5 sm:p-6`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <People size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-base-content">
              No team members assigned yet
            </h2>
            <p className="mt-0.5 text-xs text-base-content/55">
              Team metrics and workload analytics will be populated automatically once members are assigned to your team.
            </p>
          </div>
        </section>
      )}

      {/* ─── Decision Banner ─── */}
      {dashboard.overdue_summary.total_overdue > 0 && (
        <section
          className={`${panelClass} flex flex-col gap-4 bg-gradient-to-br from-error/[0.06] via-base-100 to-base-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-error/10 text-error">
              <Danger size={19} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-error">
                Needs Attention
              </p>
              <h2 className="mt-1 text-lg font-black text-base-content">
                {dashboard.overdue_summary.total_overdue} tasks behind schedule
              </h2>
              <p className="mt-1 text-xs font-semibold text-base-content/50">
                See details in the overdue tasks section.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-base-content/50">
            <Calendar size={15} />
            Updated just now
          </div>
        </section>
      )}

      {/* ─── KPI Cards ─── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Team Members"
          value={dashboard.team_member_count}
          description="members in this team"
          icon={People}
          tone="primary"
        />
        <MetricCard
          label="Today's Attendance"
          value={`${membersPresent} / ${dashboard.members_attendance.length}`}
          description="present out of total"
          icon={Building}
          tone="success"
        />
        <MetricCard
          label="Overdue Tasks"
          value={dashboard.overdue_summary.total_overdue}
          description={
            doneTasks > 0
              ? `${doneTasks} Since ${totalTasks} tasks Completed`
              : `Since Total ${totalTasks} tasks`
          }
          icon={Danger}
          tone={dashboard.overdue_summary.total_overdue > 0 ? "warning" : "success"}
        />
      </section>

      {/* ─── Attendance + Work Hours ─── */}
      <section className="grid gap-5 xl:grid-cols-2">
        <AttendancePanel members={dashboard.members_attendance} />
        <WorkHoursPanel
          workHours={dashboard.work_hours}
          overdueByMember={dashboard.overdue_summary.by_member}
        />
      </section>

      {/* ─── Task Stats + Overdue Summary ─── */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <TaskStatsPanel taskStats={dashboard.task_stats} />
        <OverdueSummaryPanel overdue={dashboard.overdue_summary} />
      </section>

      {/* ─── Project Summary ─── */}
      {dashboard.project_summary.length > 0 && (
        <section className="grid gap-5">
          <ProjectSummaryPanel projects={dashboard.project_summary} />
        </section>
      )}

      {/* ─── Weekly focus footer ─── */}
      <section className="flex items-center justify-between rounded-2xl border border-base-content/8 bg-base-200/40 px-5 py-3">
        <div className="flex items-center gap-2 text-xs font-bold text-base-content/50">
          <Timer1 size={14} />
          Total weekly work hours of the team:
          <span className="font-black text-base-content">
            {formatHours(totalWorkSeconds)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-base-content/50">
          <TaskSquare size={14} />
          {totalTasks} tasks · {doneTasks} Completed
        </div>
      </section>
    </motion.div>
  );
};

export default TeamLeadDashboardPage;
