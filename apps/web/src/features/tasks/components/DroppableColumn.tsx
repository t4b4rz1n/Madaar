import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  header: React.ReactNode;
}

export const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, children, className, header }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className || ''} ${isOver ? 'bg-primary/5 rounded-2xl border border-dashed border-primary/20 min-h-[150px]' : ''} transition-all duration-150`}
    >
      {/* Column Header acts as Drag Handle */}
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing select-none">
        {header}
      </div>
      {children}
    </div>
  );
};
