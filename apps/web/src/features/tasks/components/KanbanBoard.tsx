import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoards, getTasks, moveTask, createTask, reorderTasks } from '../api/tasksApi';
import { startTimer, stopTimer } from '../../attendance/api/attendanceApi';
import { useTaskStore } from '../store/useTaskStore';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
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
import { More } from 'iconsax-reactjs';
import { toast } from 'sonner';

export const KanbanBoard: React.FC = () => {
  const { activeProjectId, activeBoardId } = useTaskStore();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);

  // Add task state
  const [addingTaskToStatusId, setAddingTaskToStatusId] = useState<string | number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('low');

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
      const targetStatus = activeBoard?.statuses.find(s => s.id === statusId);
      const isDoing = targetStatus && (targetStatus.code === 'doing' || targetStatus.name.toLowerCase() === 'doing' || targetStatus.name.toLowerCase() === 'in progress');
      const isReviewOrDone = targetStatus && (targetStatus.code === 'review' || targetStatus.code === 'done' || targetStatus.name.toLowerCase() === 'review' || targetStatus.name.toLowerCase() === 'done');

      if (isDoing || isReviewOrDone) {
        setLocalTasks(tasks => tasks.map(t => {
          if (t.id === taskId) {
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
    mutationFn: (orders: { id: number; order: number }[]) => reorderTasks(orders),
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
    mutationFn: ({ title, statusId, priority }: { title: string, statusId: number, priority: string }) => createTask(activeProjectId!, title, statusId, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId, activeBoardId] });
      setAddingTaskToStatusId(null);
      setNewTaskTitle('');
      setNewTaskPriority('low');
    },
    onError: (err: any) => {
      console.error(err);
      alert('Error creating task: ' + err.message);
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
    mutationFn: (taskId: number) => startTimer(taskId),
    onMutate: async (taskId) => {
      // Find "doing" or "in progress" status IN THE ACTIVE BOARD
      const activeBoard = boards?.find(b => b.id.toString() === activeBoardId);
      const doingStatus = activeBoard?.statuses.find(s => s.code === 'doing' || s.name.toLowerCase() === 'doing' || s.name.toLowerCase() === 'in progress');
      
      const previousTasks = [...localTasks];

      // Stop all other timers optimistically first (only one can be active)
      // And if there's a doing status, move this task to doing
      setLocalTasks(tasks => tasks.map(t => {
        if (t.id === taskId) {
          const updatedTask = { ...t, is_active_timer_running: true };
          const isTodo = t.status_detail?.code?.toLowerCase() === 'todo' || t.status_detail?.name?.toLowerCase() === 'to do';
          if (doingStatus && t.status_detail?.id !== doingStatus.id && isTodo) {
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
        setLocalTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, is_active_timer_running: false } : t));
      }
    }
  });

  const stopTimerMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: (_taskId: string | number) => stopTimer(),
    onMutate: async (taskId) => {
      setLocalTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, is_active_timer_running: false } : t));
    },
    onSuccess: (data, taskId) => {
      if (data && data.duration_seconds !== undefined) {
        setLocalTasks(tasks => tasks.map(t => {
          if (t.id === taskId) {
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
      setLocalTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, is_active_timer_running: true } : t));
    }
  });

  const handlePlayTimer = (taskId: string | number) => {
    const task = localTasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Find "doing" or "in progress" status IN THE ACTIVE BOARD
    const activeBoard = boards?.find(b => b.id.toString() === activeBoardId);
    const doingStatus = activeBoard?.statuses.find(s => s.code === 'doing' || s.name.toLowerCase() === 'doing' || s.name.toLowerCase() === 'in progress');
    
    // If we have a doing status and the task is not already in it, move it optimistically
    if (doingStatus && task.status_detail?.id !== doingStatus.id) {
      // Optimistic update (backend will auto-move it to doing when we start the timer)
      setLocalTasks(tasks => {
        const newTasks = [...tasks];
        const index = newTasks.findIndex(t => t.id === taskId);
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

  const handleMarkDone = (taskId: string | number) => {
    const activeBoard = boards?.find(b => b.id.toString() === activeBoardId);
    const doneStatus = activeBoard?.statuses.find(s => s.code === 'done' || s.name.toLowerCase() === 'done');
    if (!doneStatus) {
      toast.error('Done status not found on this board.');
      return;
    }
    
    const task = localTasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.status_detail?.id === doneStatus.id) return;

    // Optimistically move task to done
    setLocalTasks(tasks => {
      const newTasks = [...tasks];
      const index = newTasks.findIndex(t => t.id === taskId);
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
    const statusDetail = boards?.flatMap(b => b.statuses).find(s => s.id === overStatusId);
    if (!statusDetail) return;
    
    const activeStatusDetail = boards?.flatMap(b => b.statuses).find(s => s.id === activeStatusId);
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

    const wasCrossColumn = originalStatusId !== newStatusId;

    if (wasCrossColumn) {
      const originalStatusDetail = boards?.flatMap(b => b.statuses).find(s => s.id === originalStatusId);
      const targetStatusDetail = boards?.flatMap(b => b.statuses).find(s => s.id === newStatusId);
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
      const targetStatusDetail = boards?.flatMap(b => b.statuses).find(s => s.id === newStatusId);
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
    const columnTasks = finalTasks.filter(t => t.status_detail?.id === newStatusId);
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

  return (
    <div className="h-full w-full overflow-x-auto overflow-y-hidden">
      {/* Kanban columns */}
      <div className="flex gap-2 p-4 items-start pb-20 min-h-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {board.statuses.sort((a, b) => a.order - b.order).map((status, index) => {
            const columnTasks = localTasks.filter(t => t.status_detail?.id === status.id) || [];

            return (
              <DroppableColumn
                key={status.id}
                id={`col-${status.id}`}
                className="min-w-[240px] w-[240px] rounded-2xl p-2 flex flex-col h-fit max-h-[calc(100vh-12rem)]
                  bg-[#131B2C]/90 backdrop-blur-md border border-[#232F4A]"
              >
                <div className="flex items-center justify-between mb-2 px-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white/95 text-[13px]">{status.name}</h3>
                    <span className="bg-white/5 text-white/50 text-[10px] px-1.5 py-0.5 rounded-md font-medium">
                      {columnTasks.length}
                    </span>
                  </div>
                  <div className="text-white/30 cursor-pointer hover:text-white/80 p-1 rounded hover:bg-white/5 transition-colors">
                    <More size={16} />
                  </div>
                </div>

                <div className="overflow-y-auto flex flex-col gap-1.5 rounded-lg">
                  <SortableContext items={columnTasks.map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
                    {columnTasks.map(task => (
                      <SortableTask 
                        key={task.id} 
                        task={task} 
                        onClick={() => setSelectedTaskForModal(task)} 
                        onPlayTimer={handlePlayTimer}
                        onStopTimer={handleStopTimer}
                        onMarkDone={handleMarkDone}
                      />
                    ))}
                  </SortableContext>

                  {addingTaskToStatusId === status.id && (
                    <div
                      className="mt-2 bg-black/40 rounded-xl p-2.5 border border-white/10"
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
                        className="w-full bg-transparent text-[13px] text-white/90 outline-none placeholder:text-white/30"
                      />
                      <div className="flex justify-between items-center mt-2.5">
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value as any)}
                          className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-white/80 outline-none focus:border-white/30"
                        >
                          <option value="low" className="bg-[#273043]">Low Priority</option>
                          <option value="medium" className="bg-[#273043]">Medium Priority</option>
                          <option value="high" className="bg-[#273043]">High Priority</option>
                          <option value="critical" className="bg-[#273043]">Critical Priority</option>
                        </select>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleCreateTask(status.id)}
                            disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white text-[11px] font-medium rounded transition-colors"
                          >
                            {createTaskMutation.isPending ? '...' : 'Add'}
                          </button>
                          <button
                            onClick={() => { setAddingTaskToStatusId(null); setNewTaskTitle(''); setNewTaskPriority('low'); }}
                            className="px-2 py-1 text-white/50 hover:text-white/80 text-[11px] transition-colors"
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
                    className="mt-1 flex items-center gap-2 text-white/50 hover:text-white/90 text-[13px] py-1 px-1 transition-colors w-full"
                  >
                    <span className="text-lg leading-none mb-0.5">+</span>
                    <span>Add card</span>
                  </button>
                )}
              </DroppableColumn>
            );
          })}

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} onClick={() => {}} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedTaskForModal && (
        <TaskDetailModal 
          task={localTasks.find(t => t.id === selectedTaskForModal.id) || selectedTaskForModal} 
          onClose={() => setSelectedTaskForModal(null)} 
        />
      )}
    </div>
  );
};
