import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Task } from '../types';
import { Timer1, Message, Paperclip2, TickCircle, More, TaskSquare, Tag, Profile2User, Gallery, Calendar, ArrowRight, TickSquare, Copy, Link, Archive, Mirror, Trash } from 'iconsax-reactjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTask, updateTask, getProjectMembers } from '../api/tasksApi';
import { useQuery } from '@tanstack/react-query';
import { useTaskStore } from '../store/useTaskStore';
import { ConfirmationModal } from '../../../components/ConfirmationModal';


interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onPlayTimer?: (taskId: number) => void;
  onStopTimer?: (taskId: number) => void;
  onMarkDone?: (taskId: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onPlayTimer, onStopTimer, onMarkDone }) => {
  const [isDone, setIsDone] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMembersMenu, setShowMembersMenu] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { activeProjectId } = useTaskStore();

  const isDanger = task.is_blocked || (task.due_date && new Date(task.due_date) < new Date());
  const hasMetadata = task.due_date || (task.comments_count && task.comments_count > 0) || task.subtasks_count > 0 || task.assignee_detail || (task.checklist_stats && task.checklist_stats.total > 0) || task.is_active_timer_running || task.spent_hours;

  const formatSpentTime = (hoursFloat: number | string | undefined) => {
    if (!hoursFloat) return null;
    const totalSeconds = Math.round(Number(hoursFloat) * 3600);
    if (totalSeconds <= 0) return null;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Task>) => updateTask(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskActivities', task.id] });
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['projectMembers', task.project],
    queryFn: async () => {
      if (!task.project) return [];
      const members = await getProjectMembers(task.project.toString());
      return members.map((m: any) => m.user).filter(Boolean);
    },
    enabled: !!task.project && (isMenuOpen || showMembersMenu),
    staleTime: 30_000,
  });

  const isActuallyDone = task.status_detail?.code === 'done' || task.status_detail?.name?.toLowerCase() === 'done';

  const handleDoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isActuallyDone) {
      setIsDone(true);
      onMarkDone?.(task.id);
      setTimeout(() => setIsDone(false), 600);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    setIsDeleteModalOpen(false);
    deleteMutation.mutate();
  };

  const isMutating = updateMutation.isPending || deleteMutation.isPending;

  return (
    <div
      onClick={onClick}
      className={`bg-[#171F32] p-2 px-2.5 rounded-xl border cursor-pointer group
        hover:bg-[#1C253B] transition-all relative
        ${isDanger ? 'border-red-500/50' : 'border-[#2D364D] hover:border-[#4B5E87]'}
      `}
    >
      {/* Loading overlay */}
      {isMutating && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-30 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="w-5 h-5 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
        </div>
      )}

      {task.is_blocked && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-xl pointer-events-none"></div>
      )}

      <div className={`flex items-start justify-between gap-2 ${hasMetadata ? 'mb-2' : ''}`}>
        <div className="flex items-start flex-1 justify-start text-left">
          <div className={`overflow-visible transition-all duration-200 flex shrink-0 items-start ${isActuallyDone || isDone ? 'w-[18px] opacity-100 mr-1.5' : 'w-0 opacity-0 group-hover:w-[18px] group-hover:opacity-100 group-hover:mr-1.5'}`}>
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
              className={`relative mt-0.5 w-[16px] h-[16px] rounded-full transition-all duration-300 flex items-center justify-center ${isActuallyDone || isDone ? 'text-[#10B981]' : 'border border-white/20 hover:border-[#10B981]/50 hover:bg-[#10B981]/10'}`}
              title={isActuallyDone ? "Completed" : "Mark as done"}
            >
              {(isActuallyDone || isDone) ? (
                <TickCircle size={16} variant="Bulk" />
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
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); setShowMembersMenu(false); }} />
              <div
                className="fixed z-50 bg-[#282E33] border border-white/10 rounded-lg shadow-2xl py-1.5 px-1.5 w-56 text-[13px] text-white/90 flex flex-col gap-0.5 font-medium"
                style={{
                  top: menuTriggerRef.current.getBoundingClientRect().bottom + 4,
                  left: menuTriggerRef.current.getBoundingClientRect().right - 224,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {showMembersMenu ? (
                  <>
                    <div className="px-3 py-1.5 text-xs text-white/50 font-semibold mb-1 flex items-center justify-between">
                      <button onClick={(e) => { e.stopPropagation(); setShowMembersMenu(false); }} className="hover:text-white p-1 -ml-1 rounded"><ArrowRight className="rotate-180" size={14} /></button>
                      Select Member
                    </div>
                    <button
                      className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-md transition-colors w-full text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateMutation.mutate({ assignee: undefined });
                        setIsMenuOpen(false);
                        setShowMembersMenu(false);
                      }}
                    >
                      <div className="w-5 h-5 rounded-full border border-dashed border-white/40 flex items-center justify-center text-white/50">
                        <span className="text-[10px]">-</span>
                      </div>
                      Unassigned
                    </button>
                    {users.map((u: any) => (
                      <button
                        key={u.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-md transition-colors w-full text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateMutation.mutate({ assignee: u.id });
                          setIsMenuOpen(false);
                          setShowMembersMenu(false);
                        }}
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                          {u.full_name?.[0] || u.username?.[0] || '?'}
                        </div>
                        <span className="truncate">{u.full_name || u.username || u.email}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <button className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 rounded-md transition-colors w-full text-left" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onClick(); }}>
                      <TaskSquare size={16} className="text-white/60" /> Open card
                    </button>
                    <button className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 rounded-md transition-colors w-full text-left" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}>
                      <Tag size={16} className="text-white/60" /> Edit labels
                    </button>
                    <button className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 rounded-md transition-colors w-full text-left" onClick={(e) => { e.stopPropagation(); setShowMembersMenu(true); }}>
                      <Profile2User size={16} className="text-white/60" /> Change members
                    </button>

                    <div>
                      <button
                        className="flex items-center justify-between gap-2.5 px-3 py-1.5 hover:bg-white/10 rounded-md transition-colors w-full text-left cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          dateInputRef.current?.showPicker?.();
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <Calendar size={16} className="text-white/60" />
                          <span>{task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Edit dates'}</span>
                        </div>
                        {task.due_date && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              updateMutation.mutate({ due_date: undefined });
                              setIsMenuOpen(false);
                            }}
                            className="text-white/40 hover:text-red-400 p-0.5 rounded hover:bg-red-500/10 transition-colors"
                            title="Clear date"
                          >
                            ✕
                          </span>
                        )}
                      </button>
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                        className="sr-only"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          if (e.target.value) {
                            updateMutation.mutate({ due_date: new Date(e.target.value).toISOString() });
                            setIsMenuOpen(false);
                          }
                        }}
                      />
                    </div>

                    <div className="h-px bg-white/10 my-1 mx-2" />

                    <button className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-500/10 text-red-400 rounded-md transition-colors w-full text-left" onClick={handleDelete}>
                      <Trash size={16} className="text-red-400/80" /> Delete
                    </button>
                  </>
                )}
              </div>
          </>,
          document.body
        )}
      </div>

      {hasMetadata && (
        <div className="flex items-center justify-between text-white/40 text-[11px]">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isDanger ? 'text-red-400' : ''}`}>
              <Timer1 size={13} />
              <span>{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
          {task.comments_count && task.comments_count > 0 ? (
            <div className="flex items-center gap-1 hover:text-white/80 transition-colors" title={`${task.comments_count} comment${task.comments_count > 1 ? 's' : ''}`}>
              <Message size={13} />
              <span>{task.comments_count}</span>
            </div>
          ) : null}
          {task.subtasks_count > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip2 size={13} />
              <span>{task.subtasks_count}</span>
            </div>
          )}

          {/* Checklist FIRST */}
          {task.checklist_stats && task.checklist_stats.total > 0 && (
            <div className={`flex items-center gap-1 ${task.checklist_stats.done === task.checklist_stats.total ? 'text-[#10B981]' : ''}`}>
              <TickSquare size={13} />
              <span>{task.checklist_stats.done}/{task.checklist_stats.total}</span>
            </div>
          )}

          {/* Start/Stop Button AT THE END */}
          {task.is_active_timer_running ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onStopTimer?.(task.id); }}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors p-0.5 rounded hover:bg-red-500/10" 
              title="Stop Timer"
            >
              <div className="w-2.5 h-2.5 bg-red-400 rounded-sm animate-pulse" />
            </button>
          ) : !isActuallyDone ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onPlayTimer?.(task.id); }}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors p-0.5 rounded hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100" 
              title="Start Timer"
            >
              <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-emerald-400 border-b-[5px] border-b-transparent ml-0.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center space-x-2">
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

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
