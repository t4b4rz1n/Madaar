import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, children, className }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${className || ''} ${isOver ? 'bg-blue-500/5 border border-dashed border-blue-500/30 min-h-[100px]' : ''} transition-all`}
    >
      {children}
    </div>
  );
};
