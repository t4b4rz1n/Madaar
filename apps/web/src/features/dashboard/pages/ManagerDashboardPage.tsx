import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Calendar,
  Chart21,
  Clock,
  CloseCircle,
  Danger,
  People,
  Refresh2,
  TaskSquare,
  TickCircle,
  Timer1,
} from "iconsax-reactjs";
import { useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  approveTimeOffRequest,
  getTimeOffRequests,
  rejectTimeOffRequest,
} from "../../attendance/api/attendanceApi";
import type { TimeOffRequest } from "../../attendance/types";
import {
  getManagerDashboard,
  getManagerMembers,
} from "../api/dashboardApi";
import type {
  ManagerDashboard,
  ManagerMemberDetail,
  ManagerProjectSummary,
} from "../types";

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

const formatDate = (value: string | null | undefined) => {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
};

const getInitials = (firstName?: string, lastName?: string, fallback = "?") =>
  `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || fallback;

const getHealth = (project: ManagerProjectSummary) => {
  const progress = project.total_tasks > 0 ? project.done_tasks / project.total_tasks : 0;
  const isPastDeadline = Boolean(project.deadline && new Date(project.deadline).getTime() < Date.now());
  if (project.status.toLowerCase().includes("completed")) return { label: "Complete", tone: "success", progress: 1 };
  if (isPastDeadline && progress < 1) return { label: "Delayed", tone: "error", progress };
  if (progress < 0.35) return { label: "At risk", tone: "warning", progress };
  return { label: "On track", tone: "success", progress };
};

const panelClass = "madaar-surface overflow-hidden";
const spring = { type: "spring" as const, stiffness: 360, damping: 32, bounce: 0 };

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
  icon: ComponentType<any>;
  tone?: "primary" | "warning" | "success" | "secondary";
}) => (
  <motion.section whileHover={{ y: -2 }} transition={spring} className={`${panelClass} p-5`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-base-content/45">{label}</p>
        <p className="mt-3 text-3xl font-black tracking-tight text-base-content">{value}</p>
        <p className="mt-1 text-xs font-semibold text-base-content/45">{description}</p>
      </div>
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone === "warning" ? "bg-warning/10 text-warning" : tone === "success" ? "bg-success/10 text-success" : tone === "secondary" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}>
        <Icon size={21} />
      </span>
    </div>
  </motion.section>
);

const SectionHeading = ({ title, description, action }: { title: string; description: string; action?: ReactNode }) => (
  <div className="flex flex-col gap-3 px-5 pb-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h2 className="text-base font-black tracking-tight text-base-content">{title}</h2>
      <p className="mt-1 text-xs font-semibold text-base-content/45">{description}</p>
    </div>
    {action}
  </div>
);

const MemberRow = ({ member, maxTasks, workSeconds }: { member: ManagerMemberDetail; maxTasks: number; workSeconds: number }) => {
  const completion = member.total_tasks ? Math.round((member.done_tasks / member.total_tasks) * 100) : 0;
  const workload = maxTasks ? Math.round((member.total_tasks / maxTasks) * 100) : 0;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 border-t border-base-content/8 px-5 py-4 sm:grid-cols-[minmax(13rem,1.2fr)_minmax(12rem,1fr)_5rem_5rem] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">{getInitials(member.first_name, member.last_name, member.username?.[0]?.toUpperCase())}</div>
        <div className="min-w-0"><p className="truncate text-sm font-bold text-base-content">{member.first_name || member.username} {member.last_name}</p><p className="truncate text-xs text-base-content/40">@{member.username}</p></div>
      </div>
      <div><div className="mb-1 flex items-center justify-between text-[11px] font-bold text-base-content/45"><span>Workload</span><span>{member.total_tasks} tasks</span></div><div className="h-2 overflow-hidden rounded-full bg-base-200"><motion.div initial={{ width: 0 }} animate={{ width: `${workload}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full bg-primary" /></div></div>
      <div className="text-start sm:text-end"><p className="text-sm font-black text-base-content">{completion}%</p><p className="text-[10px] font-bold text-base-content/40">done</p></div>
      <div className="text-start sm:text-end"><p className={`text-sm font-black ${member.overdue_tasks > 0 ? "text-error" : "text-base-content"}`}>{member.overdue_tasks}</p><p className="text-[10px] font-bold text-base-content/40">overdue</p></div>
      <div className="col-span-full flex items-center gap-1 text-[11px] font-semibold text-base-content/40 sm:col-auto sm:justify-end"><Timer1 size={13} /> {formatHours(workSeconds)}</div>
    </motion.div>
  );
};

const ApprovalInbox = ({ requests, isLoading, onApprove, onReject, pendingId }: { requests: TimeOffRequest[]; isLoading: boolean; onApprove: (id: string | number) => void; onReject: (id: string | number) => void; pendingId: string | number | null }) => (
  <section className={panelClass}>
    <SectionHeading title="Approval inbox" description="Requests waiting for a decision" action={<span className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-black text-warning">{requests.length} pending</span>} />
    {isLoading ? <div className="space-y-3 px-5 pb-5">{[1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-base-200" />)}</div> : requests.length === 0 ? <div className="px-5 pb-6"><div className="rounded-2xl bg-success/10 p-4"><div className="flex items-center gap-2 text-sm font-black text-success"><TickCircle size={18} /> Inbox is clear</div><p className="mt-1 text-xs font-semibold text-base-content/45">No requests need your attention right now.</p></div></div> : <div className="divide-y divide-base-content/8">{requests.slice(0, 5).map(request => <div key={request.id} className="px-5 py-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-black text-secondary">{getInitials(request.user_detail?.first_name, request.user_detail?.last_name, request.user_detail?.username?.[0]?.toUpperCase())}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-base-content">{request.user_detail?.first_name || request.user_detail?.username || "Team member"}</p><p className="mt-0.5 text-xs font-semibold capitalize text-base-content/45">{request.request_type.replace("_", " ")} · {formatDate(request.start_datetime)}</p></div></div><span className="shrink-0 rounded-full bg-warning/10 px-2 py-1 text-[10px] font-black uppercase text-warning">Pending</span></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-base-content/55">{request.reason || "No reason provided."}</p><div className="mt-3 flex items-center gap-2"><button type="button" disabled={pendingId === request.id} onClick={() => onApprove(request.id)} className="motion-interactive inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-[11px] font-black text-success hover:bg-success/15 disabled:opacity-50"><TickCircle size={14} /> Approve</button><button type="button" disabled={pendingId === request.id} onClick={() => onReject(request.id)} className="motion-interactive inline-flex items-center gap-1.5 rounded-lg bg-error/10 px-3 py-1.5 text-[11px] font-black text-error hover:bg-error/15 disabled:opacity-50"><CloseCircle size={14} /> Decline</button></div></div>)}</div>}
  </section>
);

const ProjectHealth = ({ projects }: { projects: ManagerProjectSummary[] }) => (
  <section className={panelClass}>
    <SectionHeading title="Project health" description="Where attention may be needed next" action={<Link to="/tasks" className="motion-interactive inline-flex items-center gap-1 text-xs font-black text-primary">Open workspace <ArrowRight size={14} /></Link>} />
    {projects.length === 0 ? <div className="px-5 pb-6 text-sm font-semibold text-base-content/45">No active projects in this scope.</div> : <div className="grid gap-3 px-5 pb-5">{projects.slice(0, 6).map(project => { const health = getHealth(project); return <motion.div key={project.id} layout className="rounded-2xl border border-base-content/8 bg-base-200/50 p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-base-content">{project.name}</p><p className="mt-1 text-[11px] font-semibold text-base-content/40">Due {formatDate(project.deadline)} · {project.active_member_count} contributors</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${health.tone === "error" ? "bg-error/10 text-error" : health.tone === "warning" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{health.label}</span></div><div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-base-100"><div className={`h-full rounded-full ${health.tone === "error" ? "bg-error" : health.tone === "warning" ? "bg-warning" : "bg-success"}`} style={{ width: `${Math.round(health.progress * 100)}%` }} /></div><span className="text-xs font-black text-base-content/55">{Math.round(health.progress * 100)}%</span></div></motion.div>; })}</div>}
  </section>
);

const ManagerDashboardPage = () => {
  const queryClient = useQueryClient();
  const timezone = useMemo(getTimezone, []);
  const managerKey = ["manager-dashboard", timezone];
  const membersKey = ["manager-members", timezone];
  const approvalsKey = ["approval-inbox"];

  const dashboardQuery = useQuery<ManagerDashboard>({ queryKey: managerKey, queryFn: () => getManagerDashboard(null, timezone), staleTime: 30_000, refetchInterval: 60_000 });
  const membersQuery = useQuery<ManagerMemberDetail[]>({ queryKey: membersKey, queryFn: () => getManagerMembers(null, timezone), enabled: dashboardQuery.isSuccess, staleTime: 30_000 });
  const approvalQuery = useQuery<TimeOffRequest[]>({ queryKey: approvalsKey, queryFn: () => getTimeOffRequests({ status: "pending" }), enabled: dashboardQuery.isSuccess, staleTime: 15_000, refetchInterval: 60_000 });

  const approvalMutation = useMutation({
    mutationFn: ({ id, action }: { id: string | number; action: "approve" | "reject" }) => action === "approve" ? approveTimeOffRequest(id) : rejectTimeOffRequest(id, ""),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: approvalsKey });
      const previousRequests = queryClient.getQueryData<TimeOffRequest[]>(approvalsKey) || [];
      queryClient.setQueryData<TimeOffRequest[]>(approvalsKey, previousRequests.filter(request => request.id.toString() !== id.toString()));
      return { previousRequests };
    },
    onSuccess: (_data, variables) => toast.success(variables.action === "approve" ? "Request approved" : "Request declined"),
    onError: (error: any, _variables, context) => { if (context?.previousRequests) queryClient.setQueryData(approvalsKey, context.previousRequests); toast.error(error.response?.data?.detail || error.message || "Could not update request"); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: approvalsKey }),
  });

  const dashboard = dashboardQuery.data;
  const members = membersQuery.data || [];
  const workHours = dashboard?.work_hours || [];
  const maxTasks = Math.max(...members.map(member => member.total_tasks), 1);
  const workHoursByUser = new Map(workHours.map(member => [member.user_id.toString(), member.total_seconds]));
  const totalTasks = dashboard?.task_stats.reduce((total, item) => total + item.count, 0) || 0;
  const doneTasks = dashboard?.task_stats.filter(item => item.status_code?.toLowerCase() === "done").reduce((total, item) => total + item.count, 0) || 0;
  const atRiskProjects = dashboard?.project_summary.filter(project => ["error", "warning"].includes(getHealth(project).tone)).length || 0;
  const utilization = workHours.length && dashboard?.team_member_count ? Math.round(workHours.reduce((total, member) => total + Number(member.total_seconds || 0), 0) / (dashboard.team_member_count * 40 * 3600) * 100) : 0;
  const decisionCount = (dashboard?.overdue_summary.total_overdue || 0) + atRiskProjects + (approvalQuery.data?.length || 0);
  const isLoading = dashboardQuery.isLoading;

  if (isLoading) return <ManagerDashboardSkeleton />;

  if (dashboardQuery.isError || !dashboard) return <section className="mx-auto max-w-2xl py-14"><div className={`${panelClass} p-8 text-center`}><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 text-warning"><Danger size={24} /></div><h1 className="mt-4 text-xl font-black text-base-content">Manager access is required</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-base-content/55">This view is available to team leads, organization admins and owners. Your personal workspace is still available.</p><Link to="/dashboard" className="motion-interactive mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-primary-content">Go to today <ArrowRight size={15} /></Link></div></section>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-[1480px] space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><Chart21 size={15} /> Decision dashboard</div><h1 className="mt-2 text-3xl font-black tracking-tight text-base-content sm:text-4xl">See where the team needs you</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/55 sm:text-base">A calm view of workload, delivery risk and decisions waiting in your inbox.</p></div>
        <div className="flex flex-wrap items-center gap-2"><span className="inline-flex h-10 items-center gap-2 rounded-xl border border-base-content/10 bg-base-100 px-3 text-xs font-bold text-base-content/55"><Activity size={15} className="text-success" /> Live scope</span><button type="button" onClick={() => { void dashboardQuery.refetch(); void membersQuery.refetch(); void approvalQuery.refetch(); }} className="motion-interactive inline-flex h-10 items-center gap-2 rounded-xl border border-base-content/10 bg-base-100 px-3 text-xs font-bold text-base-content/60 hover:border-primary/30 hover:text-primary"><Refresh2 size={15} /> Refresh</button></div>
      </section>

      <section className={`${panelClass} flex flex-col gap-4 bg-gradient-to-br from-primary/[0.08] via-base-100 to-base-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}><div className="flex items-start gap-3"><div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-content"><Danger size={19} /></div><div><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Your decision queue</p><h2 className="mt-1 text-lg font-black text-base-content">{decisionCount === 0 ? "Everything looks steady" : `${decisionCount} signal${decisionCount === 1 ? "" : "s"} worth a look`}</h2><p className="mt-1 text-xs font-semibold text-base-content/50">{dashboard.overdue_summary.total_overdue} overdue tasks · {atRiskProjects} project risks · {approvalQuery.data?.length || 0} approvals</p></div></div><div className="flex items-center gap-2 text-xs font-bold text-base-content/50"><Calendar size={15} /> Updated just now</div></section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Team" value={dashboard.team_member_count} description="people in your scope" icon={People} tone="primary" /><MetricCard label="Open work" value={Math.max(0, totalTasks - doneTasks)} description={`${doneTasks} completed tasks`} icon={TaskSquare} tone="secondary" /><MetricCard label="Overdue" value={dashboard.overdue_summary.total_overdue} description="needs attention" icon={Danger} tone="warning" /><MetricCard label="Utilization" value={`${utilization}%`} description="based on weekly focus time" icon={Timer1} tone="success" /></section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.8fr)]"><section className={panelClass}><SectionHeading title="Team overview" description="A quick read on delivery and capacity" action={<span className="text-[11px] font-bold text-base-content/35">This week</span>} /><div className="hidden grid-cols-[minmax(13rem,1.2fr)_minmax(12rem,1fr)_5rem_5rem_6rem] gap-3 px-5 pb-2 text-[10px] font-black uppercase tracking-wider text-base-content/35 sm:grid"><span>Member</span><span>Workload</span><span className="text-end">Done</span><span className="text-end">Risk</span><span className="text-end">Focus</span></div>{members.length === 0 ? <div className="px-5 pb-6 text-sm font-semibold text-base-content/45">No team members are visible in this scope.</div> : <div>{members.slice(0, 8).map(member => <MemberRow key={member.id} member={member} maxTasks={maxTasks} workSeconds={workHoursByUser.get(member.id.toString()) || member.week_seconds || 0} />)}</div>}</section><ApprovalInbox requests={approvalQuery.data || []} isLoading={approvalQuery.isLoading} pendingId={approvalMutation.isPending ? approvalMutation.variables?.id || null : null} onApprove={id => approvalMutation.mutate({ id, action: "approve" })} onReject={id => approvalMutation.mutate({ id, action: "reject" })} /></section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"><WorkloadPanel dashboard={dashboard} /><ProjectHealth projects={dashboard.project_summary} /></section>
    </motion.div>
  );
};

const WorkloadPanel = ({ dashboard }: { dashboard: ManagerDashboard }) => {
  const total = Math.max(dashboard.task_stats.reduce((sum, stat) => sum + stat.count, 0), 1);
  const palette = ["bg-primary", "bg-secondary", "bg-warning", "bg-success", "bg-error"];
  return <section className={panelClass}><SectionHeading title="Workload" description="How active work is distributed by status" action={<span className="inline-flex items-center gap-1 text-[11px] font-bold text-base-content/35"><Clock size={13} /> {formatHours(dashboard.work_hours.reduce((sum, item) => sum + Number(item.total_seconds || 0), 0))} logged</span>} /><div className="px-5 pb-6"><div className="flex h-3 overflow-hidden rounded-full bg-base-200">{dashboard.task_stats.map((stat, index) => <motion.div key={`${stat.status_code}-${index}`} initial={{ width: 0 }} animate={{ width: `${(stat.count / total) * 100}%` }} transition={{ duration: 0.7, delay: index * 0.06 }} className={`${palette[index % palette.length]} min-w-1`} />)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2">{dashboard.task_stats.map((stat, index) => <div key={`${stat.status_code}-legend`} className="flex items-center justify-between rounded-xl bg-base-200/60 px-3 py-2.5"><div className="flex min-w-0 items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${palette[index % palette.length]}`} /><span className="truncate text-xs font-bold text-base-content/60">{stat.status_name || stat.status_code || "Unsorted"}</span></div><span className="text-sm font-black text-base-content">{stat.count}</span></div>)}</div></div></section>;
};

const ManagerDashboardSkeleton = () => <div className="mx-auto max-w-[1480px] animate-pulse space-y-6"><div className="h-28 rounded-3xl bg-base-100" /><div className="h-28 rounded-3xl bg-base-100" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-32 rounded-2xl bg-base-100" />)}</div><div className="grid gap-5 xl:grid-cols-2"><div className="h-[30rem] rounded-2xl bg-base-100" /><div className="h-[30rem] rounded-2xl bg-base-100" /></div></div>;

export default ManagerDashboardPage;
