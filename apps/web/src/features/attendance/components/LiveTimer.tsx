import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Stop, TaskSquare, Timer1, Trash } from "iconsax-reactjs";
import { toast } from "sonner";
import { cancelTimer, getActiveTimer, startTimer, stopTimer } from "../api/attendanceApi";
import type { TimeLog } from "../types";
import type { Task } from "../../tasks/types";

interface LiveTimerProps { tasks?: Task[]; }

const sameId = (left: string | number | undefined, right: string | number | undefined) => left?.toString() === right?.toString();
const formatTime = (totalSeconds: number) => [Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60), totalSeconds % 60].map((part) => part.toString().padStart(2, "0")).join(":");

export const LiveTimer: React.FC<LiveTimerProps> = ({ tasks = [] }) => {
  const queryClient = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const { data: activeTimer } = useQuery<TimeLog | null>({ queryKey: ["activeTimer"], queryFn: getActiveTimer, refetchInterval: 15_000 });
  const activeTask = tasks.find((task) => sameId(task.id, activeTimer?.task));

  useEffect(() => {
    if (activeTimer?.task) setSelectedTaskId(activeTimer.task.toString());
  }, [activeTimer?.task]);
  useEffect(() => {
    if (!activeTimer) { setElapsed(0); return; }
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(activeTimer.start_time).getTime()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [activeTimer]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["activeTimer"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["myWeeklyTimesheet"] });
  };
  const startMutation = useMutation({ mutationFn: () => startTimer(selectedTaskId), onSuccess: () => { invalidate(); toast.success("Timer started"); }, onError: (error: any) => toast.error(error.response?.data?.detail || "Could not start the timer.") });
  const stopMutation = useMutation({ mutationFn: () => stopTimer(activeTimer?.id), onSuccess: () => { invalidate(); toast.success("Time logged"); }, onError: (error: any) => toast.error(error.response?.data?.detail || "Could not stop the timer.") });
  const cancelMutation = useMutation({ mutationFn: () => cancelTimer(activeTimer!.id), onSuccess: () => { invalidate(); toast.success("Timer cancelled"); }, onError: () => toast.error("Could not cancel the timer.") });

  return <section className="madaar-surface overflow-hidden rounded-[26px] border border-base-content/10 bg-base-100"><div className="flex flex-col gap-5 p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className={`grid size-12 place-items-center rounded-2xl ${activeTimer ? "bg-primary text-primary-content shadow-lg shadow-primary/20" : "bg-primary/10 text-primary"}`}><Timer1 size={25} variant={activeTimer ? "Bold" : "Outline"} /></div><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Focus timer</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-base-content">{activeTimer ? "You are tracking time" : "Start tracking your work"}</h2><p className="mt-1 text-sm text-base-content/50">{activeTimer ? (activeTask?.title || `Task ${activeTimer.task}`) : "Choose a task and start. Stop when you are done."}</p></div></div>{activeTimer && <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-[11px] font-bold text-success"><span className="size-1.5 animate-pulse rounded-full bg-success" /> Live</span>}</div>
      {activeTimer ? <div className="flex flex-col gap-5 rounded-2xl bg-primary/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><p className="text-4xl font-semibold tabular-nums tracking-tight text-base-content sm:text-5xl">{formatTime(elapsed)}</p><p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-base-content/45"><TaskSquare size={14} /> {activeTask?.key || `Task ${activeTimer.task}`}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => stopMutation.mutate()} disabled={stopMutation.isPending} className="motion-interactive inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-content shadow-lg shadow-primary/15 hover:bg-primary/90 disabled:opacity-50"><Stop size={17} variant="Bold" /> Stop & save</button><button type="button" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} className="motion-interactive grid size-11 place-items-center rounded-xl border border-base-content/10 bg-base-100 text-base-content/45 hover:bg-error/10 hover:text-error" aria-label="Cancel timer"><Trash size={17} /></button></div></div> : <div className="flex flex-col gap-3 sm:flex-row"><label className="flex-1"><span className="sr-only">Choose a task</span><select value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)} className="select select-bordered h-12 w-full rounded-xl bg-base-200/60 text-sm font-semibold" disabled={tasks.length === 0}><option value="">Choose a task to track...</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.key} · {task.title}</option>)}</select></label><button type="button" onClick={() => startMutation.mutate()} disabled={!selectedTaskId || startMutation.isPending} className="motion-interactive inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-content shadow-lg shadow-primary/15 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"><Play size={17} variant="Bold" /> Start timer</button></div>}
      {!activeTimer && tasks.length === 0 && <p className="flex items-center gap-2 text-xs font-medium text-warning"><Pause size={14} /> No tasks are available on the selected board. Open a board or create a task first.</p>}
    </div></section>;
};
