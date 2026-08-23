import { ArrowRight, Calendar, Play, TaskSquare, TickCircle, Timer1 } from "iconsax-reactjs";
import { Link } from "react-router-dom";
import type { EmployeeTaskSummary } from "../types";
import { TodayEmptyState } from "./TodayEmptyState";

interface TodayTasksCardProps {
  tasks: EmployeeTaskSummary[];
  overdueTasks: EmployeeTaskSummary[];
  activeTaskIds?: string[];
  onSelectTask?: (taskId: string) => void;
  onMarkDone?: (taskId: string) => void;
  startingTaskId?: string | null;
  onStart: (task: EmployeeTaskSummary) => void;
}

const priorityClass: Record<string, string> = {
  critical: "bg-error/10 text-error",
  high: "bg-warning/10 text-warning",
  medium: "bg-primary/10 text-primary",
  low: "bg-base-200 text-base-content/50",
};

const dueLabel = (dueDate: string | null, overdue: boolean) => {
  if (overdue) return "Overdue";
  if (!dueDate) return "No due date";
  return `Due ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(dueDate))}`;
};

export const TodayTasksCard = ({ tasks, overdueTasks, activeTaskIds = [], onSelectTask, onMarkDone, startingTaskId, onStart }: TodayTasksCardProps) => {
  const taskRows = [
    ...overdueTasks.map((task) => ({ task, overdue: true })),
    ...tasks.map((task) => ({ task, overdue: false })),
  ].slice(0, 7);

  return (
    <section className="madaar-surface overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-base-content/8 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-base-content/45">Your queue</p>
          <h2 className="mt-1 text-xl font-bold text-base-content">Today&apos;s tasks</h2>
          <p className="mt-1 text-sm text-base-content/55">The next things worth your attention.</p>
        </div>
        <Link to="/tasks" className="motion-interactive flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary/10">
          All tasks <ArrowRight size={15} />
        </Link>
      </div>

      {taskRows.length === 0 ? (
        <TodayEmptyState
          icon={<TaskSquare size={24} />}
          title="Your queue is clear"
          description="No open or overdue tasks are assigned to you right now."
          compact
        />
      ) : (
        <div className="divide-y divide-base-content/8">
          {taskRows.map(({ task, overdue }) => {
            const isActive = activeTaskIds.includes(task.id);
            const isDone = task.status_code?.toLowerCase() === "done";
            const isStarting = startingTaskId === task.id;
            return (
              <div
                key={`${task.id}-${overdue ? "overdue" : "today"}`}
                onClick={() => onSelectTask?.(task.id)}
                className="motion-surface group flex cursor-pointer items-center gap-3 px-5 py-4 hover:bg-base-200/45 sm:px-6"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${overdue ? "bg-error" : isDone ? "bg-success" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-base-content">{task.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-base-content/45">
                    {task.project_name && <span className="truncate">{task.project_name}</span>}
                    <span className={overdue ? "font-bold text-error" : ""}><Calendar size={12} className="mr-1 inline" />{dueLabel(task.due_date, overdue)}</span>
                    <span className={`rounded-full px-2 py-0.5 font-bold capitalize ${priorityClass[task.priority || "low"] || priorityClass.low}`}>{task.priority || "low"}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {onMarkDone && !isDone && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onMarkDone(task.id); }}
                      aria-label={`Mark ${task.title} as done`}
                      className="motion-interactive inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-base-content/10 text-base-content/30 opacity-0 transition-all duration-200 hover:border-success/30 hover:bg-success/10 hover:text-success group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <TickCircle size={16} variant="Bold" />
                    </button>
                  )}
                  {isActive ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-2 text-xs font-bold text-primary">
                      <Timer1 size={14} /> Running
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onStart(task); }}
                      disabled={Boolean(startingTaskId)}
                      aria-label={`Start timer for ${task.title}`}
                      className="motion-interactive inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-base-content/10 text-base-content/45 hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:cursor-wait disabled:opacity-50"
                    >
                      {isStarting ? <span className="loading loading-spinner loading-xs" /> : <Play size={16} variant="Bold" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
