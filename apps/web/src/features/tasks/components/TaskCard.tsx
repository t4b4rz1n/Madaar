import { createPortal } from "react-dom";
import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar1, CloseCircle, More, Play, Profile2User, Stop, TaskSquare, TickCircle, Trash } from "iconsax-reactjs";
import { toast } from "sonner";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import { deleteTask, getProjectMembers, updateTask } from "../api/tasksApi";
import type { Task } from "../types";
import type { TimeLog } from "../../attendance/types";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onPlayTimer?: (taskId: string | number) => void;
  onStopTimer?: (taskId: string | number) => void;
  onMarkDone?: (taskId: string | number) => void;
  onToggleDone?: (taskId: string | number) => void;
  activeTimer?: TimeLog | null;
}

const priorityTone: Record<Task["priority"], string> = {
  low: "bg-base-200 text-base-content/55",
  medium: "bg-info/10 text-info",
  high: "bg-warning/12 text-warning",
  critical: "bg-error/10 text-error",
};

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value)) : null;

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onPlayTimer, onStopTimer, onMarkDone, onToggleDone, activeTimer }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMembersMenu, setShowMembersMenu] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const isActuallyDone = Boolean(task.is_finished);
  const isOverdue = Boolean(task.due_date && new Date(task.due_date).getTime() < Date.now() && !isActuallyDone);

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Task deleted"); },
    onError: (error: any) => toast.error(error.response?.data?.detail || "Could not delete the task."),
  });
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Task>) => updateTask(task.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); queryClient.invalidateQueries({ queryKey: ["taskActivities", task.id] }); },
    onError: (error: any) => toast.error(error.response?.data?.detail || "Could not update the task."),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["projectMembers", task.project],
    queryFn: async () => { if (!task.project) return []; const members = await getProjectMembers(task.project.toString()); return members.map((member: any) => member.user).filter(Boolean); },
    enabled: Boolean(task.project && (isMenuOpen || showMembersMenu)),
    staleTime: 30_000,
  });

  const closeMenu = () => { setIsMenuOpen(false); setShowMembersMenu(false); };
  const initials = task.assignee_detail ? `${task.assignee_detail.first_name?.[0] || ""}${task.assignee_detail.last_name?.[0] || ""}`.toUpperCase() || task.assignee_detail.username?.[0]?.toUpperCase() : "";
  const checklist = task.checklist_stats;
  const progress = checklist?.total ? checklist.percent ?? Math.round((checklist.done / checklist.total) * 100) : task.progress_percent || 0;
  const timerBelongsToTask = Boolean(activeTimer && activeTimer.task.toString() === task.id.toString());
  const timerIsRunning = Boolean(task.is_active_timer_running || timerBelongsToTask);
  const [now, setNow] = useState(Date.now());
  const [localStartedAt, setLocalStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!timerIsRunning) {
      setLocalStartedAt(null);
      return undefined;
    }
    setLocalStartedAt((previous) => previous || Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timerIsRunning]);

  const elapsedSeconds = timerBelongsToTask && activeTimer
    ? Math.max(0, Math.floor((now - new Date(activeTimer.start_time).getTime()) / 1000) + Number(activeTimer.duration_seconds || 0))
    : timerIsRunning && localStartedAt
      ? Number(task.spent_seconds || 0) + Math.max(0, Math.floor((now - localStartedAt) / 1000))
    : Number(task.spent_seconds || 0);
  const formattedElapsed = [Math.floor(elapsedSeconds / 3600), Math.floor((elapsedSeconds % 3600) / 60), elapsedSeconds % 60]
    .map((part) => part.toString().padStart(2, "0")).join(":");

  return <>
    <article onClick={onClick} className={`group relative cursor-pointer rounded-2xl border bg-base-100 p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-base-content/5 ${isOverdue ? "border-error/30" : task.is_blocked ? "border-warning/35" : "border-base-content/10 hover:border-primary/25"}`} aria-label={`Open task ${task.key}: ${task.title}`}>
      {(updateMutation.isPending || deleteMutation.isPending) && <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-base-100/75 backdrop-blur-[2px]"><span className="loading loading-spinner loading-sm text-primary" /></div>}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2"><button type="button" onClick={(event) => { event.stopPropagation(); (onToggleDone || onMarkDone)?.(task.id); }} className={`grid size-5 shrink-0 place-items-center rounded-full transition ${isActuallyDone ? "text-success hover:opacity-80" : "border border-base-content/20 text-transparent hover:border-success/50 hover:bg-success/10"}`} aria-label={isActuallyDone ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as done`} title={isActuallyDone ? "Click to mark as incomplete" : "Click to mark as done"}>{isActuallyDone && <TickCircle size={17} variant="Bulk" />}</button><span className="truncate text-[11px] font-bold tracking-wide text-base-content/40">{task.key}</span></div>
        <button ref={menuTriggerRef} type="button" onClick={(event) => { event.stopPropagation(); setIsMenuOpen(true); }} className="rounded-lg p-1 text-base-content/35 opacity-100 transition hover:bg-base-200 hover:text-base-content sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Actions for ${task.title}`}><More size={17} /></button>
      </div>

      <h3 dir="auto" className={`mt-2 line-clamp-3 text-[13px] font-semibold leading-5 ${isActuallyDone ? "text-base-content/45 line-through decoration-base-content/25" : "text-base-content"}`}>{task.title}</h3>
      {task.description && <p dir="auto" className="mt-2 line-clamp-2 text-[11px] leading-4 text-base-content/45">{task.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-1.5"><span className={`rounded-md px-2 py-1 text-[10px] font-bold capitalize ${priorityTone[task.priority]}`}>{task.priority}</span>{task.is_blocked && <span className="rounded-md bg-warning/12 px-2 py-1 text-[10px] font-bold text-warning">Blocked</span>}{isOverdue && <span className="rounded-md bg-error/10 px-2 py-1 text-[10px] font-bold text-error">Overdue</span>}</div>

      {checklist?.total ? <div className="mt-3"><div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-base-content/45"><span className="flex items-center gap-1"><TaskSquare size={12} /> Checklist</span><span>{checklist.done}/{checklist.total}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-base-200"><div className={`h-full rounded-full ${progress === 100 ? "bg-success" : "bg-primary"}`} style={{ width: `${Math.min(100, progress)}%` }} /></div></div> : null}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-base-content/8 pt-3"><div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-base-content/45">{task.due_date && <span className={`inline-flex items-center gap-1 ${isOverdue ? "text-error" : ""}`}><Calendar1 size={13} />{formatDate(task.due_date)}</span>}{task.comments_count ? <span>{task.comments_count} comments</span> : null}</div><div className="flex items-center gap-1.5"><span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary" title={task.assignee_detail ? `Assigned to ${task.assignee_detail.username}` : "Unassigned"}>{task.assignee_detail?.avatar_url || task.assignee_detail?.avatar ? <img src={task.assignee_detail.avatar_url || task.assignee_detail.avatar} alt="" loading="lazy" className="size-6 rounded-full object-cover" /> : initials || <Profile2User size={13} />}</span>{timerIsRunning && <span className="font-mono text-[10px] font-bold tabular-nums text-success">{formattedElapsed}</span>}<button type="button" onClick={(event) => { event.stopPropagation(); if (timerIsRunning) onStopTimer?.(task.id); else onPlayTimer?.(task.id); }} className={`grid size-7 place-items-center rounded-lg transition ${timerIsRunning ? "bg-error/10 text-error" : "bg-base-200 text-base-content/45 hover:bg-primary/10 hover:text-primary"}`} aria-label={timerIsRunning ? `Stop timer for ${task.title}` : `Start timer for ${task.title}`}>{timerIsRunning ? <Stop size={14} /> : <Play size={14} />}</button></div></div>

      {isMenuOpen && menuTriggerRef.current && createPortal(<><div className="fixed inset-0 z-40" onClick={closeMenu} /><div className="fixed z-50 w-56 rounded-2xl border border-base-content/10 bg-base-100 p-1.5 text-[12px] font-semibold text-base-content shadow-2xl" style={{ top: menuTriggerRef.current.getBoundingClientRect().bottom + 5, left: menuTriggerRef.current.getBoundingClientRect().right - 224 }} onClick={(event) => event.stopPropagation()}>{showMembersMenu ? <><button type="button" onClick={() => setShowMembersMenu(false)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-base-content/50 hover:bg-base-200"><CloseCircle size={15} /> Back</button><button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 hover:bg-base-200" onClick={() => { updateMutation.mutate({ assignee: undefined }); closeMenu(); }}><Profile2User size={15} /> Unassigned</button>{users.map((user: any) => <button type="button" key={user.id} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-base-200" onClick={() => { updateMutation.mutate({ assignee: user.id }); closeMenu(); }}><span className="grid size-5 place-items-center rounded-full bg-primary/10 text-[9px] text-primary">{user.first_name?.[0] || user.username?.[0] || "?"}</span><span className="truncate">{user.full_name || user.username || user.email}</span></button>)}</> : <><button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-base-200" onClick={() => { closeMenu(); onClick(); }}><TaskSquare size={15} className="text-primary" /> Open task</button><button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-base-200" onClick={() => setShowMembersMenu(true)}><Profile2User size={15} className="text-base-content/50" /> Change assignee</button><label className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 hover:bg-base-200"><Calendar1 size={15} className="text-base-content/50" /> <span className="flex-1">Due date</span><input type="date" value={task.due_date ? task.due_date.slice(0, 10) : ""} onChange={(event) => { updateMutation.mutate({ due_date: event.target.value ? new Date(event.target.value).toISOString() : undefined }); closeMenu(); }} className="w-3 opacity-0" /></label><button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-error hover:bg-error/10" onClick={() => { closeMenu(); setIsDeleteModalOpen(true); }}><Trash size={15} /> Delete task</button></>}</div></>, document.body)}
    </article>
    <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={() => { setIsDeleteModalOpen(false); deleteMutation.mutate(); }} title="Delete task?" message={`This will remove “${task.title}” from the workspace.`} />
  </>;
};
