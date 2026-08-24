import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoards, getTasks, moveTask, createTask, reorderTasks, createStatus, updateTask } from '../api/tasksApi';
import { getActiveTimers, startTimer, stopTimer } from '../../attendance/api/attendanceApi';
import type { TimeLog } from '../../attendance/types';
import { useTaskStore } from '../store/useTaskStore';
import { useAuthStore } from '../../auth/store/authStore';
import { TaskCard } from './TaskCard';
import { TaskSheet } from './TaskSheet';
import { DroppableColumn } from './DroppableColumn';
import type { Task } from '../types';

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableTask } from './SortableTask';
import { Add, More, SearchNormal1 } from 'iconsax-reactjs';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export const KanbanBoard: React.FC = () => {
  const { activeProjectId, activeBoardId, selectedTaskId, setSelectedTaskId } = useTaskStore();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const selectedTaskIdParam = selectedTaskId;
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'priority'>('all');
  const [focusMode, setFocusMode] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | number | null>(null);

  const setSelectedTaskForSheet = (task: Task | null) => {
    setSelectedTaskId(task ? task.id.toString() : null);
  };

  // Add task state

  const [addingTaskToStatusId, setAddingTaskToStatusId] = useState<string | number | null>(null);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const sameId = (left: string | number | undefined, right: string | number | undefined) => left?.toString() === right?.toString();

  const { data: boards } = useQuery({
    queryKey: ['boards', activeProjectId],
    queryFn: () => getBoards(activeProjectId!),
    enabled: !!activeProjectId,
  });

  const { data: serverTasks } = useQuery({
    queryKey: ['tasks', activeProjectId, activeBoardId],
    queryFn: () => getTasks(activeProjectId!, activeBoardId!),
    enabled: !!activeProjectId && !!activeBoardId,
  });

  const { data: activeTimers = [] } = useQuery<TimeLog[]>({
    queryKey: ['activeTimers'],
    queryFn: getActiveTimers,
    refetchInterval: 15000,
  });

  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (serverTasks && !isDraggingRef.current) {
      setLocalTasks(serverTasks);
    }
  }, [serverTasks]);

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, statusId, order }: { taskId: string | number, statusId: string | number, order: number }) => moveTask(taskId, statusId, order),
    onMutate: async ({ taskId, statusId }) => {
      const activeBoard = boards?.find(b => b.id.toString() === activeBoardId);
      const targetStatus = activeBoard?.statuses.find(s => sameId(s.id, statusId));
      const isDoing = targetStatus && (targetStatus.code === 'doing' || targetStatus.name.toLowerCase() === 'doing' || targetStatus.name.toLowerCase() === 'in progress');
      const isReviewOrDone = targetStatus && (targetStatus.code === 'review' || targetStatus.code === 'done' || targetStatus.name.toLowerCase() === 'review' || targetStatus.name.toLowerCase() === 'done');
      const isDone = targetStatus && (targetStatus.code === 'done' || targetStatus.name.toLowerCase() === 'done');

      setLocalTasks(tasks => tasks.map(t => {
        if (sameId(t.id, taskId)) {
          return {
            ...t,
            is_finished: Boolean(isDone),
            status_detail: targetStatus ? (targetStatus as any) : t.status_detail,
            is_active_timer_running: isDoing ? true : (isReviewOrDone ? false : t.is_active_timer_running)
          };
        }
        if (isDoing) {
          return { ...t, is_active_timer_running: false };
        }
        return t;
      }));

      return { previousTasks: serverTasks };
    },
    onError: (err: any, _newMove, context: any) => {
      const errorData = err.response?.data;
      const errorMessage = errorData?.detail || errorData?.error || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData)) || err.message || 'Failed to move task';
      console.error('Move task error:', err.response?.status, errorData);
      toast.error(errorMessage);
      if (context?.previousTasks) {
        setLocalTasks(context.previousTasks);
        queryClient.setQueryData(['tasks', activeProjectId, activeBoardId], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId, activeBoardId] });
      queryClient.invalidateQueries({ queryKey: ['activeTimers'] });
      queryClient.invalidateQueries({ queryKey: ['employee-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceTasks'] });
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: (orders: { id: string | number; order: number }[]) => reorderTasks(orders as any),
    onMutate: async () => {
      return { previousTasks: serverTasks };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previousTasks) {
        setLocalTasks(context.previousTasks);
        queryClient.setQueryData(['tasks', activeProjectId, activeBoardId], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId, activeBoardId] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: ({ title, statusId, priority }: { title: string, statusId: string | number, priority: string }) => createTask(activeProjectId!, title, statusId, priority),
    onMutate: async ({ title, statusId, priority }) => {
      const queryKey = ['tasks', activeProjectId, activeBoardId];
      await queryClient.cancelQueries({ queryKey });
      const previousTasks = (queryClient.getQueryData<Task[]>(queryKey) || localTasks);
      const status = boards?.find(board => board.id.toString() === activeBoardId)?.statuses.find(item => item.id.toString() === statusId.toString());
      const optimisticTask: Task = {
        id: `optimistic-${Date.now()}`,
        key: 'NEW',
        title,
        priority: priority as Task['priority'],
        status_detail: status,
        is_finished: false,
        is_blocked: false,
        progress_percent: 0,
        subtasks_count: 0,
        order: previousTasks.filter(task => task.status_detail?.id?.toString() === statusId.toString()).length,
      };
      const nextTasks = [...previousTasks, optimisticTask];
      queryClient.setQueryData(queryKey, nextTasks);
      setLocalTasks(nextTasks);
      return { previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId, activeBoardId] });
      setAddingTaskToStatusId(null);
      setNewTaskTitle('');
      setNewTaskPriority('low');
    },
    onError: (err: any, _variables, context: any) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', activeProjectId, activeBoardId], context.previousTasks);
        setLocalTasks(context.previousTasks);
      }
      toast.error(err.response?.data?.detail || err.message || 'Error creating task.');
    }
  });

  const handleCreateTask = (statusId: string | number) => {
    if (!newTaskTitle.trim()) {
      setAddingTaskToStatusId(null);
      return;
    }
    createTaskMutation.mutate({ title: newTaskTitle, statusId, priority: newTaskPriority });
  };

  const startTimerMutation = useMutation({
    mutationFn: (taskId: string | number) => startTimer(taskId),
    onMutate: async (taskId) => {
      // Find "doing" or "in progress" status IN THE ACTIVE BOARD
      const activeBoard = boards?.find(b => b.id.toString() === activeBoardId);
      const doingStatus = activeBoard?.statuses.find(s => s.code === 'doing' || s.name.toLowerCase() === 'doing' || s.name.toLowerCase() === 'in progress');

      const previousTasks = [...localTasks];

      // Optimistically start the timer and move task to doing if needed
      setLocalTasks(tasks => tasks.map(t => {
        if (sameId(t.id, taskId)) {
          const updatedTask = { ...t, is_active_timer_running: true };
          const isTodo = t.status_detail?.code?.toLowerCase() === 'todo' || t.status_detail?.name?.toLowerCase() === 'to do';
          if (doingStatus && !sameId(t.status_detail?.id, doingStatus.id) && isTodo) {
            updatedTask.status_detail = doingStatus as any;
          }
          return updatedTask;
        }
        return t;
      }));

      return { previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId, activeBoardId] });
      queryClient.invalidateQueries({ queryKey: ['activeTimers'] });
      queryClient.invalidateQueries({ queryKey: ['employee-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceTasks'] });
      queryClient.invalidateQueries({ queryKey: ['live-activity'] });
    },
    onError: (err: any, taskId, context: any) => {
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to start timer';
      toast.error(errorMessage);
      // Revert completely
      if (context?.previousTasks) {
        setLocalTasks(context.previousTasks);
      } else {
        setLocalTasks(tasks => tasks.map(t => sameId(t.id, taskId) ? { ...t, is_active_timer_running: false } : t));
      }
    }
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (taskId: string | number) => {
      // Find the specific timer for this task
      const queryClientTasks = queryClient.getQueryData<TimeLog[]>(['activeTimers']) || [];
      const timer = queryClientTasks.find(t => sameId(t.task, taskId));
      if (!timer) throw new Error("Active timer not found for this task");
      return stopTimer(timer.id);
    },
    onMutate: async (taskId) => {
      setLocalTasks(tasks => tasks.map(t => sameId(t.id, taskId) ? { ...t, is_active_timer_running: false } : t));
    },
    onSuccess: (data, taskId) => {
      if (data && data.duration_seconds !== undefined) {
        setLocalTasks(tasks => tasks.map(t => {
          if (sameId(t.id, taskId)) {
            const currentSpent = Number(t.spent_seconds || 0);
            const newSpent = currentSpent + data.duration_seconds;
            return { ...t, spent_seconds: newSpent };
          }
          return t;
        }));
      }
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId, activeBoardId] });
      queryClient.invalidateQueries({ queryKey: ['activeTimers'] });
      queryClient.invalidateQueries({ queryKey: ['employee-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      queryClient.invalidateQueries({ queryKey: ['standup-grid'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceTasks'] });
      queryClient.invalidateQueries({ queryKey: ['live-activity'] });
    },
    onError: (err: any, taskId) => {
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to stop timer';
      toast.error(errorMessage);
      // Revert
      setLocalTasks(tasks => tasks.map(t => sameId(t.id, taskId) ? { ...t, is_active_timer_running: true } : t));
    }
  });

  const handlePlayTimer = (taskId: string | number) => {
    const task = localTasks.find(t => sameId(t.id, taskId));
    if (!task) return;

    // Find "doing" or "in progress" status IN THE ACTIVE BOARD
    const activeBoard = boards?.find(b => b.id.toString() === activeBoardId);
    const doingStatus = activeBoard?.statuses.find(s => s.code === 'doing' || s.name.toLowerCase() === 'doing' || s.name.toLowerCase() === 'in progress');

    // If we have a doing status and the task is not already in it, move it optimistically
    if (doingStatus && !sameId(task.status_detail?.id, doingStatus.id)) {
      // Optimistic update (backend will auto-move it to doing when we start the timer)
      setLocalTasks(tasks => {
        const newTasks = [...tasks];
        const index = newTasks.findIndex(t => sameId(t.id, taskId));
        if (index !== -1) {
          newTasks[index] = { ...newTasks[index], status_detail: doingStatus as any };
        }
        return newTasks;
      });
    }

    startTimerMutation.mutate(taskId);
  };

  const handleStopTimer = (taskId: string | number) => {
    stopTimerMutation.mutate(taskId);
  };

  const patchLocalTask = (taskId: string | number, patch: Partial<Task>) => {
    setLocalTasks(tasks => tasks.map(task => task.id === taskId ? { ...task, ...patch } : task));
    queryClient.setQueryData<Task[]>(['tasks', activeProjectId, activeBoardId], tasks => tasks?.map(task => task.id === taskId ? { ...task, ...patch } : task));
  };

  const toggleFinishedMutation = useMutation({
    mutationFn: ({ taskId, isFinished }: { taskId: string | number; isFinished: boolean }) =>
      updateTask(taskId, { is_finished: isFinished }),
    onMutate: async ({ taskId, isFinished }) => {
      const queryKey = ['tasks', activeProjectId, activeBoardId];
      await queryClient.cancelQueries({ queryKey });
      const previousTasks = queryClient.getQueryData<Task[]>(queryKey) || localTasks;

      const nextTasks = localTasks.map(t =>
        sameId(t.id, taskId) ? { ...t, is_finished: isFinished } : t
      );
      setLocalTasks(nextTasks);
      queryClient.setQueryData(queryKey, nextTasks);

      return { previousTasks };
    },
    onError: (err: any, _vars, context: any) => {
      if (context?.previousTasks) {
        setLocalTasks(context.previousTasks);
        queryClient.setQueryData(['tasks', activeProjectId, activeBoardId], context.previousTasks);
      }
      toast.error(err?.response?.data?.detail || 'Failed to update task completion');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId, activeBoardId] });
    }
  });

  const handleToggleDone = (taskId: string | number) => {
    const task = localTasks.find(t => sameId(t.id, taskId));
    if (!task) return;

    const newFinished = !task.is_finished;
    toggleFinishedMutation.mutate({ taskId, isFinished: newFinished });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Helper: find which status a task or column id belongs to
  const findStatusId = (id: string): string | null => {
    if (id.startsWith('col-')) {
      return id.replace('col-', '');
    }
    const task = localTasks.find(t => t.id.toString() === id);
    return task?.status_detail?.id?.toString() || null;
  };


  const createStatusMutation = useMutation({
    mutationFn: (name: string) => createStatus(activeBoardId!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setIsAddingStatus(false);
      setNewStatusName('');
      toast.success('Status added successfully');
    },
    onError: (err: any) => {
      const errorData = err.response?.data;
      const errorMessage =
        errorData?.detail ||
        errorData?.non_field_errors?.[0] ||
        errorData?.code?.[0] ||
        errorData?.name?.[0] ||
        err.message ||
        'Failed to add status';
      toast.error(errorMessage);
    }
  });

  const handleCreateStatus = () => {
    if (!newStatusName.trim() || createStatusMutation.isPending) return;
    createStatusMutation.mutate(newStatusName);
  };

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
    const { active } = event;
    const task = localTasks.find(t => t.id.toString() === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId === overId) return;

    const activeStatusId = findStatusId(activeId);
    const overStatusId = findStatusId(overId);

    if (!activeStatusId || !overStatusId || activeStatusId === overStatusId) return;

    // Cross-column move: update the task's status_detail locally
    const statusDetail = boards?.flatMap(b => b.statuses).find(s => sameId(s.id, overStatusId));
    if (!statusDetail) return;

    setLocalTasks((tasks) => {
      const activeIndex = tasks.findIndex(t => t.id.toString() === activeId);
      if (activeIndex === -1) return tasks;

      const newTasks = [...tasks];
      newTasks[activeIndex] = {
        ...newTasks[activeIndex],
        status_detail: statusDetail as any
      };

      // If dropping over a task, reorder near it
      if (!overId.startsWith('col-')) {
        const overIndex = newTasks.findIndex(t => t.id.toString() === overId);
        if (overIndex !== -1) {
          return arrayMove(newTasks, activeIndex, overIndex);
        }
      }

      return newTasks;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    isDraggingRef.current = false;
    const { active, over } = event;
    if (!over) {
      // Snap back
      setLocalTasks(serverTasks || []);
      setActiveTask(null);
      return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const movedTask = localTasks.find(t => t.id.toString() === activeId) || activeTask;
    if (!movedTask) {
      setActiveTask(null);
      return;
    }

    // Use findStatusId to reliably get the target column, bypassing stale localTasks for the dragged item
    const overStatusId = findStatusId(overId);
    const newStatusId = overStatusId || movedTask.status_detail?.id;

    if (!newStatusId) {
      setActiveTask(null);
      return;
    }

    let finalTasks = [...localTasks];
    const activeIndex = finalTasks.findIndex(t => t.id.toString() === activeId);

    if (activeIndex !== -1) {
      // Ensure the dragged task has the correct target status (in case handleDragOver state update was batched/stale)
      const targetStatusDetail = boards?.flatMap(b => b.statuses).find(s => sameId(s.id, newStatusId));
      if (targetStatusDetail) {
        finalTasks[activeIndex] = { ...finalTasks[activeIndex], status_detail: targetStatusDetail as any };
      }

      // If dropped over a specific task (not just the column), reorder it relative to that task
      if (!overId.startsWith('col-') && activeId !== overId) {
        const overIndex = finalTasks.findIndex(t => t.id.toString() === overId);
        if (overIndex !== -1) {
          finalTasks = arrayMove(finalTasks, activeIndex, overIndex);
        }
      }
    }

    // Recalculate orders for the target column
    const columnTasks = finalTasks.filter(t => sameId(t.status_detail?.id, newStatusId));
    const newColumnOrders = columnTasks.map((t, idx) => ({ id: t.id, order: idx }));

    // Apply orders locally
    setLocalTasks(finalTasks.map(t => {
      const orderEntry = newColumnOrders.find(o => sameId(o.id, t.id));
      if (orderEntry) {
        return { ...t, order: orderEntry.order };
      }
      return t;
    }));

    // Use activeTask's original status to determine if it was a cross-column move
    // This avoids stale state bugs if handleDragOver mutated localTasks during hover
    const wasCrossColumn = activeTask && !sameId(activeTask.status_detail?.id, newStatusId);

    if (wasCrossColumn) {
      const newOrder = newColumnOrders.find(o => sameId(o.id, movedTask.id))?.order || 0;
      moveTaskMutation.mutate({
        taskId: movedTask.id,
        statusId: newStatusId,
        order: newOrder
      });
    } else {
      // Same column reorder
      if (activeId !== overId) {
        reorderTasksMutation.mutate(newColumnOrders);
      }
    }

    setActiveTask(null);
  };

  if (!activeProjectId || !activeBoardId) return null;
  if (!boards || boards.length === 0) return <div className="p-8 text-center text-base-content/45">No boards found for this project.</div>;

  const board = boards.find(b => b.id.toString() === activeBoardId) || boards[0];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const currentUser = useAuthStore((state) => state.user);
  const filteredTasks = localTasks.filter(task => {
    const matchesSearch = !normalizedSearch || `${task.title} ${task.key}`.toLowerCase().includes(normalizedSearch);
    const matchesFilter = filter === 'all'
      || (filter === 'active' && !task.is_finished && task.status_detail?.code !== 'done')
      || (filter === 'my-tasks' && Boolean(currentUser?.id) && (task.assignee_detail?.id === currentUser?.id || task.assignee === currentUser?.id))
      || (filter === 'blocked' && task.is_blocked)
      || (filter === 'priority' && ['high', 'critical'].includes(task.priority));
    return matchesSearch && matchesFilter;
  });
  const focusTask = filteredTasks.find(task => task.id === focusedTaskId) || filteredTasks[0];
  const completedCount = localTasks.filter(task => task.is_finished || task.status_detail?.code?.toLowerCase() === 'done').length;
  const boardProgress = localTasks.length > 0 ? Math.round((completedCount / localTasks.length) * 100) : 0;

  const getStatusColor = (statusName: string, boardBg?: string) => {
    if (boardBg && boardBg.startsWith('#')) return boardBg;
    const lc = statusName.toLowerCase();
    if (lc.includes('todo') || lc.includes('backlog')) return '#94a3b8';
    if (lc.includes('doing') || lc.includes('progress')) return '#3b82f6';
    if (lc.includes('review')) return '#a855f7';
    if (lc.includes('done') || lc.includes('complete')) return '#10b981';
    if (lc.includes('block')) return '#ef4444';
    return '#6366f1';
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-base-200">
      {/* ─── Streamlined Linear-Style Toolbar ─── */}
      <div className="shrink-0 border-b border-base-content/10 bg-base-100/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Quick Filters & Board Progress */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1 rounded-xl bg-base-200/80 p-1">
              {(['all', 'active', 'my-tasks', 'blocked', 'priority'] as const).map((item) => {
                const labels: Record<string, string> = {
                  all: 'All',
                  active: 'Active',
                  'my-tasks': 'My Tasks 👤',
                  blocked: 'Blocked ⚠️',
                  priority: 'High Priority 🔥',
                };
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      filter === item
                        ? 'bg-base-100 text-primary shadow-xs'
                        : 'text-base-content/50 hover:text-base-content'
                    }`}
                  >
                    {labels[item]}
                  </button>
                );
              })}
            </div>

            {/* Progress Bar & Stats */}
            {localTasks.length > 0 && (
              <div className="hidden items-center gap-2 rounded-xl bg-base-200/50 px-3 py-1 md:flex">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-base-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${boardProgress}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-emerald-600">{boardProgress}%</span>
                <span className="text-[11px] font-semibold text-base-content/40">
                  ({completedCount}/{localTasks.length} done)
                </span>
              </div>
            )}
          </div>

          {/* Right: Search + Focus + Quick Add */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Compact Search Box */}
            <label className="flex h-8.5 items-center gap-2 rounded-xl border border-base-content/10 bg-base-200/70 px-2.5 text-base-content/45 focus-within:border-primary/40 focus-within:bg-base-100 w-36 sm:w-52 transition-all">
              <SearchNormal1 size={14} />
              <input
                aria-label="Search tasks"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-transparent text-xs font-medium text-base-content outline-none placeholder:text-base-content/35"
              />
            </label>

            {/* Focus Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !focusMode;
                setFocusMode(next);
                if (next && !focusedTaskId) setFocusedTaskId(focusTask?.id || null);
              }}
              className={`inline-flex h-8.5 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition-all ${
                focusMode
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-base-content/10 text-base-content/55 hover:border-primary/30 hover:text-primary'
              }`}
              title="Focus Mode"
            >
              <span className="text-sm">◉</span>
              <span className="hidden sm:inline">{focusMode ? 'Exit Focus' : 'Focus'}</span>
            </button>

            {/* Quick Add Button */}
            <button
              type="button"
              onClick={() => setAddingTaskToStatusId(board.statuses[0]?.id || null)}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-content shadow-md shadow-primary/15 hover:bg-primary/90 transition-all"
            >
              <Add size={15} />
              <span>New Task</span>
            </button>
          </div>
        </div>
      </div>

      {focusMode && focusTask ? (
        <div className="flex flex-1 items-center justify-center overflow-auto p-6 sm:p-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="madaar-surface w-full max-w-2xl p-6 sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Focus mode</p><p className="mt-2 text-sm text-base-content/45">One task, one clear next step.</p></div><button type="button" onClick={() => setFocusMode(false)} className="motion-interactive rounded-xl border border-base-content/10 px-3 py-2 text-xs font-bold text-base-content/55 hover:text-base-content">Back to board</button></div>
            <span className="text-xs font-bold text-primary">{focusTask.key} · {focusTask.status_detail?.name || 'No status'}</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-base-content">{focusTask.title}</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-base-content/55">{focusTask.description || 'Open the task sheet to add context and define the next step.'}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3"><button type="button" onClick={() => focusTask.is_active_timer_running ? handleStopTimer(focusTask.id) : handlePlayTimer(focusTask.id)} className={`motion-interactive rounded-xl px-5 py-3 text-sm font-bold ${focusTask.is_active_timer_running ? 'bg-error/10 text-error' : 'bg-primary text-primary-content'}`}>{focusTask.is_active_timer_running ? 'Stop timer' : 'Start timer'}</button><button type="button" onClick={() => setSelectedTaskForSheet(focusTask)} className="motion-interactive rounded-xl border border-base-content/10 px-5 py-3 text-sm font-bold text-base-content/65 hover:border-primary/30 hover:text-primary">Open task sheet</button></div>
          </motion.div>
        </div>
      ) : <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex h-full items-start gap-3 p-4 pb-4 sm:gap-4 sm:p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {[...board.statuses].sort((a, b) => a.order - b.order).map((status) => {
            const columnTasks = filteredTasks.filter(t => t.status_detail?.id?.toString() === status.id.toString()) || [];
            const isDoneColumn = status.code === 'done' || status.name.toLowerCase() === 'done' || status.name.toLowerCase() === 'completed';
            const statusColor = getStatusColor(status.code, status.name);

            return (
              <DroppableColumn
                key={status.id}
                id={`col-${status.id}`}
                className={`min-w-[292px] w-[292px] rounded-[22px] p-3 flex flex-col h-fit max-h-full bg-base-100/80 border shadow-sm transition-opacity ${
                  isDoneColumn ? 'opacity-70 hover:opacity-100 border-emerald-500/15' : 'border-base-content/8'
                }`}
              >
                <div className="mb-3 flex shrink-0 items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: statusColor }}
                    />
                    <h3 className="text-sm font-semibold text-base-content">{status.name}</h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: `${statusColor}25`, color: statusColor }}
                    >
                      {columnTasks.length}
                    </span>
                  </div>
                  <span aria-hidden="true" className="rounded-lg p-1 text-base-content/25">
                    <More size={16} />
                  </span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden rounded-xl px-0.5 pb-1">
                  <SortableContext items={columnTasks.map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
                    {columnTasks.map(task => (
                      <SortableTask
                        key={task.id}
                        task={task}
                        onClick={() => { setSelectedTaskForSheet(task); if (focusMode) setFocusedTaskId(task.id); }}
                        onPlayTimer={handlePlayTimer}
                        onStopTimer={handleStopTimer}
                        onToggleDone={handleToggleDone}
                        activeTimer={activeTimers.find(t => t.task?.toString() === task.id?.toString()) || null}
                      />
                    ))}
                  </SortableContext>

                  {columnTasks.length === 0 && addingTaskToStatusId !== status.id && (
                    <div className="rounded-xl border border-dashed border-base-content/10 px-3 py-8 text-center text-[11px] font-semibold text-base-content/35">No tasks here</div>
                  )}

                  {addingTaskToStatusId === status.id && (
                    <div
                      className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5"
                      tabIndex={-1}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setAddingTaskToStatusId(null);
                          setNewTaskTitle('');
                          setNewTaskPriority('low');
                        }
                      }}
                    >
                      <input
                        autoFocus
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCreateTask(status.id);
                          if (e.key === 'Escape') {
                            setAddingTaskToStatusId(null);
                            setNewTaskTitle('');
                            setNewTaskPriority('low');
                          }
                        }}
                        placeholder="Task title..."
                        className="w-full bg-transparent text-[13px] font-medium text-base-content outline-none placeholder:text-base-content/40 placeholder:font-normal"
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value as any)}
                          className="h-7 cursor-pointer rounded-md border border-base-content/15 bg-base-100 px-2 text-[11px] font-medium text-base-content/70 outline-none transition-colors hover:bg-base-200 focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                          <option value="critical">Critical Priority</option>
                        </select>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => { setAddingTaskToStatusId(null); setNewTaskTitle(''); setNewTaskPriority('low'); }}
                            className="h-7 rounded-md px-2.5 text-[11px] font-medium text-base-content/60 transition-colors hover:bg-base-content/10 hover:text-base-content"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleCreateTask(status.id)}
                            disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                            className="h-7 rounded-md bg-primary px-3 text-[11px] font-bold text-primary-content shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {createTaskMutation.isPending ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {addingTaskToStatusId !== status.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingTaskToStatusId(status.id);
                      setNewTaskTitle('');
                      setNewTaskPriority('low');
                    }}
                    className="motion-interactive mt-1 flex shrink-0 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content/90"
                  >
                    <span className="text-lg leading-none mb-0.5">+</span>
                    <span>Add card</span>
                  </button>
                )}
              </DroppableColumn>
            );
          })}


          {isAddingStatus ? (
            <div className="madaar-surface min-w-[292px] w-[292px] rounded-[22px] p-3 flex flex-col h-fit max-h-full bg-base-100/80">
              <input
                autoFocus
                value={newStatusName}
                onChange={e => setNewStatusName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateStatus();
                  if (e.key === 'Escape') {
                    setIsAddingStatus(false);
                    setNewStatusName('');
                  }
                }}
                placeholder="Status name..."
                className="w-full bg-transparent text-[13px] text-base-content outline-none placeholder:text-base-content/35 px-2 py-1 mb-2 border border-base-content/10 rounded-lg"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateStatus}
                  disabled={!newStatusName.trim() || createStatusMutation.isPending}
                  className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-content transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 flex-1"
                >
                  {createStatusMutation.isPending ? '...' : 'Add Status'}
                </button>
                <button
                  onClick={() => { setIsAddingStatus(false); setNewStatusName(''); }}
                  className="px-3 py-1.5 text-[12px] text-base-content/45 transition-colors hover:text-base-content/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingStatus(true)}
              className="min-w-[292px] w-[292px] rounded-[22px] p-3 flex items-center justify-center gap-2 border-2 border-dashed border-base-content/10 text-base-content/45 hover:border-base-content/20 hover:bg-base-200/50 hover:text-base-content/60 transition-all h-[56px] font-semibold text-sm"
            >
              <span className="text-lg leading-none mb-0.5">+</span>
              Add Status
            </button>
          )}
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} onClick={() => {}} activeTimer={activeTimers.find(t => t.task?.toString() === activeTask.id?.toString()) || null} onToggleDone={handleToggleDone} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
      </div>}

      <TaskSheet
        task={selectedTaskIdParam ? localTasks.find(t => String(t.id) === selectedTaskIdParam) || null : null}
        onClose={() => setSelectedTaskForSheet(null)}
        onPatch={patchLocalTask}
        onPlayTimer={handlePlayTimer}
        onStopTimer={handleStopTimer}
        activeTimer={activeTimers.find(t => String(t.task) === selectedTaskIdParam) || null}
        focusMode={focusMode}
      />
    </div>
  );
};
