import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Add,
  Calendar,
  CloseSquare,
  Danger,
  Paperclip2,
  Play,
  Send2,
  Stop,
  TaskSquare,
  TickCircle,
  Timer1,
  Trash,
} from 'iconsax-reactjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TimeLog } from '../../attendance/types';
import type { Task } from '../types';
import { getProjectMembers } from '../../projects/api/projectsApi';
import { createManualLog } from '../../attendance/api/attendanceApi';
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
} from '../api/tasksApi';

interface TaskSheetProps {
  task: Task | null;
  onClose: () => void;
  onPatch: (taskId: string | number, patch: Partial<Task>) => void;
  onPlayTimer?: (taskId: string | number) => void;
  onStopTimer?: (taskId: string | number) => void;
  activeTimer?: TimeLog | null;
  focusMode?: boolean;
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 38, bounce: 0 };

const formatTime = (seconds?: number) => {
  const value = Math.max(0, Math.round(Number(seconds || 0)));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  return [hours, minutes, secs].map((part) => part.toString().padStart(2, '0')).join(':');
};

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'No due date';

const formatRelativeDate = (value: string) => {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
};

const initials = (firstName?: string, lastName?: string, username?: string) => {
  const value = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  return value || username?.[0]?.toUpperCase() || 'U';
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
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'low');
  const toLocalDatetimeInput = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const [dueDate, setDueDate] = useState(task?.due_date ? toLocalDatetimeInput(task.due_date) : '');
  const [commentText, setCommentText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [checklistText, setChecklistText] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'activity'>('overview');
  const [isManualTimeOpen, setIsManualTimeOpen] = useState(false);
  const [manualHours, setManualHours] = useState('0');
  const [manualMinutes, setManualMinutes] = useState('0');
  const [now, setNow] = useState(Date.now());

  const taskId = task?.id;
  const timerBelongsToTask = Boolean(
    activeTimer && task &&
    (activeTimer.task?.toString() ?? (activeTimer as { task_id?: string | number }).task_id?.toString()) === task.id.toString()
  );
  const timerIsRunning = Boolean(task && (task.is_active_timer_running || timerBelongsToTask));

  const { data: checklists = [], isLoading: isChecklistLoading } = useQuery({
    queryKey: ['taskChecklists', taskId],
    queryFn: () => getTaskChecklists(taskId!),
    enabled: Boolean(taskId),
  });
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => getTaskComments(taskId!),
    enabled: Boolean(taskId),
  });
  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['taskActivities', taskId],
    queryFn: () => getTaskActivities(taskId!),
    enabled: Boolean(taskId),
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ['projectMembers', task?.project],
    queryFn: () => getProjectMembers(task!.project!),
    enabled: Boolean(task?.project),
  });

  const manualTimeMutation = useMutation({
    mutationFn: (data: { hours: number; minutes: number }) => {
      const end_time = new Date().toISOString();
      const start_time = new Date(Date.now() - (data.hours * 3600 + data.minutes * 60) * 1000).toISOString();
      return createManualLog({
        task: taskId!,
        project: task!.project,
        start_time,
        end_time,
      });
    },
    onSuccess: () => {
      toast.success('Manual time logged successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['standup-grid'] });
      setIsManualTimeOpen(false);
      setManualHours('0');
      setManualMinutes('0');
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || error.response?.data?.error || error.response?.data?.non_field_errors?.[0] || 'Failed to log manual time'),
  });

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'low');
    setDueDate(task.due_date ? toLocalDatetimeInput(task.due_date) : '');
    setActiveTab('overview');
    window.setTimeout(() => titleRef.current?.focus(), 180);
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

  const invalidateTaskDetails = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['taskChecklists', taskId] });
    queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
    queryClient.invalidateQueries({ queryKey: ['taskActivities', taskId] });
  };

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Task>) => updateTask(task!.id, patch),
    onSuccess: invalidateTaskDetails,
    onError: (error: any) => toast.error(error.response?.data?.detail || error.message || 'Could not update task.'),
  });

  const blockerMutation = useMutation({
    mutationFn: (blocked: boolean) => markTaskBlocked(task!.id, blocked),
    onMutate: (blocked) => onPatch(task!.id, { is_blocked: blocked }),
    onSuccess: invalidateTaskDetails,
    onError: (error: any, blocked) => {
      onPatch(task!.id, { is_blocked: !blocked });
      toast.error(error.response?.data?.detail || error.message || 'Could not update blocker state.');
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => addComment(task!.id, commentText.trim(), selectedFile || undefined),
    onSuccess: () => {
      setCommentText('');
      setSelectedFile(null);
      invalidateTaskDetails();
      toast.success('Comment added');
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || error.message || 'Could not add comment.'),
  });

  const checklistAddMutation = useMutation({
    mutationFn: (value: string) => addChecklistItem(task!.id, value),
    onSuccess: () => {
      setChecklistText('');
      invalidateTaskDetails();
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || error.message || 'Could not add checklist item.'),
  });

  const checklistToggleMutation = useMutation({
    mutationFn: ({ id, completed: _completed }: { id: string | number; completed: boolean }) => toggleChecklistItem(id),
    onSuccess: invalidateTaskDetails,
    onError: (error: any) => toast.error(error.response?.data?.detail || error.message || 'Could not update checklist item.'),
  });

  const checklistDeleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteChecklistItem(id),
    onSuccess: invalidateTaskDetails,
    onError: (error: any) => toast.error(error.response?.data?.detail || error.message || 'Could not delete checklist item.'),
  });

  const save = (patch: Partial<Task>) => {
    onPatch(task!.id, patch);
    updateMutation.mutate(patch);
  };

  const elapsedSeconds = useMemo(() => {
    if (!task) return 0;
    if (timerBelongsToTask && activeTimer) {
      const startedAt = new Date(activeTimer.start_time).getTime();
      return Math.max(0, Math.floor((now - startedAt) / 1000) + Number(activeTimer.duration_seconds || 0));
    }
    return Number(task.spent_seconds || 0);
  }, [activeTimer, now, task, timerBelongsToTask]);

  if (!task) return null;

  const checklistDone = checklists.filter((item) => item.is_completed).length;
  const checklistProgress = checklists.length ? Math.round((checklistDone / checklists.length) * 100) : 0;
  const assignee = task.assignee_detail;
  const isBusy = updateMutation.isPending || blockerMutation.isPending;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] bg-slate-950/20 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <motion.aside ref={sheetRef} role="dialog" aria-modal="true" aria-label={`Task details: ${task.title}`} className="absolute inset-y-0 end-0 flex w-full max-w-3xl flex-col border-s border-base-content/10 bg-base-100 shadow-2xl shadow-slate-950/20" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={spring}>
          <header className="flex shrink-0 items-center justify-between border-b border-base-content/10 px-5 py-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3"><span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">{task.key}</span><span className="truncate text-xs font-semibold text-base-content/45">{task.status_detail?.name || 'No status'}</span>{task.is_blocked && <span className="rounded-md bg-warning/12 px-2 py-1 text-[10px] font-bold text-warning">Blocked</span>}</div>
            <button type="button" onClick={onClose} className="motion-interactive rounded-xl p-2 text-base-content/45 hover:bg-base-200 hover:text-base-content" aria-label="Close task details"><CloseSquare size={21} /></button>
          </header>

          <div className="flex shrink-0 gap-1 border-b border-base-content/10 px-5 pt-2 sm:px-8">
            {([['overview', 'Overview'], ['comments', `Comments${comments.length ? ` · ${comments.length}` : ''}`], ['activity', 'Activity']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setActiveTab(value)} className={`motion-interactive border-b-2 px-3 py-3 text-xs font-bold ${activeTab === value ? 'border-primary text-primary' : 'border-transparent text-base-content/45 hover:text-base-content'}`}>{label}</button>)}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-7 flex items-start gap-3"><span className={`mt-2.5 h-3 w-3 shrink-0 rounded-full ${task.is_finished ? 'bg-success' : task.is_blocked ? 'bg-error' : 'bg-primary'}`} /><input ref={titleRef} value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => title.trim() && title.trim() !== task.title && save({ title: title.trim() })} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} dir="auto" className="w-full bg-transparent text-2xl font-bold leading-tight tracking-tight text-base-content outline-none placeholder:text-base-content/30 sm:text-3xl" placeholder="Untitled task" /></div>

            {focusMode && <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/8 p-4 text-primary"><p className="text-[10px] font-bold uppercase tracking-[0.18em]">Focus mode</p><p className="mt-1 text-sm font-semibold">Keep one clear next step in view.</p></div>}

            {activeTab === 'overview' && <>
              <div className="mb-7 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => timerIsRunning ? onStopTimer?.(task.id) : onPlayTimer?.(task.id)} className={`motion-interactive inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${timerIsRunning ? 'bg-error/10 text-error' : 'bg-primary text-primary-content shadow-lg shadow-primary/15'}`}>{timerIsRunning ? <Stop size={15} /> : <Play size={15} />}{timerIsRunning ? 'Stop timer' : 'Start timer'}</button>
                {timerIsRunning && <span className="rounded-xl bg-success/10 px-3 py-2.5 font-mono text-xs font-bold tabular-nums text-success">{formatTime(elapsedSeconds)}</span>}
                <button type="button" onClick={() => blockerMutation.mutate(!task.is_blocked)} className={`motion-interactive inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold ${task.is_blocked ? 'border-error/25 bg-error/10 text-error' : 'border-base-content/10 text-base-content/55 hover:border-error/25 hover:text-error'}`}><Danger size={15} />{task.is_blocked ? 'Remove blocker' : 'Add blocker'}</button>
              </div>

              <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="rounded-2xl border border-base-content/10 bg-base-200/60 p-3"><span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-base-content/40">Priority</span><select value={priority} onChange={(event) => { const value = event.target.value as Task['priority']; setPriority(value); save({ priority: value }); }} className="w-full bg-transparent text-sm font-bold capitalize text-base-content outline-none"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                <label className="rounded-2xl border border-base-content/10 bg-base-200/60 p-3"><span className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-base-content/40"><Calendar size={12} /> Due date</span><input type="datetime-local" value={dueDate} onChange={(event) => { setDueDate(event.target.value); save({ due_date: event.target.value ? new Date(event.target.value).toISOString() : undefined }); }} className="w-full bg-transparent text-xs font-bold text-base-content outline-none" /></label>
                <div className="rounded-2xl border border-base-content/10 bg-base-200/60 p-3 relative group">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-base-content/40">Time logged</span>
                    <button type="button" onClick={() => setIsManualTimeOpen(true)} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary transition-colors hover:bg-primary/20">
                      <Add size={12} /> Add
                    </button>
                  </div>
                  <strong className="font-mono text-sm tabular-nums text-base-content">{formatTime(elapsedSeconds)}</strong>
                  {isManualTimeOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsManualTimeOpen(false)} />
                      <div className="absolute top-full left-0 mt-2 z-50 w-48 rounded-xl border border-base-content/10 bg-base-100 p-3 shadow-xl">
                        <div className="mb-2 flex gap-2">
                          <label className="flex-1"><span className="text-[10px] text-base-content/60">Hours</span><input type="number" min="0" value={manualHours} onChange={e => setManualHours(e.target.value)} className="w-full rounded bg-base-200 px-2 py-1 text-sm outline-none" /></label>
                          <label className="flex-1"><span className="text-[10px] text-base-content/60">Mins</span><input type="number" min="0" max="59" value={manualMinutes} onChange={e => setManualMinutes(e.target.value)} className="w-full rounded bg-base-200 px-2 py-1 text-sm outline-none" /></label>
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
                              updateMutation.mutate({ spent_hours: Number(newTotal.toFixed(2)) }, {
                                onSuccess: () => {
                                  toast.success('Task total time updated');
                                  setIsManualTimeOpen(false);
                                }
                              });
                            }
                          }}
                          disabled={manualTimeMutation.isPending || updateMutation.isPending}
                          className="w-full rounded-lg bg-primary py-1.5 text-xs font-bold text-primary-content disabled:opacity-50"
                        >
                          Log time
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="rounded-2xl border border-base-content/10 bg-base-200/60 p-3"><span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-base-content/40">Checklist</span><strong className="text-sm text-base-content">{checklistDone}/{checklists.length || task.checklist_stats?.total || 0}</strong></div>
              </section>

              <section className="mb-7">
                <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-base-content">Description</h3></div>
                <div className="rounded-2xl border border-base-content/10 bg-base-200/50 p-3 focus-within:border-primary/35">
                  <textarea dir="auto" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context, links, or acceptance criteria…" className="min-h-24 w-full resize-none bg-transparent p-1 text-sm leading-6 text-base-content outline-none placeholder:text-base-content/35" />
                  <div className="flex items-center justify-end border-t border-base-content/8 pt-2">
                    <button type="button" onClick={() => save({ description })} disabled={description.trim() === (task.description || '').trim() || updateMutation.isPending} className="motion-interactive inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-content disabled:opacity-40 hover:opacity-90 transition-opacity"><Send2 size={15} />{updateMutation.isPending ? 'Saving…' : 'Save'}</button>
                  </div>
                </div>
              </section>

              <section className="mb-7 rounded-2xl border border-base-content/10 bg-base-200/35 p-4">
                <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><TaskSquare size={17} className="text-primary" /><div><h3 className="text-sm font-bold text-base-content">Checklist</h3><p className="text-[11px] text-base-content/40">{checklistDone} of {checklists.length} complete</p></div></div><span className="text-xs font-bold text-primary">{checklistProgress}%</span></div>
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-base-200"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${checklistProgress}%` }} /></div>
                <div className="space-y-1">{isChecklistLoading && <div className="py-3 text-xs text-base-content/40">Loading checklist…</div>}{!isChecklistLoading && checklists.length === 0 && <div className="rounded-xl border border-dashed border-base-content/10 px-3 py-4 text-center text-xs text-base-content/40">Add the first step for this task.</div>}{checklists.map((item) => <div key={item.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-base-200/70"><button type="button" onClick={() => checklistToggleMutation.mutate({ id: item.id, completed: !item.is_completed })} className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${item.is_completed ? 'border-success bg-success text-success-content' : 'border-base-content/20 text-transparent hover:border-primary'}`} aria-label={item.is_completed ? `Mark ${item.description} incomplete` : `Mark ${item.description} complete`}>{item.is_completed && <TickCircle size={15} variant="Bold" />}</button><span className={`flex-1 text-sm ${item.is_completed ? 'text-base-content/40 line-through' : 'text-base-content/75'}`}>{item.description}</span><button type="button" onClick={() => checklistDeleteMutation.mutate(item.id)} className="rounded-lg p-1.5 text-base-content/25 opacity-0 transition hover:bg-error/10 hover:text-error group-hover:opacity-100" aria-label={`Delete ${item.description}`}><Trash size={14} /></button></div>)}</div>
                <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (checklistText.trim()) checklistAddMutation.mutate(checklistText.trim()); }}><input value={checklistText} onChange={(event) => setChecklistText(event.target.value)} placeholder="Add a checklist item" className="min-w-0 flex-1 rounded-xl border border-base-content/10 bg-base-100 px-3 py-2 text-xs text-base-content outline-none placeholder:text-base-content/35 focus:border-primary/40" /><button type="submit" disabled={!checklistText.trim() || checklistAddMutation.isPending} className="motion-interactive grid size-9 place-items-center rounded-xl bg-base-content text-base-100 disabled:opacity-40" aria-label="Add checklist item"><Add size={16} /></button></form>
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="rounded-2xl border border-base-content/10 bg-base-200/40 p-4 block">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-base-content/40">Assignee</span>
                  <select
                    value={assignee?.id || ''}
                    onChange={(e) => {
                      const newId = e.target.value;
                      const selectedMember = projectMembers.find(m => String(m.user?.id) === newId);
                      save({
                        assignee: newId ? newId : null,
                        assignee_detail: selectedMember?.user || null
                      } as any);
                    }}
                    className="w-full bg-transparent text-sm font-semibold text-base-content outline-none"
                  >
                    <option value="">Unassigned</option>
                    {projectMembers.map(m => m.user && (
                      <option key={m.id} value={m.user.id}>
                        {m.user.first_name || m.user.username} {m.user.last_name || ''}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-2xl border border-base-content/10 bg-base-200/40 p-4"><span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-base-content/40">Due</span><p className="text-sm font-semibold text-base-content">{formatDate(task.due_date)}</p></div>
              </div>
            </>}

            {activeTab === 'comments' && <section><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold text-base-content">Comments</h2><p className="mt-1 text-xs text-base-content/40">Keep the context with the work.</p></div><span className="rounded-full bg-base-200 px-2.5 py-1 text-[11px] font-bold text-base-content/50">{comments.length}</span></div><form onSubmit={(event) => { event.preventDefault(); if (commentText.trim() || selectedFile) commentMutation.mutate(); }} className="mb-6 rounded-2xl border border-base-content/10 bg-base-200/50 p-3 focus-within:border-primary/35"><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Write a comment…" className="min-h-24 w-full resize-none bg-transparent p-1 text-sm leading-6 text-base-content outline-none placeholder:text-base-content/35" />{selectedFile && <div className="mb-2 flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary"><span className="truncate">{selectedFile.name}</span><button type="button" onClick={() => setSelectedFile(null)} aria-label="Remove attachment"><CloseSquare size={14} /></button></div>}<div className="flex items-center justify-between border-t border-base-content/8 pt-2"><div><input ref={fileInputRef} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.zip,.doc,.docx,.xls,.xlsx" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size <= 5 * 1024 * 1024) setSelectedFile(file); else if (file) toast.error('File size must be less than 5MB.'); event.target.value = ''; }} /><button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg p-2 text-base-content/35 hover:bg-base-200 hover:text-primary" aria-label="Attach file"><Paperclip2 size={17} /></button></div><button type="submit" disabled={commentMutation.isPending || (!commentText.trim() && !selectedFile)} className="motion-interactive inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-content disabled:opacity-40"><Send2 size={15} />{commentMutation.isPending ? 'Sending…' : 'Comment'}</button></div></form><div className="space-y-3">{isCommentsLoading && <div className="py-6 text-center text-xs text-base-content/40">Loading comments…</div>}{!isCommentsLoading && comments.length === 0 && <div className="rounded-2xl border border-dashed border-base-content/10 px-4 py-10 text-center text-sm text-base-content/40">No comments yet.</div>}{comments.map((comment) => <article key={comment.id} className="rounded-2xl border border-base-content/10 bg-base-100 p-4"><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{initials(comment.author_detail?.first_name, comment.author_detail?.last_name, comment.author_detail?.username)}</span><div className="min-w-0"><p className="truncate text-xs font-bold text-base-content">{comment.author_detail?.first_name || comment.author_detail?.username || 'User'}{comment.author_detail?.last_name ? ` ${comment.author_detail.last_name}` : ''}</p><p className="text-[10px] text-base-content/35">{formatRelativeDate(comment.created_at)}</p></div></div><p dir="auto" className="mt-3 whitespace-pre-wrap text-sm leading-6 text-base-content/70">{comment.content || 'Attachment'}</p>{comment.attached_file_url && <a href={comment.attached_file_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-base-200 px-2.5 py-1.5 text-[11px] font-semibold text-primary"><Paperclip2 size={13} />Attachment</a>}</article>)}</div></section>}

            {activeTab === 'activity' && <section><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Activity size={20} /></span><div><h2 className="text-lg font-bold text-base-content">Activity log</h2><p className="mt-1 text-xs text-base-content/40">A clear history of changes to this task.</p></div></div><div className="relative ms-4 border-s border-base-content/10 ps-6">{isActivitiesLoading && <div className="py-6 text-xs text-base-content/40">Loading activity…</div>}{!isActivitiesLoading && activities.length === 0 && <div className="rounded-2xl border border-dashed border-base-content/10 px-4 py-10 text-center text-sm text-base-content/40">No activity recorded yet.</div>}{activities.map((activity) => <article key={activity.id} className="relative mb-5 last:mb-0"><span className="absolute -start-[31px] top-1.5 size-2.5 rounded-full border-2 border-base-100 bg-primary" /><p className="text-sm leading-6 text-base-content/70">{activity.action}</p><p className="mt-1 text-[11px] text-base-content/35">{activity.actor_detail?.first_name || activity.actor_detail?.username || 'Someone'} · {formatRelativeDate(activity.created_at)}</p></article>)}</div></section>}
          </div>

          <footer className="flex shrink-0 items-center justify-between border-t border-base-content/10 px-5 py-3 text-[11px] text-base-content/40 sm:px-8"><span>{isBusy ? 'Saving changes…' : 'Changes are saved automatically'}</span><span className="hidden items-center gap-1 sm:flex"><Timer1 size={13} /> {formatTime(elapsedSeconds)} logged</span></footer>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
};
