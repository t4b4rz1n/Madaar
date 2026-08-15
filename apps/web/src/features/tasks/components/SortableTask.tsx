import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import { TaskCard } from './TaskCard';

interface SortableTaskProps {
  task: Task;
  onClick: () => void;
  onPlayTimer?: (taskId: number) => void;
  onStopTimer?: (taskId: number) => void;
  onMarkDone?: (taskId: number) => void;
}

export const SortableTask: React.FC<SortableTaskProps> = ({ task, onClick, onPlayTimer, onStopTimer, onMarkDone }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id.toString(),
    data: {
      type: 'Task',
      task
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} onPlayTimer={onPlayTimer} onStopTimer={onStopTimer} onMarkDone={onMarkDone} />
    </div>
  );
};
