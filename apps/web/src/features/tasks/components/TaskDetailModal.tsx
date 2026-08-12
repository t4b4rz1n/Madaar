import React, { useState, useEffect } from 'react';
import type { Task } from '../types';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { updateTask, getTaskComments, addComment, getTaskChecklists, addChecklistItem, toggleChecklistItem, deleteTask } from '../api/tasksApi';
import { CloseSquare, Element3, TextalignLeft, Activity, Profile2User, Tag, Calendar, TaskSquare, Paperclip2, Trash, Message, More } from 'iconsax-reactjs';
import { format } from 'date-fns';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);

  // Queries
  const { data: comments = [] } = useQuery({
    queryKey: ['taskComments', task.id],
    queryFn: () => getTaskComments(task.id),
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ['taskChecklists', task.id],
    queryFn: () => getTaskChecklists(task.id),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Task>) => updateTask(task.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const addCommentMutation = useMutation({
    mutationFn: (text: string) => addComment(task.id, text),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['taskComments', task.id] });
    },
  });

  const addChecklistMutation = useMutation({
    mutationFn: (text: string) => addChecklistItem(task.id, text),
    onSuccess: () => {
      setNewChecklistText('');
      setIsAddingChecklist(false);
      queryClient.invalidateQueries({ queryKey: ['taskChecklists', task.id] });
    },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number, completed: boolean }) => toggleChecklistItem(id, completed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taskChecklists', task.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
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
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#0F172A]/80 backdrop-blur-sm p-4 pt-12 overflow-y-auto" onClick={onClose}>
      <div className="flex flex-col items-center w-full max-w-[900px]">
        
        {/* Modal Container */}
        <div className="bg-[#273043] w-full rounded-xl shadow-2xl flex flex-col relative" onClick={e => e.stopPropagation()}>
          
          {/* Cover Header */}
          <div className="h-16 bg-[#B45309] rounded-t-xl relative flex items-center px-4">
            <div className="bg-black/20 hover:bg-black/30 cursor-pointer text-white/90 px-3 py-1.5 rounded flex items-center gap-1 text-sm font-medium backdrop-blur-md transition-colors border border-white/10">
              {task.status_detail?.name || 'Status'} <span className="text-xs">˅</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-3 pr-8">
              <button className="text-white/60 hover:text-white transition-colors" title="Cover"><TaskSquare size={18} variant="Outline" /></button>
              <button className="text-white/60 hover:text-white transition-colors" title="Watch"><Element3 size={18} variant="Outline" /></button>
              <button className="text-white/60 hover:text-white transition-colors" title="More Actions"><More size={18} /></button>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 p-1 text-white/70 hover:text-white hover:bg-black/20 rounded-md transition-colors">
              <CloseSquare size={22} variant="Outline" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row min-h-[450px]">
            {/* Left Column (Main Info) */}
            <div className="flex-[1.4] p-6 flex flex-col gap-6">
              
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
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors">
                  <span className="text-lg leading-none mb-0.5">+</span> Add
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors opacity-50 cursor-not-allowed">
                  <Tag size={14} className="text-white/60" /> Labels
                </button>
                <button onClick={() => {
                  const newDate = new Date();
                  newDate.setDate(newDate.getDate() + 1);
                  updateMutation.mutate({ due_date: newDate.toISOString() });
                }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors">
                  <Calendar size={14} className="text-white/60" /> Dates
                </button>
                <button onClick={() => setIsAddingChecklist(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors">
                  <TaskSquare size={14} className="text-white/60" /> Checklist
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[13px] text-white/80 border border-white/5 transition-colors opacity-50 cursor-not-allowed">
                  <Paperclip2 size={14} className="text-white/60" /> Attachment
                </button>
              </div>

              {/* Members */}
              <div className="ml-8">
                <h3 className="text-[11px] font-semibold text-white/50 mb-2 uppercase tracking-wide">Members</h3>
                <div className="flex items-center gap-1">
                  {task.assignee_detail && (
                    <div className="w-8 h-8 rounded-full bg-[#EF4444] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[#273043] relative cursor-pointer" title={task.assignee_detail.first_name}>
                      {task.assignee_detail.first_name?.[0] || 'A'}
                    </div>
                  )}
                  <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 transition-colors ml-1">
                    <span className="text-lg leading-none mb-0.5">+</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="flex gap-3 items-start mt-2">
                <TextalignLeft size={20} className="text-white/40 mt-1 shrink-0" />
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-white/90 mb-3">Description</h3>
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
                      className="bg-[#1C253B] hover:bg-white/10 transition-colors rounded-lg border border-white/5 p-4 text-sm text-white/60 cursor-pointer min-h-[80px]"
                    >
                      {description || 'Add a more detailed description...'}
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist Section */}
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
                <button className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-[11px] text-white/70 transition-colors">Show details</button>
              </div>
              
              {/* Comment Input */}
              <div className="bg-[#273043] rounded-lg border border-white/10 p-0 focus-within:border-white/30 transition-all mb-6">
                <textarea 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-transparent text-sm text-white/80 outline-none resize-none p-3 pb-1"
                  rows={2}
                  placeholder="Write a comment..."
                />
                <div className="flex justify-between items-center px-2 pb-2">
                  <div className="flex gap-1">
                    <button className="p-1.5 text-white/40 hover:text-white/80 rounded transition-colors" title="Attachments disabled"><Paperclip2 size={16}/></button>
                  </div>
                  <button 
                    disabled={!commentText.trim()}
                    onClick={() => addCommentMutation.mutate(commentText)}
                    className="bg-white/10 disabled:opacity-50 hover:bg-white/20 text-white px-4 py-1.5 rounded text-xs font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Activity List */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#EF4444] flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                      {comment.author_detail?.first_name?.[0] || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] mb-0.5">
                        <span className="font-semibold text-white/90 mr-1">{comment.author_detail?.first_name || 'User'}</span>
                        <span className="text-white/50">added a comment</span>
                      </div>
                      <div className="text-[11px] text-white/40 hover:underline cursor-pointer mb-1.5">
                        {format(new Date(comment.created_at), 'MMM d, p')}
                      </div>
                      <div className="text-[13px] text-white/80 bg-white/5 rounded-md p-2">
                        {comment.content}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Example of a system activity */}
                <div className="flex gap-3 opacity-60">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                    {task.assignee_detail?.first_name?.[0] || 'M'}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] mb-0.5">
                      <span className="font-semibold text-white/90 mr-1">{task.assignee_detail?.first_name || 'User'}</span>
                      <span className="text-white/50">added this card to {task.status_detail?.name}</span>
                    </div>
                    <div className="text-[11px] text-white/40 hover:underline cursor-pointer mb-1.5">
                      {format(new Date(task.created_at || Date.now()), 'MMM d, p')}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Floating Footer Tabs */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="flex items-center bg-[#1E2536] border border-white/5 rounded-full p-1 shadow-lg">
            <button className="flex items-center gap-2 px-4 py-1.5 text-white/50 hover:text-white/90 text-xs font-medium transition-colors rounded-full hover:bg-white/5">
              <Element3 size={14} /> Power-ups
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button className="flex items-center gap-2 px-4 py-1.5 text-white/50 hover:text-white/90 text-xs font-medium transition-colors rounded-full hover:bg-white/5">
              <Activity size={14} /> Automations
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button className="flex items-center gap-2 px-4 py-1.5 text-blue-400 bg-blue-500/10 text-xs font-medium transition-colors rounded-full">
              <Message size={14} /> Comments
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
