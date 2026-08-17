import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoards, getTasks, moveTask, createTask, reorderTasks } from '../api/tasksApi';
import { getActiveTimer, startTimer, stopTimer } from '../../attendance/api/attendanceApi';
import type { TimeLog } from '../../attendance/types';
import { useTaskStore } from '../store/useTaskStore';
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
  const { activeProjectId, activeBoardId } = useTaskStore();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskForSheet, setSelectedTaskForSheet] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'priority'>('all');
  const [focusMode, setFocusMode] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | number | null>(null);

  // Add task state
  const [addingTaskToStatusId, setAddingTaskToStatusId] = useState<string | number | null>(null);
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

  const { data: activeTimer = null } = useQuery<TimeLog | null>({
    queryKey: ['activeTimer'],
    queryFn: getActiveTimer,
    refetchInterval: 15_000,
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

      if (isDoing || isReviewOrDone) {
        setLocalTasks(tasks => tasks.map(t => {
          if (sameId(t.id, taskId)) {
            return { ...t, is_active_timer_running: isDoing ? true : false };
          }
          if (isDoing) {
             return { ...t, is_active_timer_running: false };
          }
          return t;
        }));
      }

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
      queryClient.invalidateQueries({ queryKey: ['activeTimer'] });
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

      // Stop all other timers optimistically first (only one can be active)
      // And if there's a doing status, move this task to doing
      setLocalTasks(tasks => tasks.map(t => {
        if (sameId(t.id, taskId)) {
          const updatedTask = { ...t, is_active_timer_running: true };
          const isTodo = t.status_detail?.code?.toLowerCase() === 'todo' || t.status_detail?.name?.toLowerCase() === 'to do';
          if (doingStatus && !sameId(t.status_detail?.id, doingStatus.id) && isTodo) {
            updatedTask.status_detail = doingStatus as any;
          }
          return updatedTask;
        }
        return { ...t, is_active_timer_running: false };
      }));

      return { previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId, activeBoardId] });
      queryClient.invalidateQueries({ queryKey: ['activeTimer'] });
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: (_taskId: string | number) => stopTimer(),
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
      queryClient.invalidateQueries({ queryKey: ['activeTimer'] });
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

  const handleMarkDone = (taskId: string | number) => {
    const activeBoard = boards?.find(b => b.id.toString() === activeBoardId);
    const doneStatus = activeBoard?.statuses.find(s => s.code === 'done' || s.name.toLowerCase() === 'done');
    if (!doneStatus) {
      toast.error('Done status not found on this board.');
      return;
    }
    
    const task = localTasks.find(t => sameId(t.id, taskId));
    if (!task) return;
    if (sameId(task.status_detail?.id, doneStatus.id)) return;

    // Optimistically move task to done
    setLocalTasks(tasks => {
      const newTasks = [...tasks];
      const index = newTasks.findIndex(t => sameId(t.id, taskId));
      if (index !== -1) {
        newTasks[index] = { ...newTasks[index], status_detail: doneStatus as any };
      }
      return newTasks;
    });

    moveTaskMutation.mutate({
      taskId,
      statusId: doneStatus.id,
      order: 0
    });
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
    
    const activeStatusDetail = boards?.flatMap(b => b.statuses).find(s => sameId(s.id, activeStatusId));
    const activeCode = activeStatusDetail?.code?.toLowerCase() || '';
    const targetCode = statusDetail?.code?.toLowerCase() || '';

    if (targetCode === 'todo' && (activeCode === 'doing' || activeCode === 'review')) {
      return; // Prevent dragging backwards to To Do
    }

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
    setActiveTask(null);
    const { active, over } = event;
    if (!over) {
      // Snap back
      setLocalTasks(serverTasks || []);
      return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const movedTask = localTasks.find(t => t.id.toString() === activeId);
    if (!movedTask) return;

    const originalTask = serverTasks?.find(t => t.id.toString() === activeId);
    const originalStatusId = originalTask?.status_detail?.id;
    
    // Use findStatusId to reliably get the target column, bypassing stale localTasks for the dragged item
    const overStatusId = findStatusId(overId);
    const newStatusId = overStatusId || movedTask.status_detail?.id;

    if (!newStatusId) return;

    const wasCrossColumn = !sameId(originalStatusId, newStatusId);

    if (wasCrossColumn) {
      const originalStatusDetail = boards?.flatMap(b => b.statuses).find(s => sameId(s.id, originalStatusId));
      const targetStatusDetail = boards?.flatMap(b => b.statuses).find(s => sameId(s.id, newStatusId));
      const originalCode = originalStatusDetail?.code?.toLowerCase() || '';
      const targetCode = targetStatusDetail?.code?.toLowerCase() || '';

      if (targetCode === 'todo' && (originalCode === 'doing' || originalCode === 'review')) {
        setLocalTasks(serverTasks || []); // Revert visually
        return; // Prevent API call
      }
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
      const orderEntry = newColumnOrders.find(o => o.id === t.id);
      if (orderEntry) {
        return { ...t, order: orderEntry.order };
      }
      return t;
    }));

    if (wasCrossColumn) {
      const newOrder = newColumnOrders.find(o => o.id === movedTask.id)?.order || 0;
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
  };

  if (!activeProjectId || !activeBoardId) return null;
  if (!boards || boards.length === 0) return <div className="p-8 text-center text-slate-500">No boards found for this project.</div>;

  const board = boards.find(b => b.id.toString() === activeBoardId) || boards[0];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredTasks = localTasks.filter(task => {
    const matchesSearch = !normalizedSearch || `${task.title} ${task.key}`.toLowerCase().includes(normalizedSearch);
    const matchesFilter = filter === 'all'
      || (filter === 'active' && !task.is_finished && task.status_detail?.code !== 'done')
      || (filter === 'blocked' && task.is_blocked)
      || (filter === 'priority' && ['high', 'critical'].includes(task.priority));
    return matchesSearch && matchesFilter;
  });
  const focusTask = filteredTasks.find(task => task.id === focusedTaskId)
    || filteredTasks.find(task => task.is_active_timer_running)
    || filteredTasks.find(task => !task.is_finished)
    || filteredTasks[0];
  const completedCount = localTasks.filter(task => task.is_finished || task.status_detail?.code?.toLowerCase() === 'done').length;
  const blockedCount = localTasks.filter(task => task.is_blocked).length;
  const activeCount = Math.max(0, localTasks.length - completedCount);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-base-200">
      <div className="shrink-0 border-b border-base-content/10 bg-base-100/80 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Task workspace</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-base-content">Work in flow</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-base-content/45"><span>{localTasks.length} tasks</span><span className="text-primary">{activeCount} active</span><span className="text-success">{completedCount} done</span>{blockedCount > 0 && <span className="text-warning">{blockedCount} blocked</span>}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 w-full items-center gap-2 rounded-xl border border-base-content/10 bg-base-200/70 px-3 text-base-content/45 focus-within:border-primary/40 sm:w-64">
              <SearchNormal1 size={16} />
              <input aria-label="Search tasks" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search tasks" className="w-full bg-transparent text-xs font-semibold text-base-content outline-none placeholder:text-base-content/35" />
            </label>
            <button type="button" onClick={() => { const next = !focusMode; setFocusMode(next); if (next && !focusedTaskId) setFocusedTaskId(focusTask?.id || null); }} className={`motion-interactive inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${focusMode ? 'border-primary/30 bg-primary/10 text-primary' : 'border-base-content/10 text-base-content/55 hover:border-primary/30 hover:text-primary'}`}>
              <span className="text-sm">◉</span>{focusMode ? 'Exit focus' : 'Focus mode'}
            </button>
            <button type="button" onClick={() => setAddingTaskToStatusId(board.statuses[0]?.id || null)} className="motion-interactive inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-content shadow-lg shadow-primary/15 hover:bg-primary/90">
              <Add size={16} /> Quick add
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-0.5">
          {(['all', 'active', 'blocked', 'priority'] as const).map(item => (
            <button key={item} type="button" onClick={() => setFilter(item)} className={`motion-interactive rounded-lg px-3 py-1.5 text-[11px] font-bold capitalize ${filter === item ? 'bg-base-content text-base-100' : 'text-base-content/45 hover:bg-base-200 hover:text-base-content'}`}>
              {item === 'priority' ? 'High priority' : item}
            </button>
          ))}
          <span className="ms-auto hidden text-[11px] font-semibold text-base-content/35 sm:block">{filteredTasks.length} visible</span>
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
      <div className="flex min-h-full items-start gap-3 p-4 pb-20 sm:gap-4 sm:p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {[...board.statuses].sort((a, b) => a.order - b.order).map((status, index) => {
            const columnTasks = filteredTasks.filter(t => t.status_detail?.id?.toString() === status.id.toString()) || [];

            return (
              <DroppableColumn
                key={status.id}
                id={`col-${status.id}`}
                className="madaar-surface min-w-[292px] w-[292px] rounded-[22px] p-3 flex flex-col h-fit max-h-[calc(100vh-14rem)] bg-base-100/80"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-base-content">{status.name}</h3>
                    <span className="rounded-full bg-base-200 px-2 py-0.5 text-[10px] font-bold text-base-content/45">
                      {columnTasks.length}
                    </span>
                  </div>
                  <span aria-hidden="true" className="rounded-lg p-1 text-base-content/25">
                    <More size={16} />
                  </span>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto rounded-xl px-0.5 pb-1">
                  <SortableContext items={columnTasks.map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
                    {columnTasks.map(task => (
                      <SortableTask 
                        key={task.id} 
                        task={task} 
                        onClick={() => { setSelectedTaskForSheet(task); if (focusMode) setFocusedTaskId(task.id); }}
                        onPlayTimer={handlePlayTimer}
                        onStopTimer={handleStopTimer}
                        onMarkDone={handleMarkDone}
                        activeTimer={activeTimer}
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
                        className="w-full bg-transparent text-[13px] text-base-content outline-none placeholder:text-base-content/35"
                      />
                      <div className="flex justify-between items-center mt-2.5">
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value as any)}
                          className="rounded border border-base-content/10 bg-base-100 px-1.5 py-0.5 text-[11px] text-base-content/70 outline-none focus:border-primary/30"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                          <option value="critical">Critical Priority</option>
                        </select>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleCreateTask(status.id)}
                            disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                            className="rounded-lg bg-primary px-3 py-1 text-[11px] font-bold text-primary-content transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {createTaskMutation.isPending ? '...' : 'Add'}
                          </button>
                          <button
                            onClick={() => { setAddingTaskToStatusId(null); setNewTaskTitle(''); setNewTaskPriority('low'); }}
                            className="px-2 py-1 text-[11px] text-base-content/45 transition-colors hover:text-base-content/80"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {index === 0 && addingTaskToStatusId !== status.id && (
                  <button
                    onClick={() => setAddingTaskToStatusId(status.id)}
                    className="motion-interactive mt-1 flex w-full items-center gap-2 rounded-lg px-1 py-1 text-[13px] text-base-content/45 transition-colors hover:bg-base-200 hover:text-base-content/90"
                  >
                    <span className="text-lg leading-none mb-0.5">+</span>
                    <span>Add card</span>
                  </button>
                )}
              </DroppableColumn>
            );
          })}

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} onClick={() => {}} activeTimer={activeTimer} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
      </div>}

      <TaskSheet
        task={selectedTaskForSheet ? localTasks.find(t => t.id === selectedTaskForSheet.id) || selectedTaskForSheet : null}
        onClose={() => setSelectedTaskForSheet(null)}
        onPatch={patchLocalTask}
        onPlayTimer={handlePlayTimer}
        onStopTimer={handleStopTimer}
        activeTimer={activeTimer}
        focusMode={focusMode}
      />
    </div>
  );
};
