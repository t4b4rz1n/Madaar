import { motion } from "framer-motion";
import { Stop, TaskSquare, Timer1 } from "iconsax-reactjs";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { EmployeeActiveTimer } from "../types";

interface TodayTimerCardProps {
  activeTimer: EmployeeActiveTimer | null;
  isStopping: boolean;
  onStop: () => void;
}

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
};

export const TodayTimerCard = ({ activeTimer, isStopping, onStop }: TodayTimerCardProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      return;
    }

    const updateElapsed = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(activeTimer.start_time).getTime()) / 1000)));
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeTimer]);

  if (!activeTimer) {
    return (
      <section className="madaar-surface flex h-full flex-col justify-between overflow-hidden p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-base-content/45">Focus timer</p>
            <h2 className="mt-2 text-xl font-bold text-base-content">Ready when you are</h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Timer1 size={24} />
          </div>
        </div>
        <div className="mt-8 flex items-center justify-between gap-4 rounded-xl bg-base-200/70 p-4">
          <p className="text-sm leading-6 text-base-content/60">Start a timer from any task and keep your focus visible.</p>
          <Link to="/tasks" className="motion-interactive shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-content hover:bg-primary/90">
            Open tasks
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-full overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.07] p-5 shadow-sm sm:p-6">
      <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              <motion.span
                className="h-2 w-2 rounded-full bg-primary"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              Focus in progress
            </p>
            <h2 className="mt-2 line-clamp-2 text-xl font-bold text-base-content">
              {activeTimer.task_title || `Task ${activeTimer.task_id || ""}`}
            </h2>
            {activeTimer.project_name && <p className="mt-1 text-xs text-base-content/50">{activeTimer.project_name}</p>}
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-lg shadow-primary/20">
            <TaskSquare size={22} />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <time className="font-mono text-4xl font-bold tracking-tight text-base-content sm:text-5xl" dateTime={activeTimer.start_time}>
            {formatTime(elapsed)}
          </time>
          <button
            type="button"
            onClick={onStop}
            disabled={isStopping}
            className="motion-interactive inline-flex items-center gap-2 rounded-xl bg-base-content px-4 py-2.5 text-sm font-bold text-base-100 hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
          >
            <Stop size={17} variant="Bold" />
            {isStopping ? "Stopping..." : "Stop timer"}
          </button>
        </div>
      </div>
    </section>
  );
};
