import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TimeLog } from "../../attendance/types";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock, Refresh2, Timer1, TickCircle } from "iconsax-reactjs";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { stopTimer, startTimer } from "../../attendance/api/attendanceApi";
import { useAuthStore } from "../../auth/store/authStore";
import { StandupModal } from "../../tasks/components/StandupModal";
import { TaskSheet } from "../../tasks/components/TaskSheet";
import { getTask, updateTask } from "../../tasks/api/tasksApi";
import type { Task } from "../../tasks/types";
import { getEmployeeDashboard } from "../api/dashboardApi";
import type { EmployeeActiveTimer } from "../types";
import { TodayBlockersCard } from "../components/TodayBlockersCard";
import { TodayEmptyState, TodaySkeleton } from "../components/TodayEmptyState";
import { TodayStandupCard } from "../components/TodayStandupCard";
import { TodayTasksCard } from "../components/TodayTasksCard";
import { TodayTimerCard } from "../components/TodayTimerCard";

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
  }).format(new Date());

const formatHours = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
};

const UserDashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [isStandupOpen, setStandupOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const timezone = useMemo(getTimezone, []);
  const dashboardQuery = useQuery({
    queryKey: ["employee-dashboard", timezone],
 
    queryFn: () => getEmployeeDashboard(timezone),
 
    staleTime: 30_000,
 
    refetchInterval: 60_000,
 
  });
 
  const taskQuery = useQuery({
    queryKey: ["task", selectedTaskId],
    queryFn: () => getTask(selectedTaskId!),
    enabled: Boolean(selectedTaskId),
    staleTime: 60_000,
  });
 

 
  const stopTimerMutation = useMutation({
    mutationFn: (timerId: string) => stopTimer(timerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["active-timer"] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Focus timer stopped");
    },
    onError: () => toast.error("Could not stop the timer"),
  });
 

 
  const startTimerMutation = useMutation({
 
    mutationFn: (taskId: string) => startTimer(taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["active-timer"] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Focus timer started");
    },
    onError: () => toast.error("Could not start the timer"),
  });
 
  const markDoneMutation = useMutation({
    mutationFn: (taskId: string) => updateTask(taskId, { is_finished: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task marked as done");
    },
    onError: () => toast.error("Could not mark the task as done"),
  });
 
  const handlePatchTask = useCallback(
    async (taskId: string | number, patch: Partial<Task>) => {
      await updateTask(taskId, patch);
      await queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    [queryClient],
  );
 
  const handleCloseTaskSheet = useCallback(() => {
    setSelectedTaskId(null);
  }, []);
  const toTimeLog = (timers: EmployeeActiveTimer[] | null | undefined, taskId: string | number | undefined): TimeLog | null => {
    if (!timers || !taskId) return null;
    const timer = timers.find(t => t.task_id === String(taskId));
    if (!timer) return null;
    return {
      id: timer.id,
      user: 0,
      task: timer.task_id ?? '',
      start_time: timer.start_time,
      end_time: null,
      duration_seconds: 0,
      is_active: true,
      description: '',
      created_at: timer.start_time,
      date: timer.start_time,
    };
  };

  const displayName = user?.first_name || user?.username || "there";
  const dashboard = dashboardQuery.data;
  const allOpenTasks = dashboard
    ? [...dashboard.overdue_tasks, ...dashboard.upcoming_tasks]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-[1440px] space-y-5 sm:space-y-7"
    >
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            <Calendar size={15} />
            {formatDay()}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-base-content sm:text-4xl">
            Good morning, {displayName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/55 sm:text-base">
            Here&apos;s your clear path through the day. Focus on what matters next.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/tasks" className="motion-interactive inline-flex h-11 items-center gap-2 rounded-xl border border-base-content/10 bg-base-100 px-4 text-sm font-bold text-base-content/70 shadow-sm hover:border-primary/30 hover:text-primary">
            Open workspace <ArrowRight size={16} />
          </Link>
          <button type="button" onClick={() => setStandupOpen(true)} className="motion-interactive inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-content shadow-lg shadow-primary/15 hover:bg-primary/90">
            <TickCircle size={17} />
            {dashboard?.today_standup ? "Update standup" : "Write standup"}
          </button>
        </div>
      </section>

      {dashboardQuery.isLoading ? (
        <TodayLoadingState />
      ) : dashboardQuery.isError || !dashboard ? (
        <section className="madaar-surface">
          <TodayEmptyState
            icon={<Refresh2 size={24} />}
            title="Today is temporarily unavailable"
            description="We couldn’t load your work overview. Try again in a moment."
            action={<button type="button" onClick={() => dashboardQuery.refetch()} className="motion-interactive rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-content hover:bg-primary/90">Try again</button>}
          />
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
            <div className="flex flex-col gap-4">
              {dashboard.active_timers && dashboard.active_timers.length > 0 ? (
                dashboard.active_timers.map((timer) => (
                  <TodayTimerCard
                    key={timer.id}
                    activeTimer={timer}
                    isStopping={stopTimerMutation.isPending && stopTimerMutation.variables === timer.id}
                    onStop={() => stopTimerMutation.mutate(timer.id)}
                  />
                ))
              ) : (
                <TodayTimerCard
                  activeTimer={null}
                  isStopping={false}
                  onStop={() => {}}
                />
              )}
            </div>
            <WeeklyPulse totalSeconds={dashboard.weekly_time.total_seconds} totalLogs={dashboard.weekly_time.total_logs} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
            <TodayTasksCard
              tasks={dashboard.upcoming_tasks}
              overdueTasks={dashboard.overdue_tasks}
              activeTaskIds={dashboard.active_timers?.map(t => t.task_id).filter(Boolean) as string[]}
              onSelectTask={(id) => setSelectedTaskId(id)}
              onMarkDone={(id) => markDoneMutation.mutate(id)}
              startingTaskId={startTimerMutation.isPending ? startTimerMutation.variables : null}
              onStart={(task) => startTimerMutation.mutate(task.id)}
            />
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              <TodayStandupCard standup={dashboard.today_standup} onOpen={() => setStandupOpen(true)} />
              <TodayBlockersCard blockers={dashboard.blocked_tasks} />
            </div>
          </section>

          {dashboard.active_projects.length === 0 && allOpenTasks.length === 0 && !dashboard.today_standup && (
            <section className="madaar-surface">
              <TodayEmptyState
                icon={<Clock size={24} />}
                title="A calm start"
                description="Your workspace is quiet today. Use the time to plan, learn or help unblock the team."
                action={<Link to="/tasks" className="motion-interactive rounded-xl border border-base-content/10 px-4 py-2.5 text-xs font-bold text-base-content/70 hover:border-primary/30 hover:text-primary">Explore workspace</Link>}
              />
            </section>
          )}
        </>
      )}

      <StandupModal
        isOpen={isStandupOpen}
        onClose={() => {
          setStandupOpen(false);
          queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
        }}
      />
      <TaskSheet
        task={taskQuery.data ?? null}
        onClose={handleCloseTaskSheet}
        onPatch={handlePatchTask}
        onPlayTimer={(taskId) => startTimerMutation.mutate(taskId.toString())}
        onStopTimer={() => {
          const timer = dashboard?.active_timers?.find(t => t.task_id === String(taskQuery.data?.id));
          if (timer) stopTimerMutation.mutate(timer.id); 
        }}
        activeTimer={toTimeLog(dashboard?.active_timers, taskQuery.data?.id)}
      />
    </motion.div>
  );
};

const WeeklyPulse = ({ totalSeconds, totalLogs }: { totalSeconds: number; totalLogs: number }) => (
  <section className="madaar-surface flex flex-col justify-between p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-base-content/45">This week</p>
        <h2 className="mt-2 text-xl font-bold text-base-content">Work rhythm</h2>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary"><Clock size={23} /></div>
    </div>
    <div className="mt-8">
      <p className="font-mono text-4xl font-bold tracking-tight text-base-content">{formatHours(totalSeconds)}</p>
      <p className="mt-2 text-sm text-base-content/55">{totalLogs} logged focus session{totalLogs === 1 ? "" : "s"}</p>
    </div>
    <div className="mt-6 flex items-center gap-2 rounded-xl bg-base-200/70 px-3 py-2.5 text-xs font-semibold text-base-content/55">
      <Timer1 size={15} className="text-secondary" />
      Keep the streak gentle and consistent.
    </div>
  </section>
);

const TodayLoadingState = () => (
  <div className="space-y-5" aria-label="Loading your day">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
      <TodaySkeleton className="min-h-64" />
      <TodaySkeleton className="min-h-64" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
      <TodaySkeleton className="min-h-96" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1"><TodaySkeleton className="min-h-56" /><TodaySkeleton className="min-h-56" /></div>
    </div>
  </div>
);

export default UserDashboardPage;
