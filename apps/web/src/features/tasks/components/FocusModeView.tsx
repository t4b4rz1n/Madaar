import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft2,
  ArrowRight2,
  CloseCircle,
  Play,
  Stop,
  TickCircle,
} from 'iconsax-reactjs';
import type { Task } from '../types';
import type { TimeLog } from '../../attendance/types';

interface FocusModeViewProps {
  tasks: Task[];
  focusedTaskId: string | number | null;
  onSelectTask: (taskId: string | number) => void;
  onExit: () => void;
  onOpenSheet: (task: Task) => void;
  onPlayTimer: (taskId: string | number) => void;
  onStopTimer: (taskId: string | number) => void;
  onToggleDone: (taskId: string | number) => void;
  activeTimer?: TimeLog | null;
}

export const FocusModeView: React.FC<FocusModeViewProps> = ({
  tasks,
  focusedTaskId,
  onSelectTask,
  onExit,
  onOpenSheet,
  onPlayTimer,
  onStopTimer,
  onToggleDone,
  activeTimer,
}) => {
  const currentIndex = Math.max(
    0,
    tasks.findIndex((t) => String(t.id) === String(focusedTaskId))
  );

  const task = tasks[currentIndex] || tasks[0];

  const handlePrev = () => {
    if (tasks.length <= 1) return;
    const prevIndex = (currentIndex - 1 + tasks.length) % tasks.length;
    onSelectTask(tasks[prevIndex].id);
  };

  const handleNext = () => {
    if (tasks.length <= 1) return;
    const nextIndex = (currentIndex + 1) % tasks.length;
    onSelectTask(tasks[nextIndex].id);
  };

  const isActuallyDone = Boolean(task?.is_finished);
  const timerBelongsToTask = Boolean(
    activeTimer && activeTimer.task.toString() === task?.id.toString()
  );
  const timerIsRunning = Boolean(task?.is_active_timer_running || timerBelongsToTask);

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
    ? Number(task?.spent_seconds || 0) + Math.max(0, Math.floor((now - localStartedAt) / 1000))
    : Number(task?.spent_seconds || 0);

  const formattedElapsed = [
    Math.floor(elapsedSeconds / 3600),
    Math.floor((elapsedSeconds % 3600) / 60),
    elapsedSeconds % 60,
  ]
    .map((part) => part.toString().padStart(2, "0"))
    .join(":");

  if (!task) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <p className="text-xs font-semibold text-base-content/50">No tasks in focus mode.</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 rounded-xl border border-base-content/10 px-4 py-2 text-xs font-bold text-base-content hover:bg-base-200"
        >
          Exit Focus
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center bg-base-200/50 p-4 sm:p-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-xl rounded-3xl border border-base-content/10 bg-base-100 p-6 shadow-xl backdrop-blur-xl sm:p-8"
        >
          {/* Top Bar: Key, Task Counter, Prev/Next & Exit */}
          <div className="flex items-center justify-between border-b border-base-content/6 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-wider text-base-content/40">
                {task.key}
              </span>
              {task.status_detail && (
                <span className="rounded-full bg-base-200 px-2 py-0.5 text-[10px] font-bold text-base-content/60">
                  {task.status_detail.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {tasks.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="grid size-6.5 place-items-center rounded-lg text-base-content/40 hover:bg-base-200 hover:text-base-content"
                    title="Previous"
                  >
                    <ArrowLeft2 size={14} />
                  </button>
                  <span className="text-[11px] font-semibold text-base-content/40">
                    {currentIndex + 1}/{tasks.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="grid size-6.5 place-items-center rounded-lg text-base-content/40 hover:bg-base-200 hover:text-base-content"
                    title="Next"
                  >
                    <ArrowRight2 size={14} />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onExit}
                className="grid size-7 place-items-center rounded-lg text-base-content/40 hover:bg-base-200 hover:text-base-content"
                title="Exit Focus"
              >
                <CloseCircle size={17} />
              </button>
            </div>
          </div>

          {/* Task Title & Description */}
          <div className="mt-5">
            <h1
              dir="auto"
              className={`text-xl font-bold leading-snug sm:text-2xl ${
                isActuallyDone ? 'text-base-content/40 line-through' : 'text-base-content'
              }`}
            >
              {task.title}
            </h1>

            {task.description && (
              <p
                dir="auto"
                className="mt-2 line-clamp-3 text-xs leading-relaxed text-base-content/55"
              >
                {task.description}
              </p>
            )}
          </div>

          {/* Minimal Live Timer Strip */}
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-base-200/60 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (timerIsRunning) onStopTimer(task.id);
                  else onPlayTimer(task.id);
                }}
                className={`grid size-9 place-items-center rounded-xl transition ${
                  timerIsRunning
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-primary text-primary-content shadow-sm'
                }`}
                title={timerIsRunning ? 'Stop timer' : 'Start timer'}
              >
                {timerIsRunning ? <Stop size={16} /> : <Play size={16} />}
              </button>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                  {timerIsRunning ? 'Timer running' : 'Timer'}
                </span>
                <span
                  className={`font-mono text-lg font-bold tabular-nums ${
                    timerIsRunning ? 'text-emerald-600' : 'text-base-content/70'
                  }`}
                >
                  {formattedElapsed}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleDone(task.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  isActuallyDone
                    ? 'bg-base-200 text-base-content/50'
                    : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                }`}
              >
                <TickCircle size={15} />
                <span>{isActuallyDone ? 'Done' : 'Complete'}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenSheet(task)}
                className="rounded-xl border border-base-content/10 bg-base-100 px-3 py-1.5 text-xs font-semibold text-base-content/60 hover:bg-base-200 hover:text-base-content"
              >
                Details
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
