import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Task } from '../types';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { updateTask, getTaskComments, addComment, updateComment, deleteComment, getTaskChecklists, addChecklistItem, toggleChecklistItem, deleteTask, getTaskActivities, getProjectMembers } from '../api/tasksApi';
import { CloseSquare, Element3, TextalignLeft, Activity, Profile2User, Tag, Calendar, TaskSquare, Paperclip2, Trash, Message, More } from 'iconsax-reactjs';
import { format } from 'date-fns';
import { useTaskStore } from '../store/useTaskStore';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { ManualTimeLogForm } from '../../attendance/components/ManualTimeLogForm';
import { Timer1 } from 'iconsax-reactjs';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';


interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
  const queryClient = useQueryClient();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'activities' | 'time'>('details');

  const formatSpentTime = (seconds: number | undefined) => {
    if (!seconds || seconds <= 0) return '00:00:00';
    const totalSeconds = Math.round(Number(seconds));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [showActivityDetails, setShowActivityDetails] = useState(true);
  const [isMembersMenuOpen, setIsMembersMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const membersButtonRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Local state for optimistic UI updates
  const [localAssignee, setLocalAssignee] = useState<any>(task.assignee_detail || null);
  const [localDueDate, setLocalDueDate] = useState<string | null | undefined>(task.due_date);

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [isCommentInputFocused, setIsCommentInputFocused] = useState(false);
  const [localPriority, setLocalPriority] = useState<string>(task.priority || 'low');

  const { activeProjectId } = useTaskStore();

  // Queries
  const { data: comments = [] } = useQuery({
    queryKey: ['taskComments', task.id],
    queryFn: () => getTaskComments(task.id),
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['taskChecklists', task.id],
    queryFn: () => getTaskChecklists(task.id),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['projectMembers', task.project],
    queryFn: async () => {
      if (!task.project) return [];
      const members = await getProjectMembers(task.project.toString());
      // map { user: {...} } to just the user object
      return members.map((m: any) => m.user).filter(Boolean);
    },
    enabled: !!task.project,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['taskActivities', task.id],
    queryFn: () => getTaskActivities(task.id),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Task>) => updateTask(task.id, data),
    onSuccess: (_res, variables) => {
      // Update local state so the UI reflects changes immediately
      if ('description' in variables) {
        setDescription(variables.description || '');
      }
      if ('title' in variables) {
        setTitle(variables.title || '');
      }

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Delay activity log refresh to ensure the backend signal + log write has completed
      // This is necessary because signals (e.g. Telegram notifications) may run synchronously
      // in EAGER mode and delay the DB commit of the activity log.
      queryClient.invalidateQueries({ queryKey: ['taskActivities', task.id] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['taskActivities', task.id] });
      }, 800);
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.due_date?.[0] || 'Failed to update task.');
      // Revert local date if it was changed
      setLocalDueDate(task.due_date ? new Date(task.due_date).toISOString() : null);
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ text, file }: { text: string; file?: File | null }) => addComment(task.id, text, file || undefined),
    onSuccess: () => {
      setCommentText('');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['taskComments', task.id] });
      queryClient.invalidateQueries({ queryKey: ['taskActivities', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.detail || 'Failed to add comment.');
    }
  });

  const addChecklistMutation = useMutation({
    mutationFn: (description: string) => addChecklistItem(task.id, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskChecklists', task.id] });
      queryClient.invalidateQueries({ queryKey: ['taskActivities', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewChecklistText('');
      setIsAddingChecklist(false);
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.detail || 'Failed to add checklist item.');
      setIsAddingChecklist(false);
    }
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number, completed: boolean }) => toggleChecklistItem(id, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskChecklists', task.id] });
      queryClient.invalidateQueries({ queryKey: ['taskActivities', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.detail || 'Failed to toggle checklist item.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.detail || 'Failed to delete task.');
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, text }: { id: number, text: string }) => updateComment(id, text),
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingCommentText('');
      queryClient.invalidateQueries({ queryKey: ['taskComments', task.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.detail || 'Failed to update comment.');
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => deleteComment(id),
    onSuccess: () => {
      setDeletingCommentId(null);
      queryClient.invalidateQueries({ queryKey: ['taskComments', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast.error(error.message || error.response?.data?.detail || 'Failed to delete comment.');
      setDeletingCommentId(null);
    }
  });

  // Handlers
  const handleTitleBlur = () => {
    if (title.trim() !== task.title) {
      updateMutation.mutate({ title: title.trim() });
    }
  };

  const handleDescSave = () => {
    updateMutation.mutate({ description: description.trim() });
    setIsEditingDesc(false);
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    setIsDeleteModalOpen(false);
    deleteMutation.mutate();
  };

  const timeline = [
    ...comments.map((c: any) => ({ ...c, type: 'comment' })),
    ...activities.filter((a: any) => a.action !== 'Added a comment.').map((a: any) => ({ ...a, type: 'activity' }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const visibleTimeline = showActivityDetails ? timeline : timeline.filter(t => t.type === 'comment');

  const isLoading = updateMutation.isPending || addCommentMutation.isPending || addChecklistMutation.isPending || toggleChecklistMutation.isPending || deleteMutation.isPending;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#0F172A]/80 backdrop-blur-sm p-4 pt-12 overflow-y-auto" onClick={onClose}>
      <div className="flex flex-col items-center w-full max-w-[900px]">

        {/* Modal Container */}
        <div className="bg-[#273043] w-full rounded-xl shadow-2xl flex flex-col relative" onClick={e => e.stopPropagation()}>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] z-50 rounded-xl flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-white/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}

          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="bg-black/20 hover:bg-black/30 cursor-pointer text-white/90 px-3 py-1.5 rounded flex items-center gap-1 text-sm font-medium transition-colors border border-white/10">
              {task.status_detail?.name || 'Status'} <span className="text-xs ml-1">˅</span>
            </div>
            <button onClick={onClose} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <CloseSquare size={24} variant="Outline" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row min-h-[450px] max-h-[75vh]">
            {/* Left Column (Main Info) */}
            <div className="flex-[1.4] p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">

              {/* Title & Status */}
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full border-2 border-white/40 mt-1 shrink-0" />
                <div className="flex-1">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    className="w-full bg-transparent text-xl font-bold text-white/90 outline-none focus:bg-white/5 px-2 py-1 rounded -ml-2 transition-colors border border-transparent focus:border-blue-500/50"
                  />
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="ml-8 flex flex-wrap gap-2">
                <select
                  value={localPriority}
                  onChange={(e) => {
                    setLocalPriority(e.target.value);
                    updateMutation.mutate({ priority: e.target.value } as any);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors outline-none cursor-pointer"
                >
                  <option value="low" className="bg-[#273043]">Priority: Low</option>
                  <option value="medium" className="bg-[#273043]">Priority: Medium</option>
                  <option value="high" className="bg-[#273043]">Priority: High</option>
                  <option value="critical" className="bg-[#273043]">Priority: Critical</option>
                </select>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors">
                  <span className="text-lg leading-none mb-0.5">+</span> Add
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors opacity-50 cursor-not-allowed">
                  <Tag size={14} className="text-white/60" /> Labels
                </button>
                <button onClick={() => setIsAddingChecklist(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors">
                  <TaskSquare size={14} className="text-white/60" /> Checklist
                </button>
                <div className="flex items-center">
                  <button
                    onClick={() => dateInputRef.current?.showPicker?.()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors cursor-pointer"
                  >
                    <Calendar size={14} className="text-white/60" />
                    {localDueDate ? format(new Date(localDueDate), 'MMM d, yyyy') : 'Dates'}
                  </button>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={localDueDate ? new Date(localDueDate).toISOString().split('T')[0] : ''}
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.value) {
                        const iso = new Date(e.target.value).toISOString();
                        setLocalDueDate(iso);
                        updateMutation.mutate({ due_date: iso } as any);
                      }
                    }}
                  />
                  {localDueDate && (
                    <button
                      onClick={() => {
                        setLocalDueDate(null);
                        updateMutation.mutate({ due_date: null } as any);
                      }}
                      className="ml-1 p-1 text-white/40 hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded transition-colors"
                      title="Clear date"
                    >
                      <CloseSquare size={14} variant="Outline" />
                    </button>
                  )}
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors opacity-50 cursor-not-allowed">
                  <Paperclip2 size={14} className="text-white/60" /> Attachment
                </button>
              </div>

              {/* Members */}
              <div className="ml-8">
                <h3 className="text-[11px] font-semibold text-white/50 mb-2 uppercase tracking-wide">Members</h3>
                <div className="flex items-center gap-1">
                  <div className="relative" ref={membersButtonRef}>
                    {localAssignee ? (
                      <div
                        onClick={() => setIsMembersMenuOpen(true)}
                        className="w-8 h-8 rounded-full bg-[#EF4444] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[#273043] relative cursor-pointer hover:opacity-80 transition-opacity"
                        title={localAssignee.full_name || localAssignee.username}
                      >
                        {localAssignee.full_name?.[0] || localAssignee.username?.[0] || 'A'}
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsMembersMenuOpen(true)}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 transition-colors ml-1"
                      >
                        <span className="text-lg leading-none mb-0.5">+</span>
                      </button>
                    )}
                  </div>

                  {isMembersMenuOpen && membersButtonRef.current && createPortal(
                    <>
                      <div className="fixed inset-0 z-[110]" onClick={() => setIsMembersMenuOpen(false)} />
                      <div
                        className="fixed z-[120] bg-[#282E33] border border-white/10 rounded-lg shadow-2xl py-1.5 w-48 text-[13px] text-white/90 flex flex-col max-h-64 overflow-y-auto custom-scrollbar"
                        style={{
                          top: membersButtonRef.current.getBoundingClientRect().bottom + 4,
                          left: membersButtonRef.current.getBoundingClientRect().left,
                        }}
                      >
                        <div className="px-3 py-1.5 text-xs text-white/50 font-semibold mb-1">Select Member</div>
                        <button
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 transition-colors text-left text-white/60 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateMutation.mutate({ assignee: undefined });
                            setLocalAssignee(null);
                            setIsMembersMenuOpen(false);
                          }}
                        >
                          <div className="w-5 h-5 rounded-full border border-dashed border-white/40 flex items-center justify-center font-bold text-white/40">
                            -
                          </div>
                          <span className="truncate">Unassigned</span>
                        </button>
                        {users.map((user: any) => (
                          <button
                            key={user.id}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 transition-colors text-left"
                            onClick={() => {
                              setLocalAssignee(user);
                              updateMutation.mutate({ assignee: user.id });
                              setIsMembersMenuOpen(false);
                            }}
                          >
                            <div className="w-5 h-5 rounded-full bg-[#EF4444] text-[10px] flex items-center justify-center font-bold text-white">
                              {user.full_name?.[0] || user.username?.[0] || 'U'}
                            </div>
                            <span className="truncate">{user.full_name || user.username || user.email}</span>
                          </button>
                        ))}
                      </div>
                    </>,
                    document.body
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col mt-2">
                <div className="flex items-center gap-3 mb-3">
                  <TextalignLeft size={20} className="text-white/40 shrink-0" />
                  <h3 className="text-[15px] font-semibold text-white/90 flex-1">Description</h3>
                  {!isEditingDesc && (
                    <button
                      onClick={() => setIsEditingDesc(true)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="ml-8">
                  {isEditingDesc ? (
                    <div className="bg-[#1C253B] rounded-lg border border-blue-500 p-0 focus-within:ring-2 ring-blue-500/30">
                      <textarea
                        autoFocus
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-transparent text-sm text-white/80 outline-none resize-none min-h-[100px] p-3"
                        placeholder="Add a more detailed description..."
                      />
                      <div className="flex gap-2 p-2 border-t border-white/5">
                        <button onClick={handleDescSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">Save</button>
                        <button onClick={() => { setDescription(task.description || ''); setIsEditingDesc(false); }} className="px-4 py-1.5 rounded text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsEditingDesc(true)}
                      className="bg-[#1C253B] hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg hover:border-white/10 rounded-lg border border-white/5 p-4 text-sm text-white/60 cursor-pointer min-h-[80px] break-words whitespace-pre-wrap"
                    >
                      {description || 'Add a more detailed description...'}
                    </div>
                  )}
                </div>
              </div>

              {/* Time Tracking Section */}
              <div className="flex gap-3 items-start mt-6 pt-6 border-t border-white/5">
                <Timer1 size={20} className="text-white/40 mt-1 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[15px] font-semibold text-white/90">Time Tracking</h3>
                    <div className="text-sm">
                      <span className="text-white/40">Logged: </span>
                      <span className="text-emerald-400 font-bold">{task.spent_seconds ? formatSpentTime(task.spent_seconds) : '00:00:00'}</span>
                    </div>
                  </div>
                  <ManualTimeLogForm taskId={task.id} />
                </div>
              </div>

              {/* Checklist Section (below Time Tracking) */}
              {(checklists.length > 0 || isAddingChecklist) && (
                <div className="flex gap-3 items-start mt-2">
                  <TaskSquare size={20} className="text-white/40 mt-1 shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-[15px] font-semibold text-white/90 mb-3">Checklist</h3>

                    {checklists.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {checklists.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 group">
                            <input
                              type="checkbox"
                              checked={item.is_completed}
                              onChange={(e) => toggleChecklistMutation.mutate({ id: item.id, completed: e.target.checked })}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-blue-500 cursor-pointer"
                            />
                            <span className={`text-sm flex-1 ${item.is_completed ? 'line-through text-white/40' : 'text-white/80'}`}>
                              {item.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isAddingChecklist ? (
                      <div className="bg-[#1C253B] rounded-lg border border-blue-500 p-0 focus-within:ring-2 ring-blue-500/30">
                        <input
                          autoFocus
                          value={newChecklistText}
                          onChange={(e) => setNewChecklistText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && newChecklistText.trim()) addChecklistMutation.mutate(newChecklistText); }}
                          className="w-full bg-transparent text-sm text-white/80 outline-none p-3"
                          placeholder="Add an item"
                        />
                        <div className="flex gap-2 p-2 border-t border-white/5">
                          <button onClick={() => newChecklistText.trim() && addChecklistMutation.mutate(newChecklistText)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">Add</button>
                          <button onClick={() => setIsAddingChecklist(false)} className="px-4 py-1.5 rounded text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setIsAddingChecklist(true)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 transition-colors border border-white/5">
                        Add an item
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column (Comments & Activity) */}
            <div className="flex-[1] p-6 bg-white/[0.02] border-l border-white/5 rounded-br-xl flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-white/40" />
                  <h3 className="text-[14px] font-semibold text-white/90">Comments and activity</h3>
                </div>
                <button onClick={() => setShowActivityDetails(!showActivityDetails)} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-[11px] text-white/70 transition-colors">
                  {showActivityDetails ? 'Hide details' : 'Show details'}
                </button>
              </div>

              {/* Comment Input */}
              <div
                className={`backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-0 transition-all mb-1 shadow-inner ${isCommentInputFocused || commentText.trim() || selectedFile ? 'focus-within:border-primary/50 focus-within:bg-white/10' : ''}`}
                tabIndex={-1}
                onFocus={() => setIsCommentInputFocused(true)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setIsCommentInputFocused(false);
                  }
                }}
              >
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className={`w-full bg-transparent text-[14px] text-white/90 outline-none resize-none px-4 py-3 transition-all duration-200 custom-scrollbar ${isCommentInputFocused || commentText.trim() || selectedFile ? 'min-h-[80px]' : 'min-h-[44px] m-0 overflow-hidden'}`}
                  placeholder="Write a comment... (Markdown supported)"
                />
                
                {selectedFile && (
                  <div className="px-4 py-2 flex items-center justify-between bg-primary/10 border-t border-primary/20 rounded-b-xl mb-2 mx-2">
                    <span className="text-xs text-primary truncate flex-1">{selectedFile.name}</span>
                    <button onClick={() => setSelectedFile(null)} className="text-white/40 hover:text-rose-400 p-1">
                      <CloseSquare size={14} />
                    </button>
                  </div>
                )}

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  hidden 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error('File size must be less than 5MB');
                        return;
                      }
                      setSelectedFile(file);
                    }
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />

                {(isCommentInputFocused || commentText.trim().length > 0 || selectedFile) && (
                  <div className="flex justify-between items-center px-3 pb-3">
                    <div className="flex gap-1">
                      <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => fileInputRef.current?.click()} 
                        className="p-2 text-white/50 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center" 
                        title="Attach file (Max 5MB)"
                      >
                        <Paperclip2 size={18}/>
                      </button>
                    </div>
                    <button
                      onMouseDown={(e) => e.preventDefault()} // prevent blur
                      disabled={(!commentText.trim() && !selectedFile) || addCommentMutation.isPending}
                      onClick={() => {
                        addCommentMutation.mutate({ text: commentText, file: selectedFile });
                      }}
                      className="bg-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/80 text-white px-5 py-2 rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                      {addCommentMutation.isPending ? <span className="loading loading-spinner loading-xs"></span> : null}
                      Post Comment
                    </button>
                  </div>
                )}
              </div>

              {/* Activity List */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {visibleTimeline.map((item: any) => {
                  const isComment = item.type === 'comment';
                  const name = item.author_detail?.full_name || item.author_detail?.username || item.actor_detail?.full_name || item.actor_detail?.username || 'System';
                  const avatar = item.author_detail?.avatar_url || item.actor_detail?.avatar_url;

                  return (
                    <div key={`${item.type}-${item.id}`} className={`flex gap-3 ${!isComment ? 'opacity-70' : 'mt-4'}`}>
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-8 h-8 rounded-full shrink-0" />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${isComment ? 'bg-primary' : 'bg-white/10'}`}>
                          {name[0]?.toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1">
                        {isComment ? (
                          <>
                            <div className="flex items-baseline gap-2 mb-1.5">
                              <span className="font-bold text-[14px] text-white/90">{name}</span>
                              <span className="text-[12px] text-white/40">{format(new Date(item.created_at || Date.now()), 'MMM d, p')}</span>
                            </div>

                            {editingCommentId === item.id ? (
                              <div className="bg-[#273043] rounded-lg border border-white/10 p-0 focus-within:border-white/30 transition-all mb-2">
                                <textarea
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  className="w-full bg-transparent text-[14px] text-white/90 outline-none resize-none p-3 pb-1"
                                  rows={2}
                                />
                                <div className="flex justify-end gap-2 px-3 pb-2">
                                  <button onClick={() => setEditingCommentId(null)} className="px-3 py-1 text-white/60 hover:text-white/90 text-xs">Cancel</button>
                                  <button onClick={() => updateCommentMutation.mutate({ id: item.id, text: editingCommentText })} className="bg-primary hover:bg-primary/80 text-white px-3 py-1 rounded text-xs font-medium">Save</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="backdrop-blur-md bg-white/[0.03] p-4 rounded-xl text-[14px] text-white/90 shadow-sm border border-white/5 prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#1E293B] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg prose-a:text-primary max-w-none">
                                  <ReactMarkdown>
                                    {typeof item.content === 'string' ? item.content : '*No content*'}
                                  </ReactMarkdown>
                                  
                                  {typeof item.attached_file_url === 'string' && (
                                    <div className="mt-4 pt-3 border-t border-white/10">
                                      {item.attached_file_url.match(/\.(jpeg|jpg|gif|png)$/i) != null ? (
                                        <a href={item.attached_file_url} target="_blank" rel="noreferrer" className="block w-48 h-32 rounded-lg overflow-hidden border border-white/10 hover:border-primary/50 transition-colors">
                                          <img src={item.attached_file_url} alt="Attachment" className="w-full h-full object-cover" />
                                        </a>
                                      ) : (
                                        <a href={item.attached_file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/80 transition-colors">
                                          <Paperclip2 size={16} />
                                          Download Attachment
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="relative">
                                  <div className="flex items-center gap-3 mt-1.5 text-[12px] text-white/40 font-medium ml-1">
                                    <button onClick={() => { setEditingCommentId(item.id); setEditingCommentText(item.content); }} className="hover:text-white/80 transition-colors">Edit</button>
                                    <span>•</span>
                                    <button onClick={() => setDeletingCommentId(item.id)} className="hover:text-white/80 transition-colors">Delete</button>
                                  </div>

                                  {deletingCommentId === item.id && (
                                    <div className="absolute top-7 left-[-10px] w-[260px] bg-[#222834] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-white/10 z-[100] p-4 flex flex-col">
                                      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                                        <span className="text-[13px] font-bold text-white/90">Delete Comment?</span>
                                        <button onClick={() => setDeletingCommentId(null)} className="text-white/40 hover:text-white/90 transition-colors">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                      <p className="text-[12px] text-white/70 mb-4 leading-relaxed text-left">
                                        Are you sure you want to delete this comment? This action cannot be undone.
                                      </p>
                                      <button
                                        onClick={() => deleteCommentMutation.mutate(item.id)}
                                        disabled={deleteCommentMutation.isPending}
                                        className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-medium py-2 rounded-md text-[13px] transition-colors"
                                      >
                                        {deleteCommentMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="pt-1 text-[13px]">
                            <span className="font-bold text-white/90 mr-1.5">{name}</span>
                            <span className="text-white/70">{item.action}</span>
                            <span className="text-white/40 ml-2 text-[11px]">{format(new Date(item.created_at || Date.now()), 'MMM d, p')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

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
