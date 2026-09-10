import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  TaskSquare,
  Ticket,
  NoteText,
  Briefcase,
  Play,
  Stop,
  TickCircle,
  Add,
  ArrowRight,
  User,
  LogoutCurve,
  Danger,
} from "iconsax-reactjs";
import { toast } from "sonner";
import { useAuthStore } from "../../auth/store/authStore";
import { getEmployeeDashboard } from "../api/dashboardApi";
import {
  getTodayAttendance,
  checkIn,
  checkOut,
  startTimer,
  stopTimer,
  getOrganizations,
} from "../../attendance/api/attendanceApi";
import { useProjects } from "../../projects/hooks/useProjects";
import { useTickets } from "../../tickets/hooks/useTickets";
import { updateTask, getTask } from "../../tasks/api/tasksApi";
import { StandupModal } from "../../tasks/components/StandupModal";
import { TaskSheet } from "../../tasks/components/TaskSheet";
import type { EmployeeTaskSummary } from "../types";

const getTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const formatDay = () =>
  new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

const formatDecimalHours = (
  decimalValue: number | string | null | undefined,
): string => {
  const num = Number(decimalValue);
  if (!num || isNaN(num) || num <= 0) return "0h 0m";
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  return `${h}h ${m}m`;
};

const ProgressRing = ({
  radius,
  stroke,
  progress,
  color,
}: {
  radius: number;
  stroke: number;
  progress: number;
  color: string;
}) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = Math.max(0, circumference - (progress / 100) * circumference);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="opacity-10"
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-1000 ease-in-out"
          filter={`drop-shadow(0 0 4px ${color}80)`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-black text-base-content">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export const UserDashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timezone = useMemo(getTimezone, []);

  const [isStandupOpen, setStandupOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 1. Dashboard Query
  const dashboardQuery = useQuery({
    queryKey: ["employee-dashboard", timezone],
    queryFn: () => getEmployeeDashboard(timezone),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // 2. Attendance & Organizations Query
  const attendanceQuery = useQuery({
    queryKey: ["today-attendance"],
    queryFn: getTodayAttendance,
  });

  const orgsQuery = useQuery({
    queryKey: ["user-organizations"],
    queryFn: getOrganizations,
  });

  // 3. Projects Query
  const { data: projectsData = [] } = useProjects(undefined);

  // 4. Tickets Query
  const { data: ticketsData } = useTickets(
    new URLSearchParams({ page_size: "10" }),
  );
  const openTickets = useMemo(() => {
    const list = Array.isArray(ticketsData?.data?.results)
      ? ticketsData.data.results
      : Array.isArray(ticketsData?.results)
        ? ticketsData.results
        : [];
    return list.filter(
      (t: any) => t.status !== "closed" && t.status !== "resolved",
    );
  }, [ticketsData]);

  // 5. Selected Task Query
  const taskQuery = useQuery({
    queryKey: ["task", selectedTaskId],
    queryFn: () => getTask(selectedTaskId!),
    enabled: Boolean(selectedTaskId),
  });

  const dashboard = dashboardQuery.data;
  const attendance = attendanceQuery.data;

  // Use is_active (session-based) if available, fall back to check_in && !check_out
  const isCheckedIn = Boolean(
    attendance &&
    ((attendance as any).is_active ||
      (attendance.check_in && !attendance.check_out)),
  );
  const checkInTime = attendance?.check_in
    ? new Date(attendance.check_in).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Attendance Check-In / Check-Out mutations
  const checkInMutation = useMutation({
    mutationFn: async () => {
      let orgs = orgsQuery.data;
      if (!orgs || orgs.length === 0) {
        orgs = await getOrganizations();
      }
      const targetOrgId = orgs[0]?.id;
      if (!targetOrgId) {
        throw new Error(
          "No active organization found. Please create or join an organization first.",
        );
      }
      return checkIn(String(targetOrgId));
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["today-attendance"], data);
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
      toast.success("Checked in successfully");
    },
    onError: (err: any) => {
      // axiosClient transforms errors: err is already the response body
      const msg =
        err?.error ||
        err?.detail ||
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Could not check in";
      toast.error(msg);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => checkOut(),
    onSuccess: (data) => {
      queryClient.setQueryData(["today-attendance"], data);
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
      toast.success("Checked out successfully");
    },
    onError: () => toast.error("Could not check out"),
  });

  // Timer Mutations
  const startTimerMutation = useMutation({
    mutationFn: (taskId: string) => startTimer(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Timer started");
    },
    onError: () => toast.error("Could not start timer"),
  });

  const stopTimerMutation = useMutation({
    mutationFn: (timerId?: string) => stopTimer(timerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Timer stopped");
    },
    onError: () => toast.error("Could not stop timer"),
  });

  // Mark Done Mutation
  const markDoneMutation = useMutation({
    mutationFn: (taskId: string) => updateTask(taskId, { is_finished: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Task marked as completed");
    },
    onError: () => toast.error("Could not mark task as completed"),
  });

  const displayName = user?.first_name || user?.username || "Friend";
  const allTasks: EmployeeTaskSummary[] = useMemo(() => {
    if (!dashboard) return [];
    return [
      ...(dashboard.overdue_tasks?.map((t: EmployeeTaskSummary) => ({ ...t, is_overdue: true })) || []),
      ...(dashboard.upcoming_tasks?.map((t: EmployeeTaskSummary) => ({ ...t, is_overdue: false })) || []),
    ];
  }, [dashboard]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      {/* ─── 1. Header Bar with Greetings & Quick Actions ─── */}
      <div className="flex flex-col justify-between gap-4 border-b border-base-content/8 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-base-content sm:text-2xl">
              Good day, {displayName} 👋
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-base-content/50">
            {formatDay()} — Your daily command center.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Check In / Out Button */}
          {isCheckedIn ? (
            <button
              type="button"
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-all"
            >
              <LogoutCurve size={15} />
              <span>Check Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
            >
              <User size={15} />
              <span>Check In</span>
            </button>
          )}

          {/* Log Standup Button */}
          <button
            type="button"
            onClick={() => setStandupOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-content shadow-md shadow-primary/15 hover:bg-primary/95 transition-all"
          >
            <TickCircle size={15} />
            <span>
              {dashboard?.today_standup ? "Update Standup" : "Log Standup"}
            </span>
          </button>
        </div>
      </div>

      {/* ─── 2. Top Metrics Grid (4 Summary Cards) ─── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Attendance */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Attendance
            </span>
            <Clock size={16} className="text-primary" />
          </div>
          <p className="mt-2 text-base font-bold text-base-content">
            {isCheckedIn ? `Checked in ${checkInTime}` : "Not checked in"}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-base-content/45">
            {isCheckedIn
              ? "Working on today's shift"
              : "Click Check In to start shift"}
          </p>
        </div>

        {/* Focus Tasks */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Focus Tasks
            </span>
            <TaskSquare size={16} className="text-blue-500" />
          </div>
          <p className="mt-2 text-base font-bold text-base-content">
            {allTasks.length} {allTasks.length === 1 ? "Task" : "Tasks"}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-base-content/45">
            {dashboard?.overdue_tasks?.length
              ? `${dashboard.overdue_tasks.length} overdue`
              : "All on track"}
          </p>
        </div>

        {/* Daily Standup */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Daily Standup
            </span>
            <NoteText size={16} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-base font-bold text-base-content">
            {dashboard?.today_standup ? "Submitted" : "Pending"}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-base-content/45">
            {dashboard?.today_standup
              ? `${formatDecimalHours(dashboard.today_standup.hours_worked)} logged`
              : "Log your daily progress"}
          </p>
        </div>

        {/* Active Tickets */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Open Tickets
            </span>
            <Ticket size={16} className="text-amber-500" />
          </div>
          <p className="mt-2 text-base font-bold text-base-content">
            {openTickets.length}{" "}
            {openTickets.length === 1 ? "Ticket" : "Tickets"}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-base-content/45">
            {openTickets.length
              ? "Active support requests"
              : "No active tickets"}
          </p>
        </div>
      </div>

      {/* ─── 3. Main Dashboard Layout (2 Columns) ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols wide on LG): Tasks & Projects */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tasks Section */}
          <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-base-content/8 pb-3">
              <div className="flex items-center gap-2">
                <TaskSquare size={16} className="text-primary" />
                <h2 className="text-xs font-bold text-base-content uppercase tracking-wider">
                  My Priority Tasks ({allTasks.length})
                </h2>
              </div>
              <Link
                to="/tasks"
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>View Board</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {allTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-base-content/40">
                No active tasks assigned to you right now.
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-base-content/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-base-content/20">
                {allTasks.map((t: EmployeeTaskSummary) => {
                  const isRunningTimer = dashboard?.active_timers?.some(
                    (at) => String(at.task_id) === String(t.id),
                  );

                  return (
                    <DashboardTaskCard
                       key={t.id}
                       task={t}
                       isRunningTimer={isRunningTimer || false}
                       onMarkDone={(id) => markDoneMutation.mutate(id)}
                       onStartTimer={(id) => startTimerMutation.mutate(id)}
                       onStopTimer={() => stopTimerMutation.mutate(undefined)}
                       onClickTitle={(id) => setSelectedTaskId(id)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Projects Grid */}
          <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-base-content/8 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-primary" />
                <h2 className="text-xs font-bold text-base-content uppercase tracking-wider">
                  Active Projects ({projectsData.filter((p: any) => p.status === "active").length})
                </h2>
              </div>
              <Link
                to="/projects"
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>All Projects</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {projectsData.filter((p: any) => p.status === "active").length === 0 ? (
              <div className="py-8 text-center text-xs text-base-content/40">
                No active projects assigned yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {projectsData.filter((p: any) => p.status === "active").slice(0, 4).map((p: any) => {
                  const color = p.color || "#6366f1";

                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/50 backdrop-blur-md p-5 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-base-content/5"
                    >
                      {/* Decorative colored glow based on project color */}
                      <div 
                        className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40 pointer-events-none"
                        style={{ backgroundColor: color }}
                      />
                      
                      <div className="relative z-10 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {p.prefix && (
                            <span className="mb-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-sm" style={{ backgroundColor: color }}>
                              {p.prefix}
                            </span>
                          )}
                          <h3
                            dir="auto"
                            className="text-base font-black text-base-content truncate"
                            title={p.name}
                          >
                            {p.name}
                          </h3>
                        </div>
                        <span className="shrink-0 rounded-full bg-base-200 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-base-content/70">
                          {p.status}
                        </span>
                      </div>

                      <div className="relative z-10 mt-6 flex items-end justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-base-content/50 uppercase tracking-wider">
                            Tasks Progress
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-base-content">
                              {Math.round(((p.task_count || 0) * (p.progress_percentage || 0)) / 100)}
                            </span>
                            <span className="text-[11px] font-bold text-base-content/40">
                              / {p.task_count || 0} Done
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <ProgressRing radius={28} stroke={4} progress={p.progress_percentage || 0} color={color} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Standup, Blockers & Tickets */}
        <div className="space-y-6">
          {/* Daily Standup Widget */}
          <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-base-content uppercase tracking-wider">
                Today's Standup
              </h3>
              <button
                type="button"
                onClick={() => setStandupOpen(true)}
                className="text-xs font-bold text-primary hover:underline"
              >
                {dashboard?.today_standup ? "Edit" : "Write"}
              </button>
            </div>

            {dashboard?.today_standup ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                  <span>
                    Logged{" "}
                    {formatDecimalHours(dashboard.today_standup.hours_worked)}
                  </span>
                  <TickCircle size={15} />
                </div>
                {dashboard.today_standup.today_work && (
                  <p
                    dir="auto"
                    className="text-base-content/75 text-[11px] line-clamp-2"
                  >
                    {dashboard.today_standup.today_work}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-base-content/15 p-4 text-center">
                <p className="text-xs text-base-content/50">
                  You haven't logged today's standup yet.
                </p>
                <button
                  type="button"
                  onClick={() => setStandupOpen(true)}
                  className="mt-2.5 inline-flex h-8 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-bold text-primary-content"
                >
                  <Add size={14} /> Log Standup
                </button>
              </div>
            )}
          </div>

          {/* Blocked Tasks Widget */}
          {dashboard?.blocked_tasks && dashboard.blocked_tasks.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Danger size={16} />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Blocked Tasks ({dashboard.blocked_tasks.length})
                </h3>
              </div>
              <div className="space-y-2">
                {dashboard.blocked_tasks.map((t: any) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-amber-500/20 bg-base-100 p-2.5 text-xs"
                  >
                    <p
                      dir="auto"
                      className="font-bold text-base-content truncate"
                    >
                      {t.title}
                    </p>
                    {t.blockers_reason && (
                      <p
                        dir="auto"
                        className="mt-0.5 text-[10px] text-amber-600 font-medium line-clamp-1"
                      >
                        {t.blockers_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Support Tickets Widget */}
          <div className="rounded-2xl border border-base-content/8 bg-base-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-base-content uppercase tracking-wider">
                Support Tickets
              </h3>
              <Link
                to="/tickets"
                className="text-xs font-bold text-primary hover:underline"
              >
                View all
              </Link>
            </div>

            {openTickets.length === 0 ? (
              <p className="py-4 text-center text-xs text-base-content/40">
                No open tickets right now.
              </p>
            ) : (
              <div className="space-y-2">
                {openTickets.slice(0, 3).map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-base-content/6 bg-base-200/40 p-2.5 text-xs cursor-pointer hover:bg-base-200/70 transition"
                  >
                    <div className="min-w-0">
                      <p
                        dir="auto"
                        className="font-bold text-base-content truncate"
                      >
                        {t.subject || t.title}
                      </p>
                      <span className="text-[10px] text-base-content/45 capitalize">
                        {t.status}
                      </span>
                    </div>
                    <ArrowRight
                      size={13}
                      className="shrink-0 text-base-content/40"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Standup & Task Modals */}
      <StandupModal
        isOpen={isStandupOpen}
        onClose={() => {
          setStandupOpen(false);
          queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
        }}
        onSaved={() => {
          setStandupOpen(false);
          queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
        }}
        entryId={dashboard?.today_standup?.id}
        projectId={dashboard?.today_standup?.project}
        date={dashboard?.today_standup?.date}
        initial={
          dashboard?.today_standup
            ? {
                hoursWorked: String(dashboard.today_standup.hours_worked),
                todayWork: dashboard.today_standup.today_work,
                blockers: dashboard.today_standup.blockers ?? "",
              }
            : undefined
        }
      />
      <TaskSheet
        task={taskQuery.data ?? null}
        onClose={() => setSelectedTaskId(null)}
        onPatch={async (taskId, patch) => {
          await updateTask(taskId, patch);
          queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
        }}
      />
    </motion.div>
  );
};

export default UserDashboardPage;

function DashboardTaskCard({
  task,
  isRunningTimer,
  onMarkDone,
  onStartTimer,
  onStopTimer,
  onClickTitle,
}: {
  task: EmployeeTaskSummary;
  isRunningTimer: boolean;
  onMarkDone: (id: string) => void;
  onStartTimer: (id: string) => void;
  onStopTimer: () => void;
  onClickTitle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isOverdue = task.is_overdue;
  
  return (
    <motion.div
      layout
      className="group relative overflow-hidden rounded-xl border border-base-content/6 bg-base-200/40 hover:bg-base-200/70 transition-all"
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 relative z-10 cursor-pointer" onClick={() => setExpanded(!expanded)}>
         {/* Checkbox and Title */}
         <div className="flex items-center gap-3 min-w-0">
           <button
             type="button"
             onClick={(e) => { e.stopPropagation(); onMarkDone(String(task.id)); }}
             className={`size-4.5 rounded-md border shrink-0 transition ${
                isOverdue ? "border-red-500/30 bg-base-100 hover:border-red-500" : "border-base-content/20 bg-base-100 hover:border-primary"
             }`}
             title="Mark complete"
           />
           <div className="min-w-0">
             <div className="flex items-center gap-2">
               <p
                 dir="auto"
                 onClick={(e) => { e.stopPropagation(); onClickTitle(String(task.id)); }}
                 className="font-bold truncate hover:underline text-base-content hover:text-primary"
               >
                 {task.title}
               </p>
             </div>
             
             <div className="mt-0.5 flex items-center gap-2 text-[10px] text-base-content/45">
               {task.project_name && (
                 <span className="font-semibold text-primary">
                   {task.project_name}
                 </span>
               )}
               {task.priority && (
                 <span className="capitalize font-semibold text-amber-600">
                   • {task.priority}
                 </span>
               )}
               {task.due_date && (
                 <div className="flex items-center gap-1 font-semibold ml-1">
                   <Clock size={10} className={isOverdue ? "text-red-500" : "text-base-content/40"} />
                   <span className={isOverdue ? "text-red-500" : "text-base-content/50"}>
                     {new Date(task.due_date).toLocaleDateString()}
                   </span>
                 </div>
               )}
             </div>
           </div>
         </div>

         {/* Timer and Expand indicator */}
         <div className="flex items-center gap-2 shrink-0">
           <div onClick={(e) => e.stopPropagation()}>
             {isRunningTimer ? (
                <button
                  type="button"
                  onClick={() => onStopTimer()}
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-red-500/10 px-2.5 text-[11px] font-bold text-red-500 hover:bg-red-500/20"
                >
                  <Stop size={12} variant="Bold" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartTimer(String(task.id))}
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary/10 px-2.5 text-[11px] font-bold text-primary hover:bg-primary/20"
                >
                  <Play size={12} variant="Bold" />
                  <span>Focus</span>
                </button>
              )}
            </div>
            
            <div className={`p-1 rounded-lg transition-colors ${expanded ? "bg-base-content/10" : "hover:bg-base-content/5"}`}>
              <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                 <ArrowRight size={14} className="text-base-content/50" />
              </motion.div>
            </div>
         </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-base-content/5"
          >
            <div className="p-3 pt-2 text-xs text-base-content/70 flex flex-col gap-2 relative z-10">
               {task.description ? (
                 <p dir="auto" className="line-clamp-3 text-base-content/60 leading-relaxed">{task.description}</p>
               ) : (
                 <p className="italic text-base-content/40">No additional details provided.</p>
               )}
               
               <div className="flex items-center gap-4 mt-1 pt-2 border-t border-base-content/5">
                 {task.due_date && (
                   <div className="flex items-center gap-1 text-[10px]">
                     <Clock size={12} className={isOverdue ? "text-red-500" : "text-base-content/40"} />
                     <span className={isOverdue ? "text-red-500 font-bold" : "text-base-content/50 font-medium"}>
                       Due: {new Date(task.due_date).toLocaleDateString()}
                     </span>
                   </div>
                 )}
                 {task.status_name && (
                   <div className="flex items-center gap-1 text-[10px]">
                     <div className="size-1.5 rounded-full bg-primary" />
                     <span className="font-medium">{task.status_name}</span>
                   </div>
                 )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
