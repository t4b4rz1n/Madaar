import { formatDisplayDate } from "../../../utils/date";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  TaskSquare,
  Ticket,
  NoteText,
  Play,
  Stop,
  TickCircle,
  ArrowRight,
  User,
  LogoutCurve,
  Danger,
  Timer1,
  Briefcase,
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
import { useTickets } from "../../tickets/hooks/useTickets";
import { updateTask, getTask } from "../../tasks/api/tasksApi";
import { StandupModal } from "../../tasks/components/StandupModal";
import { StandupMatrix } from "../../tasks/components/StandupMatrix";
import { TaskSheet } from "../../tasks/components/TaskSheet";
import type { EmployeeTaskSummary } from "../types";

const getTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const formatDay = () => formatDisplayDate(new Date(), "EEEE, MMMM d, yyyy");

const formatDecimalHours = (
  decimalValue: number | string | null | undefined,
): string => {
  const num = Number(decimalValue);
  if (!num || isNaN(num) || num <= 0) return "0h 0m";
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  return `${h}h ${m}m`;
};

const formatSeconds = (
  seconds: number | null | undefined,
): string => {
  const value = Math.max(0, Number(seconds || 0));
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  return `${h}h ${m}m`;
};

export const UserDashboardPage = () => {
  const user = useAuthStore((state) => state.user);
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

  // 3. Tickets Query
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
      className="space-y-4 pb-8"
    >
      {/* ─── 1. Header Bar with Greetings & Quick Actions ─── */}
      <div className="flex flex-col justify-between gap-2.5 border-b border-base-content/8 pb-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h1 className="text-lg font-bold tracking-tight text-base-content sm:text-xl">
              Good day, {displayName} 👋
            </h1>
          <p className="text-xs text-base-content/50">
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
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-all"
            >
              <LogoutCurve size={15} />
              <span>Check Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
            >
              <User size={15} />
              <span>Check In</span>
            </button>
          )}

          {/* Log Standup Button */}
          <button
            type="button"
            onClick={() => setStandupOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-content shadow-md shadow-primary/15 hover:bg-primary/95 transition-all"
          >
            <TickCircle size={15} />
            <span>
              {dashboard?.today_standup ? "Update Standup" : "Log Standup"}
            </span>
          </button>
        </div>
      </div>

      {/* ─── 2. Metrics (3 rows × 2 cards) + My Tasks column spanning all three rows ─── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] lg:grid-rows-3">
        {/* ── Row 1 · Attendance ── */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4 lg:col-start-1 lg:row-start-1">
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

        {/* ── Row 1 · Focus Tasks ── */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4 lg:col-start-2 lg:row-start-1">
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

        {/* ── Row 2 · Open Tickets ── */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4 lg:col-start-1 lg:row-start-2">
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

        {/* ── Row 2 · Daily Standup ── */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4 lg:col-start-2 lg:row-start-2">
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

        {/* ── Row 3 · Weekly Hours ── */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4 lg:col-start-1 lg:row-start-3">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Weekly Hours
            </span>
            <Timer1 size={16} className="text-violet-500" />
          </div>
          <p className="mt-2 text-base font-bold text-base-content">
            {formatSeconds(dashboard?.weekly_time?.total_seconds)}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-base-content/45">
            {`${dashboard?.weekly_time?.total_logs ?? 0} time logs this week`}
          </p>
        </div>

        {/* ── Row 3 · Active Projects ── */}
        <div className="rounded-2xl border border-base-content/8 bg-base-100 p-4 lg:col-start-2 lg:row-start-3">
          <div className="flex items-center justify-between text-base-content/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Active Projects
            </span>
            <Briefcase size={16} className="text-teal-500" />
          </div>
          <p className="mt-2 text-base font-bold text-base-content">
            {dashboard?.active_projects?.length ?? 0}{" "}
            {(dashboard?.active_projects?.length ?? 0) === 1
              ? "Project"
              : "Projects"}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-base-content/45">
            {dashboard?.active_projects?.length
              ? "Currently assigned to you"
              : "No active projects"}
          </p>
        </div>

        {/* ── Column 3 · My Tasks (spans all three rows) ── */}
        <div className="flex flex-col rounded-xl border border-base-content/8 bg-base-100 p-4 lg:col-start-3 lg:row-span-3 lg:row-start-1">
          <div className="flex items-center justify-between border-b border-base-content/8 pb-2.5">
            <div className="flex items-center gap-2">
              <TaskSquare size={15} className="text-primary" />
              <h2 className="text-[11px] font-bold text-base-content uppercase tracking-wider">
                My Tasks ({allTasks.length})
              </h2>
            </div>
            <Link
              to="/tasks"
              className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Board</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {allTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-base-content/40">
              No active tasks assigned to you right now.
            </div>
          ) : (
            <div className="mt-3 min-h-0 max-h-[17rem] flex-1 space-y-2 overflow-y-auto pe-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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

          {/* Blocked Tasks Widget */}
          {dashboard?.blocked_tasks && dashboard.blocked_tasks.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
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
        </div>
      </div>

      {/* ─── 3. Standup Matrix (full width, nothing beside) ─── */}
      <div className="min-w-0">
        <StandupMatrix title="Standup Matrix" />
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
                     {formatDisplayDate(task.due_date, "yyyy-MM-dd")}
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
                  aria-label="Start focus timer"
                  title="Start focus timer"
                  className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <Play size={12} variant="Bold" />
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
                       Due: {formatDisplayDate(task.due_date, "yyyy-MM-dd")}
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
