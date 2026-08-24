import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Add,
  Calendar,
  CloseSquare,
  Danger,
  Message,
  Paperclip2,
  Play,
  Profile2User,
  Send2,
  Stop,
  TaskSquare,
  TickCircle,
  Trash,
} from "iconsax-reactjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TimeLog } from "../../attendance/types";
import type { Task } from "../types";
import { getProjectMembers } from "../../projects/api/projectsApi";
import { createManualLog } from "../../attendance/api/attendanceApi";
import {
  addChecklistItem,
  addComment,
  deleteChecklistItem,
  getTaskActivities,
  getTaskChecklists,
  getTaskComments,
  markTaskBlocked,
  toggleChecklistItem,
  updateTask,
} from "../api/tasksApi";

interface TaskSheetProps {
  task: Task | null;
  onClose: () => void;
  onPatch: (taskId: string | number, patch: Partial<Task>) => void;
  onPlayTimer?: (taskId: string | number) => void;
  onStopTimer?: (taskId: string | number) => void;
  activeTimer?: TimeLog | null;
  focusMode?: boolean;
}

const spring = { type: "spring" as const, stiffness: 420, damping: 38, bounce: 0 };

const formatTime = (seconds?: number) => {
  const value = Math.max(0, Math.round(Number(seconds || 0)));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  return [hours, minutes, secs].map((part) => part.toString().padStart(2, "0")).join(":");
};

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "No due date";

const formatRelativeDate = (value: string) => {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
};

const initials = (firstName?: string, lastName?: string, username?: string) => {
  const value = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  return value || username?.[0]?.toUpperCase() || "U";
};

const priorityConfig: Record<Task["priority"], { label: string; color: string; bg: string }> = {
  low:      { label: "Low Priority",      color: "#94a3b8", bg: "bg-slate-500/10 text-slate-600" },
  medium:   { label: "Medium Priority",   color: "#3b82f6", bg: "bg-blue-500/10 text-blue-600" },
  high:     { label: "High Priority",     color: "#f59e0b", bg: "bg-amber-500/10 text-amber-600" },
  critical: { label: "Critical Priority", color: "#ef4444", bg: "bg-red-500/10 text-red-500" },
};

export const TaskSheet: React.FC<TaskSheetProps> = ({
  task,
  onClose,
  onPatch,
  onPlayTimer,
  onStopTimer,
  activeTimer,
  focusMode = false,
}) => {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority || "low");

  const toLocalDatetimeInput = (isoString?: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const [dueDate, setDueDate] = useState(task?.due_date ? toLocalDatetimeInput(task.due_date) : "");
  const [commentText, setCommentText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [checklistText, setChecklistText] = useState("");
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "comments" | "activity">("overview");
  const [isManualTimeOpen, setIsManualTimeOpen] = useState(false);
  const [manualHours, setManualHours] = useState("0");
  const [manualMinutes, setManualMinutes] = useState("0");
  const [now, setNow] = useState(Date.now());

  const taskId = task?.id;
  const timerBelongsToTask = Boolean(
    activeTimer &&
      task &&
      (activeTimer.task?.toString() ??
        (activeTimer as { task_id?: string | number }).task_id?.toString()) === task.id.toString()
  );
  const timerIsRunning = Boolean(task && (task.is_active_timer_running || timerBelongsToTask));

  const { data: checklists = [], isLoading: isChecklistLoading } = useQuery({
    queryKey: ["taskChecklists", taskId],
    queryFn: () => getTaskChecklists(taskId!),
    enabled: Boolean(taskId),
  });

  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ["taskComments", taskId],
    queryFn: () => getTaskComments(taskId!),
    enabled: Boolean(taskId),
  });

  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: ["taskActivities", taskId],
    queryFn: () => getTaskActivities(taskId!),
    enabled: Boolean(taskId),
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["projectMembers", task?.project],
    queryFn: () => getProjectMembers(task!.project!),
    enabled: Boolean(task?.project),
  });

  const manualTimeMutation = useMutation({
    mutationFn: (data: { hours: number; minutes: number }) => {
      const end_time = new Date().toISOString();
      const start_time = new Date(
        Date.now() - (data.hours * 3600 + data.minutes * 60) * 1000
      ).toISOString();
      return createManualLog({
        task: taskId!,
        project: task!.project,
        start_time,
        end_time,
      });
    },
    onSuccess: () => {
      toast.success("Manual time logged");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["standup-grid"] });
      setIsManualTimeOpen(false);
      setManualHours("0");
      setManualMinutes("0");
    },
    onError: (error: any) =>
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "Failed to log manual time"
      ),
  });

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || "");
    setIsEditingDescription(Boolean(task.description));
    setPriority(task.priority || "low");
    setDueDate(task.due_date ? toLocalDatetimeInput(task.due_date) : "");
    setActiveTab("overview");
  }, [task]);

  useEffect(() => {
    if (isManualTimeOpen && task) {
      const total = Number(task.spent_hours || 0);
      const h = Math.floor(total);
      const m = Math.round((total - h) * 60);
      setManualHours(String(h));
      setManualMinutes(String(m));
    }
  }, [isManualTimeOpen, task?.spent_hours]);

  useEffect(() => {
    if (!timerIsRunning) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timerIsRunning]);

  useEffect(() => {
    if (!task) return;
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector =
      "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href]";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [task, onClose]);

  const invalidateTaskDetails = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["taskChecklists", taskId] });
    queryClient.invalidateQueries({ queryKey: ["taskComments", taskId] });
    queryClient.invalidateQueries({ queryKey: ["taskActivities", taskId] });
  };

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Task>) => updateTask(task!.id, patch),
    onSuccess: invalidateTaskDetails,
    onError: (error: any) =>
      toast.error(error.response?.data?.detail || error.message || "Could not update task."),
  });

  const blockerMutation = useMutation({
    mutationFn: (blocked: boolean) => markTaskBlocked(task!.id, blocked),
    onMutate: (blocked) => onPatch(task!.id, { is_blocked: blocked }),
    onSuccess: invalidateTaskDetails,
    onError: (error: any, blocked) => {
      onPatch(task!.id, { is_blocked: !blocked });
      toast.error(error.response?.data?.detail || error.message || "Could not update blocker state.");
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => addComment(task!.id, commentText.trim(), selectedFile || undefined),
    onSuccess: () => {
      setCommentText("");
      setSelectedFile(null);
      invalidateTaskDetails();
      toast.success("Comment added");
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.detail || error.message || "Could not add comment."),
  });

  const checklistAddMutation = useMutation({
    mutationFn: (value: string) => addChecklistItem(task!.id, value),
    onSuccess: () => {
      setChecklistText("");
      invalidateTaskDetails();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.detail || error.message || "Could not add checklist item."),
  });

  const checklistToggleMutation = useMutation({
    mutationFn: ({ id, completed: _completed }: { id: string | number; completed: boolean }) =>
      toggleChecklistItem(id),
    onSuccess: invalidateTaskDetails,
    onError: (error: any) =>
      toast.error(error.response?.data?.detail || error.message || "Could not update checklist item."),
  });

  const checklistDeleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteChecklistItem(id),
    onSuccess: invalidateTaskDetails,
    onError: (error: any) =>
      toast.error(error.response?.data?.detail || error.message || "Could not delete checklist item."),
  });

  const save = (patch: Partial<Task>) => {
    onPatch(task!.id, patch);
    updateMutation.mutate(patch);
  };

  const elapsedSeconds = useMemo(() => {
    if (!task) return 0;
    if (timerBelongsToTask && activeTimer) {
      const startedAt = new Date(activeTimer.start_time).getTime();
      return Math.max(
        0,
        Math.floor((now - startedAt) / 1000) + Number(activeTimer.duration_seconds || 0)
      );
    }
    return Number(task.spent_seconds || 0);
  }, [activeTimer, now, task, timerBelongsToTask]);

  if (!task) return null;

  const checklistDone = checklists.filter((item) => item.is_completed).length;
  const checklistProgress = checklists.length
    ? Math.round((checklistDone / checklists.length) * 100)
    : 0;
  const assignee = task.assignee_detail;
  const isBusy = updateMutation.isPending || blockerMutation.isPending;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.aside
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Task details: ${task.title}`}
          className="absolute inset-y-0 end-0 flex w-full max-w-2xl flex-col rounded-s-3xl border-s border-base-content/10 bg-base-100 shadow-2xl"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={spring}
        >
          {/* ─── Top Bar: Context Breadcrumb + Close ─── */}
          <header className="flex shrink-0 items-center justify-between border-b border-base-content/6 px-6 py-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-base-content/50">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono font-bold text-primary">
                {task.key}
              </span>
              <span>·</span>
              <span className="rounded-full bg-base-200 px-2.5 py-0.5 text-[11px] font-semibold text-base-content/60">
                {task.status_detail?.name || "No status"}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-base-content/40 transition hover:bg-base-200 hover:text-base-content"
              aria-label="Close task sheet"
            >
              <CloseSquare size={20} />
            </button>
          </header>

          {/* ─── Main Title (Prominent at top) ─── */}
          <div className="px-6 pt-5 pb-2">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() =>
                title.trim() && title.trim() !== task.title && save({ title: title.trim() })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              dir="auto"
              className="w-full bg-transparent text-2xl font-extrabold tracking-tight text-base-content outline-none placeholder:text-base-content/25"
              placeholder="Task title..."
            />
          </div>

          {/* ─── Compact Inline Property Strip (Linear-Style) ─── */}
          <div className="flex flex-wrap items-center gap-2 px-6 py-2 border-b border-base-content/6">
            {/* Priority Button Badge */}
            <div className="relative inline-flex items-center rounded-xl bg-base-200/60 px-2.5 py-1 text-xs font-semibold text-base-content/70 hover:bg-base-200 transition">
              <span
                className="size-2 rounded-full me-1.5 shrink-0"
                style={{ background: priorityConfig[priority]?.color }}
              />
              <select
                value={priority}
                onChange={(e) => {
                  const val = e.target.value as Task["priority"];
                  setPriority(val);
                  save({ priority: val });
                }}
                className="bg-transparent font-bold capitalize text-base-content outline-none cursor-pointer pe-1 text-[11px]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Assignee Pill */}
            <div className="inline-flex items-center rounded-xl bg-base-200/60 px-2.5 py-1 text-[11px] font-semibold text-base-content/70 hover:bg-base-200 transition">
              <Profile2User size={13} className="me-1.5 text-base-content/45 shrink-0" />
              <select
                value={assignee?.id || ""}
                onChange={(e) => {
                  const newId = e.target.value;
                  const selectedMember = projectMembers.find(
                    (m) => String(m.user?.id) === newId
                  );
                  save({
                    assignee: newId ? newId : null,
                    assignee_detail: selectedMember?.user || null,
                  } as any);
                }}
                className="bg-transparent font-semibold text-base-content outline-none cursor-pointer truncate max-w-[110px]"
              >
                <option value="">Unassigned</option>
                {projectMembers.map(
                  (m) =>
                    m.user && (
                      <option key={m.id} value={m.user.id}>
                        {m.user.first_name || m.user.username}
                      </option>
                    )
                )}
              </select>
            </div>

            {/* Due Date Picker Pill */}
            <div className="inline-flex items-center rounded-xl bg-base-200/60 px-2.5 py-1 text-[11px] font-semibold text-base-content/70 hover:bg-base-200 transition">
              <Calendar size={13} className="me-1.5 text-base-content/45 shrink-0" />
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  save({
                    due_date: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : undefined,
                  });
                }}
                className="bg-transparent font-semibold text-base-content outline-none cursor-pointer max-w-[125px]"
              />
            </div>

            {/* Timer Control Pill */}
            <button
              type="button"
              onClick={() =>
                timerIsRunning ? onStopTimer?.(task.id) : onPlayTimer?.(task.id)
              }
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                timerIsRunning
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {timerIsRunning ? <Stop size={13} /> : <Play size={13} />}
              {timerIsRunning ? formatTime(elapsedSeconds) : "Timer"}
            </button>

            {/* Manual Log Time Trigger Pill */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsManualTimeOpen(!isManualTimeOpen)}
                className="inline-flex items-center gap-1 rounded-xl bg-base-200/60 px-2 py-1 text-[11px] font-semibold text-base-content/60 hover:bg-base-200 transition"
              >
                <span>⏱ {formatTime(elapsedSeconds)}</span>
                <span className="text-[10px] text-primary font-bold">+Log</span>
              </button>

              {isManualTimeOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsManualTimeOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 z-50 w-44 rounded-2xl border border-base-content/10 bg-base-100 p-3 shadow-xl space-y-2.5">
                    <p className="text-xs font-bold text-base-content">Log Time</p>
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <span className="text-[10px] text-base-content/50">Hours</span>
                        <input
                          type="number"
                          min="0"
                          value={manualHours}
                          onChange={(e) => setManualHours(e.target.value)}
                          className="w-full rounded-lg bg-base-200 px-2 py-1 text-xs outline-none"
                        />
                      </label>
                      <label className="flex-1">
                        <span className="text-[10px] text-base-content/50">Mins</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={manualMinutes}
                          onChange={(e) => setManualMinutes(e.target.value)}
                          className="w-full rounded-lg bg-base-200 px-2 py-1 text-xs outline-none"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newTotal = Number(manualHours) + Number(manualMinutes) / 60;
                        const oldTotal = Number(task.spent_hours || 0);
                        const delta = newTotal - oldTotal;

                        if (Math.abs(delta) < 0.01) {
                          setIsManualTimeOpen(false);
                          return;
                        }

                        if (delta > 0) {
                          const h = Math.floor(delta);
                          const m = Math.round((delta - h) * 60);
                          manualTimeMutation.mutate({ hours: h, minutes: m });
                        } else {
                          updateMutation.mutate(
                            { spent_hours: Number(newTotal.toFixed(2)) },
                            {
                              onSuccess: () => {
                                toast.success("Total time updated");
                                setIsManualTimeOpen(false);
                              },
                            }
                          );
                        }
                      }}
                      disabled={manualTimeMutation.isPending || updateMutation.isPending}
                      className="w-full rounded-xl bg-primary py-1 text-xs font-bold text-primary-content disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Blocker Pill Toggle */}
            <button
              type="button"
              onClick={() => blockerMutation.mutate(!task.is_blocked)}
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                task.is_blocked
                  ? "bg-amber-500/12 text-amber-600 border border-amber-500/30"
                  : "bg-base-200/60 text-base-content/45 hover:text-amber-600 hover:bg-amber-500/10"
              }`}
            >
              <Danger size={13} />
              {task.is_blocked ? "Blocked" : "Block"}
            </button>
          </div>

          {/* ─── Nav Tabs ─── */}
          <div className="flex shrink-0 gap-1 border-b border-base-content/6 px-6">
            {(
              [
                ["overview", "Overview"],
                ["comments", `Comments ${comments.length ? `(${comments.length})` : ""}`],
                ["activity", "Activity"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`relative px-3 py-2.5 text-xs font-bold transition-colors ${
                  activeTab === value
                    ? "text-primary"
                    : "text-base-content/45 hover:text-base-content"
                }`}
              >
                {label}
                {activeTab === value && (
                  <motion.div
                    layoutId="sheet-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary"
                  />
                )}
              </button>
            ))}
          </div>

          {/* ─── Main Content ─── */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {focusMode && (
              <div className="rounded-2xl border border-primary/15 bg-primary/8 p-3 text-primary">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]">Focus mode</p>
                <p className="mt-0.5 text-xs font-semibold">Keep one clear next step in view.</p>
              </div>
            )}

            {/* ─── TAB 1: OVERVIEW ─── */}
            {activeTab === "overview" && (
              <>
                {/* ─── Description Section (Compact when empty) ─── */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-base-content">Description</span>
                    {!isEditingDescription && !description && (
                      <button
                        type="button"
                        onClick={() => setIsEditingDescription(true)}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        + Add description
                      </button>
                    )}
                  </div>

                  {isEditingDescription || description ? (
                    <div className="rounded-2xl border border-base-content/8 bg-base-200/30 p-3 transition focus-within:border-primary/40 focus-within:bg-base-100">
                      <textarea
                        dir="auto"
                        autoFocus={!description}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add context, acceptance criteria or links..."
                        className="min-h-20 w-full resize-none bg-transparent text-xs leading-relaxed text-base-content outline-none placeholder:text-base-content/30"
                      />
                      <div className="flex items-center justify-between border-t border-base-content/6 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!task.description) setIsEditingDescription(false);
                            else setDescription(task.description);
                          }}
                          className="text-[11px] text-base-content/40 hover:text-base-content"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => save({ description })}
                          disabled={
                            description.trim() === (task.description || "").trim() ||
                            updateMutation.isPending
                          }
                          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1 text-xs font-bold text-primary-content disabled:opacity-40 hover:bg-primary/90 transition"
                        >
                          <Send2 size={12} />
                          {updateMutation.isPending ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsEditingDescription(true)}
                      className="cursor-pointer rounded-xl border border-dashed border-base-content/10 px-3 py-2.5 text-xs text-base-content/35 hover:border-base-content/25 hover:text-base-content/60 transition"
                    >
                      No description added. Click to add details...
                    </div>
                  )}
                </div>

                {/* ─── Checklist Section (Compact when empty) ─── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TaskSquare size={15} className="text-primary" />
                      <span className="text-xs font-bold text-base-content">Checklist</span>
                      {checklists.length > 0 && (
                        <span className="text-[11px] text-base-content/45">
                          ({checklistDone}/{checklists.length})
                        </span>
                      )}
                    </div>

                    {checklists.length > 0 && (
                      <span className="text-xs font-bold text-primary">
                        {checklistProgress}%
                      </span>
                    )}
                  </div>

                  {checklists.length > 0 && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-base-200">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${checklistProgress}%` }}
                      />
                    </div>
                  )}

                  {/* Checklist items list */}
                  <div className="space-y-1">
                    {isChecklistLoading && (
                      <p className="py-2 text-xs text-base-content/40">Loading items...</p>
                    )}
                    {checklists.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-base-200/60 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              checklistToggleMutation.mutate({
                                id: item.id,
                                completed: !item.is_completed,
                              })
                            }
                            className={`grid size-4 shrink-0 place-items-center rounded-md border transition ${
                              item.is_completed
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-base-content/20 text-transparent hover:border-primary"
                            }`}
                          >
                            {item.is_completed && <TickCircle size={12} variant="Bold" />}
                          </button>
                          <span
                            className={`truncate text-xs ${
                              item.is_completed
                                ? "text-base-content/40 line-through"
                                : "text-base-content"
                            }`}
                          >
                            {item.description}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => checklistDeleteMutation.mutate(item.id)}
                          className="rounded-lg p-1 text-base-content/25 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Quick Add Checklist Input */}
                  {showAddChecklist || checklists.length > 0 ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (checklistText.trim()) checklistAddMutation.mutate(checklistText.trim());
                      }}
                      className="flex gap-2 pt-1"
                    >
                      <input
                        value={checklistText}
                        onChange={(e) => setChecklistText(e.target.value)}
                        placeholder="Add step item..."
                        className="flex-1 rounded-xl border border-base-content/10 bg-base-100 px-3 py-1.5 text-xs text-base-content outline-none placeholder:text-base-content/35 focus:border-primary/40"
                      />
                      <button
                        type="submit"
                        disabled={!checklistText.trim() || checklistAddMutation.isPending}
                        className="grid size-7 place-items-center rounded-xl bg-primary text-primary-content disabled:opacity-40 transition shrink-0"
                      >
                        <Add size={15} />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddChecklist(true)}
                      className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Add size={13} /> Add checklist item
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ─── TAB 2: COMMENTS ─── */}
            {activeTab === "comments" && (
              <section className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (commentText.trim() || selectedFile) commentMutation.mutate();
                  }}
                  className="rounded-2xl border border-base-content/8 bg-base-200/30 p-3 space-y-2 focus-within:border-primary/40 focus-within:bg-base-100 transition"
                >
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="min-h-20 w-full resize-none bg-transparent text-xs leading-relaxed text-base-content outline-none placeholder:text-base-content/35"
                  />
                  {selectedFile && (
                    <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-1.5 text-xs text-primary">
                      <span className="truncate">{selectedFile.name}</span>
                      <button type="button" onClick={() => setSelectedFile(null)}>
                        <CloseSquare size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-base-content/6 pt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept=".pdf,.png,.jpg,.jpeg,.zip,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size <= 5 * 1024 * 1024) setSelectedFile(file);
                        else if (file) toast.error("File size must be less than 5MB.");
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg p-1.5 text-base-content/40 hover:bg-base-200 hover:text-primary transition"
                    >
                      <Paperclip2 size={16} />
                    </button>
                    <button
                      type="submit"
                      disabled={commentMutation.isPending || (!commentText.trim() && !selectedFile)}
                      className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-content disabled:opacity-40"
                    >
                      <Send2 size={13} />
                      {commentMutation.isPending ? "Sending..." : "Comment"}
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  {isCommentsLoading && (
                    <p className="py-4 text-center text-xs text-base-content/40">Loading comments...</p>
                  )}
                  {!isCommentsLoading && comments.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-base-content/10 py-8 text-center text-xs text-base-content/40">
                      No comments yet.
                    </p>
                  )}
                  {comments.map((comment) => (
                    <article
                      key={comment.id}
                      className="rounded-2xl border border-base-content/8 bg-base-100 p-3.5 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                            {initials(
                              comment.author_detail?.first_name,
                              comment.author_detail?.last_name,
                              comment.author_detail?.username
                            )}
                          </span>
                          <span className="text-xs font-bold text-base-content">
                            {comment.author_detail?.first_name ||
                              comment.author_detail?.username ||
                              "User"}
                          </span>
                        </div>
                        <span className="text-[10px] text-base-content/40">
                          {formatRelativeDate(comment.created_at)}
                        </span>
                      </div>
                      <p dir="auto" className="text-xs leading-relaxed text-base-content/75">
                        {comment.content}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ─── TAB 3: ACTIVITY ─── */}
            {activeTab === "activity" && (
              <section className="space-y-4">
                {isActivitiesLoading && (
                  <p className="py-4 text-center text-xs text-base-content/40">Loading activity...</p>
                )}
                {!isActivitiesLoading && activities.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-base-content/10 py-8 text-center text-xs text-base-content/40">
                    No activities recorded yet.
                  </p>
                )}
                <div className="relative border-s border-base-content/10 ms-3 ps-5 space-y-4">
                  {activities.map((act) => (
                    <div key={act.id} className="relative">
                      <span className="absolute -left-[25px] top-1 size-2 rounded-full bg-primary" />
                      <p className="text-xs font-semibold text-base-content">{act.action}</p>
                      <p className="text-[10px] text-base-content/40">
                        {act.actor_detail?.first_name || act.actor_detail?.username || "System"} ·{" "}
                        {formatRelativeDate(act.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ─── Footer ─── */}
          <footer className="flex shrink-0 items-center justify-between border-t border-base-content/8 px-6 py-2.5 text-[11px] text-base-content/40">
            <span>{isBusy ? "Saving changes..." : "Changes are saved automatically"}</span>
            <span className="font-mono font-bold text-base-content/50">
              {formatTime(elapsedSeconds)} logged
            </span>
          </footer>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
};
