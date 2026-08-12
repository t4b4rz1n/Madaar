import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoards, getTasks, moveTask, createTask } from '../api/tasksApi';
import { useTaskStore } from '../store/useTaskStore';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import type { Board, Task } from '../types';

import { 
  DndContext, 
  DragOverlay, 
  closestCenter, 
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

export const KanbanBoard: React.FC = () => {
  const { activeProjectId, activeBoardId } = useTaskStore();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  
  // Add task state
  const [addingTaskToStatusId, setAddingTaskToStatusId] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

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
    mutationFn: ({ taskId, statusId, order }: { taskId: number, statusId: number, order: number }) => moveTask(taskId, statusId, order),
    onMutate: async ({ taskId, statusId, order }) => {
      // Local state is already updated optimistically in onDragEnd/onDragOver
      return {};
    },
    onError: (err, newMove, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', activeProjectId, activeBoardId], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId, activeBoardId] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: ({ title, statusId }: { title: string, statusId: number }) => createTask(activeProjectId!, title, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId, activeBoardId] });
      setAddingTaskToStatusId(null);
      setNewTaskTitle('');
    },
    onError: (err: any) => {
      console.error(err);
      alert('Error creating task: ' + err.message);
    }
  });

  const handleCreateTask = (statusId: number) => {
    if (!newTaskTitle.trim()) {
      setAddingTaskToStatusId(null);
      return;
    }
    createTaskMutation.mutate({ title: newTaskTitle, statusId });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

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

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';

    // If we're dragging over another task
    if (isActiveTask && isOverTask) {
      const activeTask = localTasks.find(t => t.id.toString() === activeId);
      const overTask = localTasks.find(t => t.id.toString() === overId);
      
      if (!activeTask || !overTask) return;

      if (activeTask.status_detail?.id !== overTask.status_detail?.id) {
        // Cross column move
        setLocalTasks((tasks) => {
          const activeIndex = tasks.findIndex(t => t.id.toString() === activeId);
          const overIndex = tasks.findIndex(t => t.id.toString() === overId);
          const newTasks = [...tasks];
          newTasks[activeIndex] = {
            ...newTasks[activeIndex],
            status_detail: overTask.status_detail,
            status: overTask.status_detail?.id as number
          };
          return arrayMove(newTasks, activeIndex, overIndex);
        });
      }
    }

    // If we're dragging over an empty column
    const isOverColumn = overId.startsWith('col-');
    if (isActiveTask && isOverColumn) {
      const overStatusId = parseInt(overId.replace('col-', ''));
      setLocalTasks((tasks) => {
        const activeIndex = tasks.findIndex(t => t.id.toString() === activeId);
        const activeTask = tasks[activeIndex];
        if (activeTask.status_detail?.id !== overStatusId) {
          const statusDetail = boards?.flatMap(b => b.statuses).find(s => s.id === overStatusId);
          const newTasks = [...tasks];
          newTasks[activeIndex] = {
            ...newTasks[activeIndex],
            status_detail: statusDetail as any,
            status: overStatusId
          };
          return arrayMove(newTasks, activeIndex, newTasks.length - 1);
        }
        return tasks;
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    isDraggingRef.current = false;
    setActiveTask(null);
    const { active, over } = event;
    if (!over) {
      // Sync back with server if dropped outside
      setLocalTasks(serverTasks || []);
      return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const activeTask = localTasks.find(t => t.id.toString() === activeId);
    if (!activeTask) return;

    let overStatusId: number | null = null;
    let newOrder = 0;

    if (overId.startsWith('col-')) {
      overStatusId = parseInt(overId.replace('col-', ''));
      const overColumnTasks = localTasks.filter(t => t.status_detail?.id === overStatusId) || [];
      newOrder = overColumnTasks.length;
    } else {
      const overTask = localTasks.find(t => t.id.toString() === overId);
      if (overTask && overTask.status_detail) {
        overStatusId = overTask.status_detail.id;
        
        const overColumnTasks = localTasks.filter(t => t.status_detail?.id === overStatusId);
        const overIndex = overColumnTasks.findIndex(t => t.id.toString() === overId);
        const activeIndex = overColumnTasks.findIndex(t => t.id.toString() === activeId);
        
        if (activeIndex !== -1) {
          // Both in same column (dnd-kit visually sorted them, now commit to state)
          setLocalTasks((tasks) => {
             const allActiveIdx = tasks.findIndex(t => t.id.toString() === activeId);
             const allOverIdx = tasks.findIndex(t => t.id.toString() === overId);
             return arrayMove(tasks, allActiveIdx, allOverIdx);
          });
          newOrder = overIndex;
        } else {
          newOrder = overIndex;
        }
      }
    }

    if (overStatusId !== null) {
      moveTaskMutation.mutate({
        taskId: activeTask.id,
        statusId: overStatusId,
        order: newOrder
      });
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
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {board.statuses.sort((a, b) => a.order - b.order).map((status, index) => {
            const columnTasks = localTasks.filter(t => t.status_detail?.id === status.id) || [];

            return (
              <div
                key={status.id}
                className="min-w-[260px] w-[260px] rounded-2xl p-2.5 flex flex-col max-h-[calc(100vh-12rem)]
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

                <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 min-h-[4px]" id={`col-${status.id}`}>
                  <SortableContext items={columnTasks.map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
                    {columnTasks.map(task => (
                      <SortableTask key={task.id} task={task} onClick={() => setSelectedTaskForModal(task)} />
                    ))}
                  </SortableContext>
                  
                  {addingTaskToStatusId === status.id && (
                    <div className="mt-2 bg-black/40 rounded-xl p-2.5 border border-white/10">
                      <input 
                        autoFocus
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCreateTask(status.id);
                          if (e.key === 'Escape') {
                            setAddingTaskToStatusId(null);
                            setNewTaskTitle('');
                          }
                        }}
                        placeholder="Task title..."
                        className="w-full bg-transparent text-sm text-white/90 outline-none placeholder:text-white/30"
                      />
                      <div className="flex justify-end mt-2.5 gap-2">
                        <button 
                          onClick={() => handleCreateTask(status.id)} 
                          disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                          className="px-3 py-1 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                        >
                          {createTaskMutation.isPending ? '...' : 'Add'}
                        </button>
                        <button 
                          onClick={() => { setAddingTaskToStatusId(null); setNewTaskTitle(''); }} 
                          className="px-3 py-1 text-white/50 hover:text-white/80 text-xs transition-colors"
                        >
                          Cancel
                        </button>
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
              </div>
            );
          })}

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} onClick={() => {}} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedTaskForModal && (
        <TaskDetailModal task={selectedTaskForModal} onClose={() => setSelectedTaskForModal(null)} />
      )}
    </div>
  );
};
