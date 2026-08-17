import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, CloseSquare, Danger, Play, Stop, TaskSquare, Timer1 } from 'iconsax-reactjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task } from '../types';
import { markTaskBlocked, updateTask } from '../api/tasksApi';
import { toast } from 'sonner';

interface TaskSheetProps {
  task: Task | null;
  onClose: () => void;
  onPatch: (taskId: string | number, patch: Partial<Task>) => void;
  onPlayTimer?: (taskId: string | number) => void;
  onStopTimer?: (taskId: string | number) => void;
  focusMode?: boolean;
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 38, bounce: 0 };

const formatTime = (seconds?: number) => {
  const value = Math.max(0, Math.round(Number(seconds || 0)));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  return [hours, minutes, secs].map(part => part.toString().padStart(2, '0')).join(':');
};

export const TaskSheet: React.FC<TaskSheetProps> = ({ task, onClose, onPatch, onPlayTimer, onStopTimer, focusMode = false }) => {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState(task?.priority || 'low');
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 10) : '');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'low');
    setDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
    window.setTimeout(() => titleRef.current?.focus(), 180);
  }, [task]);

  useEffect(() => {
    if (!task) return;
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href]';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
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
    window.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => titleRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [task, onClose]);

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Task>) => updateTask(task!.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskActivities', task?.id] });
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || error.message || 'Could not update task.'),
  });

  const blockerMutation = useMutation({
    mutationFn: (blocked: boolean) => markTaskBlocked(task!.id, blocked),
    onMutate: (blocked) => onPatch(task!.id, { is_blocked: blocked }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (error: any, blocked) => {
      onPatch(task!.id, { is_blocked: !blocked });
      toast.error(error.response?.data?.detail || error.message || 'Could not update blocker state.');
    },
  });

  if (!task) return null;

  const save = (patch: Partial<Task>) => {
    onPatch(task.id, patch);
    updateMutation.mutate(patch);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] bg-slate-950/20 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      >
        <motion.aside
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Task details: ${task.title}`}
          className="absolute inset-y-0 end-0 flex w-full max-w-xl flex-col border-s border-base-content/10 bg-base-100 shadow-2xl shadow-slate-950/20"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={spring}
        >
          <header className="flex items-center justify-between border-b border-base-content/10 px-5 py-4 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <span className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">{task.key}</span>
              <span className="truncate text-xs font-semibold text-base-content/45">{task.status_detail?.name || 'No status'}</span>
            </div>
            <button type="button" onClick={onClose} className="motion-interactive rounded-xl p-2 text-base-content/45 hover:bg-base-200 hover:text-base-content" aria-label="Close task sheet">
              <CloseSquare size={21} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            <div className="mb-6 flex items-start gap-3">
              <span className={`mt-2 h-3 w-3 shrink-0 rounded-full ${task.is_finished ? 'bg-success' : task.is_blocked ? 'bg-error' : 'bg-primary'}`} />
              <input
                ref={titleRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => title.trim() && title.trim() !== task.title && save({ title: title.trim() })}
                onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                dir="auto"
                className="w-full bg-transparent text-xl font-bold leading-tight text-base-content outline-none placeholder:text-base-content/30 sm:text-2xl"
                placeholder="Untitled task"
              />
            </div>

            <div className="mb-7 flex flex-wrap gap-2">
              <button type="button" onClick={() => task.is_active_timer_running ? onStopTimer?.(task.id) : onPlayTimer?.(task.id)} className={`motion-interactive inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold ${task.is_active_timer_running ? 'bg-error/10 text-error' : 'bg-primary text-primary-content'}`}>
                {task.is_active_timer_running ? <Stop size={15} /> : <Play size={15} />}
                {task.is_active_timer_running ? 'Stop timer' : 'Start focus'}
              </button>
              <button type="button" onClick={() => blockerMutation.mutate(!task.is_blocked)} className={`motion-interactive inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold ${task.is_blocked ? 'border-error/25 bg-error/10 text-error' : 'border-base-content/10 text-base-content/55 hover:border-error/25 hover:text-error'}`}>
                <Danger size={15} />
                {task.is_blocked ? 'Blocked' : 'Add blocker'}
              </button>
            </div>

            {focusMode && (
              <div className="mb-6 rounded-2xl bg-primary/10 p-4 text-primary">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]">Focus mode</p>
                <p className="mt-1 text-sm font-semibold">Keep this task visible and move one step at a time.</p>
              </div>
            )}

            <section className="mb-7 grid grid-cols-2 gap-3">
              <label className="rounded-2xl border border-base-content/10 bg-base-200/60 p-3">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-base-content/40">Priority</span>
                <select value={priority} onChange={(event) => { const value = event.target.value as Task['priority']; setPriority(value); save({ priority: value }); }} className="w-full bg-transparent text-sm font-bold text-base-content outline-none">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
              </label>
              <label className="rounded-2xl border border-base-content/10 bg-base-200/60 p-3">
                <span className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-base-content/40"><Calendar size={12} /> Due date</span>
                <input type="date" value={dueDate} onChange={(event) => { setDueDate(event.target.value); save({ due_date: event.target.value ? new Date(event.target.value).toISOString() : undefined }); }} className="w-full bg-transparent text-sm font-bold text-base-content outline-none" />
              </label>
            </section>

            <section className="mb-7">
              <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-base-content">Description</h3><span className="text-[11px] text-base-content/35">Autosaves on blur</span></div>
              <textarea dir="auto" value={description} onChange={(event) => setDescription(event.target.value)} onBlur={() => description !== (task.description || '') && save({ description })} placeholder="Add context, links, or acceptance criteria…" className="min-h-32 w-full resize-y rounded-2xl border border-base-content/10 bg-base-200/60 p-4 text-sm leading-6 text-base-content outline-none transition-colors focus:border-primary/40 focus:bg-base-200" />
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-base-content/10 bg-base-200/60 p-4"><div className="mb-2 flex items-center gap-2 text-base-content/45"><Timer1 size={16} /><span className="text-xs font-semibold">Time logged</span></div><strong className="text-lg text-base-content">{formatTime(task.spent_seconds)}</strong></div>
              <div className="rounded-2xl border border-base-content/10 bg-base-200/60 p-4"><div className="mb-2 flex items-center gap-2 text-base-content/45"><TaskSquare size={16} /><span className="text-xs font-semibold">Checklist</span></div><strong className="text-lg text-base-content">{task.checklist_stats?.done || 0}/{task.checklist_stats?.total || 0}</strong></div>
            </section>
          </div>

          <footer className="border-t border-base-content/10 px-5 py-4 text-[11px] text-base-content/40 sm:px-7">
            {updateMutation.isPending || blockerMutation.isPending ? 'Saving changes…' : 'Changes are saved automatically'}
          </footer>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
};
