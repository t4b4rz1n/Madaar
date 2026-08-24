import { createPortal } from "react-dom";
import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar1,
  CloseCircle,
  Message,
  More,
  Play,
  Profile2User,
  Stop,
  TaskSquare,
  TickCircle,
  Trash,
} from "iconsax-reactjs";
import { toast } from "sonner";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import { deleteTask, getProjectMembers, updateTask } from "../api/tasksApi";
import { useTaskStore } from "../store/useTaskStore";
import type { Task } from "../types";
import type { TimeLog } from "../../attendance/types";
import { LiveActivityIndicator } from "./LiveActivityIndicator";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onPlayTimer?: (taskId: string | number) => void;
  onStopTimer?: (taskId: string | number) => void;
  onMarkDone?: (taskId: string | number) => void;
  onToggleDone?: (taskId: string | number) => void;
  activeTimer?: TimeLog | null;
}

const priorityPill: Record<Task["priority"], { label: string; bg: string; text: string; dot: string }> = {
  low:      { label: "Low",      bg: "bg-base-200/70",        text: "text-base-content/50", dot: "bg-base-content/30" },
  medium:   { label: "Medium",   bg: "bg-blue-500/10",        text: "text-blue-600",        dot: "bg-blue-500" },
  high:     { label: "High",     bg: "bg-amber-500/10",       text: "text-amber-600",       dot: "bg-amber-500" },
  critical: { label: "Critical", bg: "bg-red-500/10",         text: "text-red-500",         dot: "bg-red-500" },
};

const priorityLeftBorder: Record<Task["priority"], string> = {
  low:      "#e2e8f0",
  medium:   "#93c5fd",
  high:     "#fde047",
  critical: "#fca5a5",
};

const formatDate = (value?: string) => {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onClick,
  onPlayTimer,
  onStopTimer,
  onMarkDone,
  onToggleDone,
  activeTimer,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMembersMenu, setShowMembersMenu] = useState(false);
  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const assigneeTriggerRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();

  const isActuallyDone = Boolean(task.is_finished);
  const isOverdue = Boolean(
    task.due_date && new Date(task.due_date).getTime() < Date.now() && !isActuallyDone
  );

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.detail || "Could not delete task."),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Task>) => updateTask(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["taskActivities", task.id] });
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.detail || "Could not update task."),
  });

  const storeProjectId = useTaskStore((state) => state.activeProjectId);
  const effectiveProjectId = task.project || storeProjectId;

  const { data: users = [] } = useQuery({
    queryKey: ["projectMembers", effectiveProjectId],
    queryFn: async () => {
      if (!effectiveProjectId) return [];
      const members = await getProjectMembers(effectiveProjectId.toString());
      return (members || [])
        .map((member: any) => member?.user || member)
        .filter((u: any) => Boolean(u && u.id));
    },
    enabled: Boolean(effectiveProjectId),
    staleTime: 30_000,
  });

  const closeMenu = () => {
    setIsMenuOpen(false);
    setShowMembersMenu(false);
    setIsAssigneePopoverOpen(false);
  };

  const initials = task.assignee_detail
    ? `${task.assignee_detail.first_name?.[0] || ""}${task.assignee_detail.last_name?.[0] || ""}`.toUpperCase() ||
      task.assignee_detail.username?.[0]?.toUpperCase()
    : "";

  const checklist = task.checklist_stats;
  const progress = checklist?.total
    ? checklist.percent ?? Math.round((checklist.done / checklist.total) * 100)
    : task.progress_percent || 0;

  const timerBelongsToTask = Boolean(
    activeTimer && activeTimer.task.toString() === task.id.toString()
  );
  const timerIsRunning = Boolean(task.is_active_timer_running || timerBelongsToTask);
  const [now, setNow] = useState(Date.now());
  const [localStartedAt, setLocalStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!timerIsRunning) {
      setLocalStartedAt(null);
      return undefined;
    }
    setLocalStartedAt((prev) => prev || Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timerIsRunning]);

  const elapsedSeconds = timerBelongsToTask && activeTimer
    ? Math.max(
        0,
        Math.floor((now - new Date(activeTimer.start_time).getTime()) / 1000) +
          Number(activeTimer.duration_seconds || 0)
      )
    : timerIsRunning && localStartedAt
    ? Number(task.spent_seconds || 0) + Math.max(0, Math.floor((now - localStartedAt) / 1000))
    : Number(task.spent_seconds || 0);

  const formattedElapsed = [
    Math.floor(elapsedSeconds / 3600),
    Math.floor((elapsedSeconds % 3600) / 60),
    elapsedSeconds % 60,
  ]
    .map((part) => part.toString().padStart(2, "0"))
    .join(":");

  const prio = priorityPill[task.priority];

  return (
    <>
      <article
        onClick={onClick}
        className={`group relative cursor-pointer rounded-2xl border bg-base-100 p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
          isOverdue
            ? "border-red-500/30"
            : task.is_blocked
            ? "border-amber-500/30"
            : "border-base-content/8 hover:border-base-content/20"
        } ${isActuallyDone ? "opacity-60" : ""}`}
        style={{
          borderLeftWidth: "3px",
          borderLeftColor: priorityLeftBorder[task.priority],
        }}
        aria-label={`Open task ${task.key}: ${task.title}`}
      >
        {/* Loading overlay */}
        {(updateMutation.isPending || deleteMutation.isPending) && (
          <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-base-100/75 backdrop-blur-[2px]">
            <span className="loading loading-spinner loading-sm text-primary" />
          </div>
        )}

        {/* ─── Top Header: Key + Actions ─── */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-bold text-base-content/40 tracking-wider">
            {task.key}
          </span>

          <button
            ref={menuTriggerRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(true);
            }}
            className="grid size-6 place-items-center rounded-lg text-base-content/35 opacity-100 transition hover:bg-base-200 hover:text-base-content sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={`Actions for ${task.title}`}
          >
            <More size={15} />
          </button>
        </div>

        {/* ─── Title & Checkbox (Inline with dir="auto") ─── */}
        <div className="mt-2 flex items-start gap-2.5" dir="auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              (onToggleDone || onMarkDone)?.(task.id);
            }}
            className={`mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-md transition ${
              isActuallyDone
                ? "bg-emerald-500 text-white"
                : "border border-base-content/25 hover:border-emerald-500 hover:bg-emerald-500/10"
            }`}
            title={isActuallyDone ? "Mark incomplete" : "Mark done"}
          >
            {isActuallyDone && <TickCircle size={13} variant="Bold" />}
          </button>

          <div className="min-w-0 flex-1">
            <h3
              dir="auto"
              className={`text-[13px] font-semibold leading-snug ${
                isActuallyDone
                  ? "text-base-content/40 line-through"
                  : "text-base-content"
              }`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p
                dir="auto"
                className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-base-content/45"
              >
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* ─── Meta Info Row ─── */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-base-content/45">
          {/* Priority Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${prio.bg} ${prio.text}`}
          >
            <span className={`size-1.5 rounded-full ${prio.dot}`} />
            {prio.label}
          </span>

          {task.is_blocked && (
            <span className="rounded-md bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold text-amber-600">
              Blocked
            </span>
          )}

          {isOverdue && (
            <span className="rounded-md bg-red-500/12 px-2 py-0.5 text-[10px] font-bold text-red-500">
              Overdue
            </span>
          )}

          {task.due_date && (
            <span
              className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${
                isOverdue ? "bg-red-500/10 text-red-500 font-bold" : "bg-base-200/60"
              }`}
            >
              <Calendar1 size={12} />
              {formatDate(task.due_date)}
            </span>
          )}

          {checklist?.total ? (
            <span className="flex items-center gap-1 rounded-md bg-base-200/60 px-1.5 py-0.5 font-medium">
              <TaskSquare size={12} />
              {checklist.done}/{checklist.total}
            </span>
          ) : null}

          {Boolean(task.comments_count) && (
            <span className="flex items-center gap-1 rounded-md bg-base-200/60 px-1.5 py-0.5 font-medium">
              <Message size={12} />
              {task.comments_count}
            </span>
          )}
        </div>

        {/* Checklist progress bar */}
        {checklist?.total ? (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-base-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress === 100 ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        ) : null}

        {/* ─── Footer: Assignee Avatar & Timer ─── */}
        <div className="mt-3 flex items-center justify-between border-t border-base-content/6 pt-2">
          {/* Assignee Interactive Trigger (Avatar Icon Only) */}
          <button
            ref={assigneeTriggerRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAssigneePopoverOpen(!isAssigneePopoverOpen);
            }}
            className="rounded-full p-0.5 hover:ring-2 hover:ring-primary/30 transition"
            title={
              task.assignee_detail
                ? `Assigned to ${task.assignee_detail.first_name || task.assignee_detail.username}`
                : "Assign member"
            }
          >
            <div className="relative shrink-0">
              <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary shadow-xs">
                {task.assignee_detail?.avatar_url || task.assignee_detail?.avatar ? (
                  <img
                    src={
                      task.assignee_detail.avatar_url ||
                      task.assignee_detail.avatar
                    }
                    alt=""
                    className="size-6 rounded-full object-cover"
                  />
                ) : (
                  initials || <Profile2User size={12} className="text-base-content/45" />
                )}
              </span>

              {task.project && (
                <div className="absolute -bottom-1 -right-1 z-10">
                  <LiveActivityIndicator
                    projectId={task.project.toString()}
                    taskId={task.id}
                  />
                </div>
              )}
            </div>
          </button>

          {/* Timer controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {timerIsRunning && (
              <span className="font-mono text-[10px] font-bold tabular-nums text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                {formattedElapsed}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (timerIsRunning) onStopTimer?.(task.id);
                else onPlayTimer?.(task.id);
              }}
              className={`grid size-6.5 place-items-center rounded-lg transition ${
                timerIsRunning
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  : "bg-base-200/80 text-base-content/45 hover:bg-primary/10 hover:text-primary"
              }`}
              title={timerIsRunning ? "Stop timer" : "Start timer"}
            >
              {timerIsRunning ? <Stop size={13} /> : <Play size={13} />}
            </button>
          </div>
        </div>
      </article>

      {/* ─── Direct Assignee Quick Select Popover Portal ─── */}
      {isAssigneePopoverOpen &&
        assigneeTriggerRef.current &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={closeMenu} />
            <div
              className="fixed z-50 w-48 max-h-60 overflow-y-auto rounded-2xl border border-base-content/10 bg-base-100 p-1.5 text-[12px] font-semibold text-base-content shadow-2xl animate-in fade-in zoom-in-95 duration-100"
              style={{
                top: assigneeTriggerRef.current.getBoundingClientRect().bottom + 4,
                left: assigneeTriggerRef.current.getBoundingClientRect().left,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[10px] font-bold text-base-content/40 uppercase tracking-wider">
                Assign to
              </div>

              {/* Unassigned Option */}
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                  !task.assignee ? "bg-primary/10 text-primary font-bold" : "hover:bg-base-200"
                }`}
                onClick={() => {
                  updateMutation.mutate({ assignee: undefined });
                  closeMenu();
                }}
              >
                <Profile2User size={14} className="text-base-content/40" />
                <span>Unassigned</span>
              </button>

              {/* Users List */}
              {users.map((user: any) => {
                const isSelected = String(task.assignee) === String(user.id);
                return (
                  <button
                    type="button"
                    key={user.id}
                    className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                      isSelected
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-base-200"
                    }`}
                    onClick={() => {
                      updateMutation.mutate({ assignee: user.id });
                      closeMenu();
                    }}
                  >
                    <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary shrink-0">
                      {user.first_name?.[0] || user.username?.[0] || "?"}
                    </span>
                    <span className="truncate">
                      {user.first_name
                        ? `${user.first_name} ${user.last_name || ""}`
                        : user.username || user.email}
                    </span>
                  </button>
                );
              })}

              {users.length === 0 && (
                <div className="px-2 py-2 text-[11px] text-base-content/40">
                  No members found
                </div>
              )}
            </div>
          </>,
          document.body
        )}

      {/* Dropdown Menu Portal */}
      {isMenuOpen &&
        menuTriggerRef.current &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={closeMenu} />
            <div
              className="fixed z-50 w-52 rounded-2xl border border-base-content/10 bg-base-100 p-1.5 text-[12px] font-semibold text-base-content shadow-2xl animate-in fade-in zoom-in-95 duration-100"
              style={{
                top: menuTriggerRef.current.getBoundingClientRect().bottom + 4,
                left: menuTriggerRef.current.getBoundingClientRect().right - 208,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {showMembersMenu ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowMembersMenu(false)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-base-content/50 hover:bg-base-200"
                  >
                    <CloseCircle size={15} /> Back
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 hover:bg-base-200"
                    onClick={() => {
                      updateMutation.mutate({ assignee: undefined });
                      closeMenu();
                    }}
                  >
                    <Profile2User size={15} /> Unassigned
                  </button>
                  {users.map((user: any) => (
                    <button
                      type="button"
                      key={user.id}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-base-200"
                      onClick={() => {
                        updateMutation.mutate({ assignee: user.id });
                        closeMenu();
                      }}
                    >
                      <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-[9px] text-primary">
                        {user.first_name?.[0] || user.username?.[0] || "?"}
                      </span>
                      <span className="truncate">
                        {user.first_name
                          ? `${user.first_name} ${user.last_name || ""}`
                          : user.username || user.email}
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-base-200"
                    onClick={() => {
                      closeMenu();
                      onClick();
                    }}
                  >
                    <TaskSquare size={15} className="text-primary" /> Open task sheet
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-base-200"
                    onClick={() => setShowMembersMenu(true)}
                  >
                    <Profile2User size={15} className="text-base-content/50" /> Change assignee
                  </button>
                  <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 hover:bg-base-200">
                    <Calendar1 size={15} className="text-base-content/50" />
                    <span className="flex-1">Due date</span>
                    <input
                      type="date"
                      value={task.due_date ? task.due_date.slice(0, 10) : ""}
                      onChange={(e) => {
                        updateMutation.mutate({
                          due_date: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : undefined,
                        });
                        closeMenu();
                      }}
                      className="w-3 opacity-0"
                    />
                  </label>
                  <div className="my-1 h-px bg-base-content/8" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-red-500 hover:bg-red-50"
                    onClick={() => {
                      closeMenu();
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    <Trash size={15} /> Delete task
                  </button>
                </>
              )}
            </div>
          </>,
          document.body
        )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          setIsDeleteModalOpen(false);
          deleteMutation.mutate();
        }}
        title="Delete task?"
        message={`This will remove "${task.title}" from the workspace.`}
      />
    </>
  );
};
