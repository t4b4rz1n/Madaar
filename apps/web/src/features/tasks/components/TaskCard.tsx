import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Task } from '../types';
import { Timer1, Message, Paperclip2, TickCircle, More } from 'iconsax-reactjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTask } from '../api/tasksApi';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const [isDone, setIsDone] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();

  const isDanger = task.is_blocked || (task.due_date && new Date(task.due_date) < new Date());
  const hasMetadata = task.due_date || (task.comments && task.comments.length > 0) || task.subtasks_count > 0 || task.assignee_detail;

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const handleDoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDone(true);
    setTimeout(() => setIsDone(false), 600);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate();
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-[#171F32] p-2 px-2.5 rounded-xl border cursor-pointer group
        hover:bg-[#1C253B] transition-all relative
        ${isDanger ? 'border-red-500/50' : 'border-[#2D364D] hover:border-[#4B5E87]'}
      `}
    >
      {task.is_blocked && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-xl pointer-events-none"></div>
      )}

      <div className={`flex items-start justify-between gap-2 ${hasMetadata ? 'mb-2' : ''}`}>
        <div className="flex items-start flex-1 justify-start text-left">
          <div className="overflow-visible transition-all duration-200 w-0 opacity-0 group-hover:w-[18px] group-hover:opacity-100 group-hover:mr-1.5 flex shrink-0 items-start">
            <style>
              {`
                @keyframes burstLine {
                  0% { transform: rotate(var(--rot)) translateY(0) scaleY(0); opacity: 1; }
                  50% { transform: rotate(var(--rot)) translateY(-8px) scaleY(1); opacity: 1; }
                  100% { transform: rotate(var(--rot)) translateY(-12px) scaleY(0); opacity: 0; }
                }
              `}
            </style>
            <button 
              onClick={handleDoneClick}
              className={`relative mt-0.5 w-[16px] h-[16px] rounded-full transition-all duration-300 flex items-center justify-center ${isDone ? 'bg-[#10B981] text-white scale-110 border-none' : 'border border-white/20 hover:border-[#10B981]/50 hover:bg-[#10B981]/10'}`}
              title="Mark as done"
            >
              {isDone ? (
                <TickCircle size={14} variant="Bulk" />
              ) : null}
              
              {isDone && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {['#F43F5E', '#3B82F6', '#F59E0B', '#10B981', '#A855F7', '#EC4899'].map((color, i) => (
                    <div 
                      key={i}
                      className="absolute w-0.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: color,
                        '--rot': `${i * 60}deg`,
                        animation: 'burstLine 0.4s ease-out forwards'
                      } as React.CSSProperties}
                    />
                  ))}
                </div>
              )}
            </button>
          </div>
          <h4 className="text-white/90 font-medium text-[12px] leading-relaxed line-clamp-2 transition-transform duration-200" dir="auto">
            {task.title}
          </h4>
        </div>

        <button 
          ref={menuTriggerRef}
          onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }}
          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 -mr-1 rounded text-white/40 hover:bg-white/5 hover:text-white/80 transition-colors"
        >
          <More size={14} />
        </button>

        {isMenuOpen && menuTriggerRef.current && createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} />
            <div 
              className="fixed z-50 bg-[#1C253B] border border-[#2D364D] rounded-xl shadow-2xl py-1 w-48 text-[13px] text-white/80 flex flex-col overflow-hidden"
              style={{
                top: menuTriggerRef.current.getBoundingClientRect().bottom + 4,
                left: menuTriggerRef.current.getBoundingClientRect().right - 192,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="text-left px-4 py-2 hover:bg-white/5 transition-colors" onClick={(e) => { setIsMenuOpen(false); onClick(); }}>Open card</button>
              <button className="text-left px-4 py-2 hover:bg-white/5 transition-colors" onClick={() => setIsMenuOpen(false)}>Change members</button>
              <button className="text-left px-4 py-2 hover:bg-white/5 transition-colors" onClick={() => setIsMenuOpen(false)}>Change cover</button>
              <button className="text-left px-4 py-2 hover:bg-white/5 transition-colors" onClick={() => setIsMenuOpen(false)}>Edit dates</button>
              <button className="text-left px-4 py-2 hover:bg-white/5 transition-colors" onClick={() => setIsMenuOpen(false)}>Move</button>
              <div className="h-px bg-white/10 my-1 mx-2" />
              <button className="text-left px-4 py-2 hover:bg-red-500/10 text-red-400 transition-colors" onClick={handleDelete}>Delete</button>
            </div>
          </>,
          document.body
        )}
      </div>

      {hasMetadata && (
        <div className="flex items-center justify-between text-white/40 text-[11px]">
        <div className="flex items-center space-x-3">
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isDanger ? 'text-red-400' : ''}`}>
              <Timer1 size={13} />
              <span>{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1">
              <Message size={13} />
              <span>{task.comments.length}</span>
            </div>
          )}
          {task.subtasks_count > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip2 size={13} />
              <span>{task.subtasks_count}</span>
            </div>
          )}
          {task.assignee_detail && (
            <img
              src={task.assignee_detail.avatar_url || 'https://ui-avatars.com/api/?name=' + task.assignee_detail.first_name + '&background=10B981&color=fff'}
              alt="assignee"
              className="w-5 h-5 rounded-full border border-[#2D364D] ml-1"
            />
          )}
        </div>
      </div>
      )}
    </div>
  );
};
