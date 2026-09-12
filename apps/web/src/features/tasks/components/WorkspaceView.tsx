import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getBoards, createBoard, updateBoard, deleteBoard } from '../api/tasksApi';
import { useTaskStore } from '../store/useTaskStore';
import {
  Add,
  FolderAdd,
  CloseCircle,
  Task,
  Element3,
  SearchNormal1,
  Sort,
  TickCircle,
  More,
  Edit2,
  Trash,
} from 'iconsax-reactjs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { usePermissions } from '../../auth/hooks/usePermissions';
import type { Board } from '../types';

import type { Variants } from 'framer-motion';

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, delay: i * 0.04, ease: "easeOut" },
  }),
};

export const WorkspaceView: React.FC = () => {
  const { activeProjectId, setActiveBoard } = useTaskStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isStaff } = usePermissions();

  const canManageBoard =
    hasPermission('board.manage') ||
    hasPermission('project.manage') ||
    hasPermission('org.manage_settings') ||
    isStaff;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [boardColor, setBoardColor] = useState('#b39ddb');

  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('');

  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'tasks'>('recent');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data: boards } = useQuery({
    queryKey: ['boards', activeProjectId],
    queryFn: () => getBoards(activeProjectId!),
    enabled: !!activeProjectId,
  });

  const presetColors = [
    { name: 'Purple', value: '#b39ddb' },
    { name: 'Blue', value: '#81d4fa' },
    { name: 'Teal', value: '#80cbc4' },
    { name: 'Green', value: '#a5d6a7' },
    { name: 'Orange', value: '#ffcc80' },
    { name: 'Pink', value: '#f48fb1' },
    { name: 'Indigo', value: '#9fa8da' },
    { name: 'Cyan', value: '#80deea' },
    { name: 'Lime', value: '#e6ee9c' },
    { name: 'Red', value: '#ef9a9a' },
  ];

  const filteredBoards = useMemo(() => {
    if (!boards) return [];
    const filtered = boards.filter(board =>
      board.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'recent':
        filtered.sort((a, b) => Number(b.id) - Number(a.id));
        break;
      case 'tasks':
        filtered.sort((a, b) => (b.task_count || 0) - (a.task_count || 0));
        break;
    }
    return filtered;
  }, [boards, searchQuery, sortBy]);

  const stats = useMemo(() => {
    if (!boards) return { total: 0, totalTasks: 0, doneTasks: 0 };
    return {
      total: boards.length,
      totalTasks: boards.reduce((sum, b) => sum + (b.task_count || 0), 0),
      doneTasks: boards.reduce((sum, b) => sum + (b.done_task_count || 0), 0),
    };
  }, [boards]);

  const createBoardMutation = useMutation({
    mutationFn: () => createBoard(activeProjectId!, boardTitle, boardColor),
    onSuccess: (newBoard) => {
      queryClient.invalidateQueries({ queryKey: ['boards', activeProjectId] });
      setActiveBoard(newBoard.id.toString());
      setIsModalOpen(false);
      setBoardTitle('');
      toast.success('Board created successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.response?.data?.error || 'Failed to create board');
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: () =>
      updateBoard(editingBoard!.id.toString(), {
        title: editTitle,
        background_color: editColor,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', activeProjectId] });
      setEditingBoard(null);
      toast.success('Board updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update board');
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: () => deleteBoard(deletingBoard!.id.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', activeProjectId] });
      setDeletingBoard(null);
      toast.success('Board deleted');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete board');
    },
  });

  const openEditModal = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBoard(board);
    setEditTitle(board.title);
    setEditColor(board.background_color || presetColors[0].value);
    setOpenMenuId(null);
  };

  const openDeleteConfirm = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingBoard(board);
    setOpenMenuId(null);
  };

  if (!activeProjectId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-base-content/8 bg-base-100 p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FolderAdd size={24} />
          </div>
          <h2 className="text-lg font-bold text-base-content">Choose a Project</h2>
          <p className="mt-2 text-xs leading-relaxed text-base-content/50">
            Workspaces live inside projects. Select an active project from the top selector or manage your projects here.
          </p>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-content transition hover:bg-primary/95 shadow-sm"
          >
            <Add size={16} />
            <span>Manage Projects</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-base-200/30" onClick={() => setOpenMenuId(null)}>
      <div className="border-b border-base-content/8 bg-base-100 px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Element3 size={20} variant="Bold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-base-content">Workspace Boards</h2>
              <p className="text-xs text-base-content/50">
                {stats.total} boards · {stats.doneTasks}/{stats.totalTasks} tasks done
              </p>
            </div>
          </div>
          {canManageBoard && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-content shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              <Add size={18} />
              <span>New Board</span>
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchNormal1 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              type="text"
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-base-content/10 bg-base-200/50 py-2 pl-9 pr-4 text-sm transition-all focus:border-primary focus:bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Sort size={16} className="text-base-content/40" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-base-content/10 bg-base-200/50 px-3 py-2 text-sm font-medium transition-all focus:border-primary focus:bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="tasks">Tasks</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {filteredBoards.length === 0 && searchQuery ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-base-200">
                <SearchNormal1 size={28} className="text-base-content/40" />
              </div>
              <h3 className="text-lg font-bold text-base-content">No boards found</h3>
              <p className="mt-1 text-sm text-base-content/50">Try adjusting your search query</p>
            </div>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="w-full max-w-md text-center">
              <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Element3 size={36} className="text-primary" variant="Bold" />
              </div>
              <h3 className="text-xl font-bold text-base-content">Create your first board</h3>
              <p className="mt-2 text-sm leading-relaxed text-base-content/60">Boards help you organize tasks into different workflows.</p>
              {canManageBoard && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-content shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                >
                  <Add size={18} />
                  <span>Create Board</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBoards.map((board, idx) => {
              const pastelFallback = presetColors[idx % presetColors.length].value;
              const statusCount = board.statuses?.length || 0;
              const taskCount = board.task_count ?? 0;
              const doneCount = board.done_task_count ?? 0;
              const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

              return (
                <motion.div
                  key={board.id}
                  custom={idx}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="group relative overflow-hidden rounded-2xl border border-base-content/8 bg-base-100 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 cursor-pointer"
                  onClick={() => setActiveBoard(board.id.toString())}
                >
                  <div
                    className="absolute left-0 top-0 h-1.5 w-full"
                    style={{ background: board.background_color || pastelFallback }}
                  />
                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div
                        className="flex size-11 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-110"
                        style={{ background: board.background_color || pastelFallback }}
                      >
                        <Element3 size={20} className="text-white" variant="Bold" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-base-200 px-2.5 py-1 text-xs font-bold text-base-content/60">
                          {statusCount} {statusCount === 1 ? 'Status' : 'Statuses'}
                        </div>
                        {canManageBoard && (
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="flex size-7 items-center justify-center rounded-lg text-base-content/40 opacity-0 transition-all hover:bg-base-200 hover:text-base-content group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === board.id ? null : board.id);
                              }}
                            >
                              <More size={16} />
                            </button>
                            <AnimatePresence>
                              {openMenuId === board.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute right-0 top-8 z-50 min-w-[140px] overflow-hidden rounded-xl border border-base-content/10 bg-base-100 shadow-xl"
                                >
                                  <button
                                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-base-content hover:bg-base-200 transition-colors"
                                    onClick={(e) => openEditModal(board, e)}
                                  >
                                    <Edit2 size={14} />
                                    Edit Board
                                  </button>
                                  <button
                                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-error hover:bg-error/10 transition-colors"
                                    onClick={(e) => openDeleteConfirm(board, e)}
                                  >
                                    <Trash size={14} />
                                    Delete Board
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3
                      dir="auto"
                      className="mb-3 text-base font-bold tracking-tight text-base-content line-clamp-2 group-hover:text-primary transition-colors"
                    >
                      {board.title}
                    </h3>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-base-content/50">
                        <div className="flex items-center gap-1.5">
                          <Task size={13} />
                          <span>{taskCount} tasks</span>
                        </div>
                        <div className="flex items-center gap-1 font-medium">
                          <TickCircle size={12} className="text-emerald-500" />
                          <span>{doneCount}/{taskCount} done</span>
                        </div>
                      </div>
                      {taskCount > 0 && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-200">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 transition-transform group-hover:scale-x-100" />
                </motion.div>
              );
            })}

            {canManageBoard && (
              <motion.button
                custom={filteredBoards.length}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                onClick={() => setIsModalOpen(true)}
                className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-base-content/15 bg-base-100/50 text-base-content/40 transition-all hover:border-primary/40 hover:bg-base-100 hover:text-primary"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-base-200 transition-colors">
                  <Add size={24} />
                </div>
                <span className="text-sm font-bold">Create Board</span>
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
            onClick={() => { setIsModalOpen(false); setBoardTitle(''); setBoardColor(presetColors[0].value); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
              className="madaar-surface relative w-full max-w-md overflow-hidden rounded-[28px] border border-base-content/10 bg-base-100/95 shadow-madaar-floating backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-h-[calc(100vh-2rem)] overflow-y-auto">
                <header className="flex items-start justify-between gap-4 border-b border-base-content/10 bg-base-200/20 px-6 py-5">
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">Board Setup</p>
                    <h2 className="text-2xl font-semibold tracking-tight text-base-content">Create a new board</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-base-content/60">Boards help organize tasks into different workflows.</p>
                  </div>
                  <button type="button" onClick={() => { setIsModalOpen(false); setBoardTitle(''); }} disabled={createBoardMutation.isPending} className="btn btn-ghost btn-square btn-sm shrink-0 rounded-xl text-base-content/50 transition hover:bg-base-200">
                    <CloseCircle size={20} />
                  </button>
                </header>
                <form className="space-y-6 p-6" onSubmit={(e) => { e.preventDefault(); createBoardMutation.mutate(); }}>
                  <div className="space-y-2">
                    <label htmlFor="board-title" className="block text-sm font-medium text-base-content">Board title <span className="text-error">*</span></label>
                    <input id="board-title" type="text" required autoFocus value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} className="input input-bordered w-full rounded-xl bg-base-200/50 transition-colors focus:border-primary focus:bg-base-100 focus:outline-none" placeholder="e.g. Backend, Frontend, Design" disabled={createBoardMutation.isPending} />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-base-content">Board color</label>
                    <div className="grid grid-cols-5 gap-2">
                      {presetColors.map((color) => (
                        <button key={color.value} type="button" onClick={() => setBoardColor(color.value)} disabled={createBoardMutation.isPending} className={`relative h-10 rounded-xl transition-all ${boardColor === color.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100 scale-105' : 'hover:scale-105'}`} style={{ backgroundColor: color.value }} title={color.name}>
                          {boardColor === color.value && (<div className="absolute inset-0 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col-reverse gap-3 border-t border-base-content/10 pt-6 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => { setIsModalOpen(false); setBoardTitle(''); }} disabled={createBoardMutation.isPending} className="btn btn-ghost rounded-xl">Cancel</button>
                    <button type="submit" disabled={createBoardMutation.isPending || !boardTitle.trim()} className="btn btn-primary rounded-xl px-6 shadow-lg shadow-primary/15 disabled:opacity-50">
                      {createBoardMutation.isPending ? (<><span className="loading loading-spinner loading-sm" /><span>Creating...</span></>) : (<><Add size={16} /><span>Create board</span></>)}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Board Modal */}
      <AnimatePresence>
        {editingBoard && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={() => setEditingBoard(null)}>
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }} className="w-full max-w-md overflow-hidden rounded-[28px] border border-base-content/10 bg-base-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <header className="flex items-start justify-between gap-4 border-b border-base-content/10 bg-base-200/20 px-6 py-5">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">Edit Board</p>
                  <h2 className="text-xl font-semibold tracking-tight text-base-content">Update board details</h2>
                </div>
                <button type="button" onClick={() => setEditingBoard(null)} className="btn btn-ghost btn-square btn-sm shrink-0 rounded-xl text-base-content/50"><CloseCircle size={20} /></button>
              </header>
              <form className="space-y-5 p-6" onSubmit={(e) => { e.preventDefault(); updateBoardMutation.mutate(); }}>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-base-content">Board title <span className="text-error">*</span></label>
                  <input type="text" required autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input input-bordered w-full rounded-xl bg-base-200/50 focus:border-primary focus:bg-base-100 focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-base-content">Board color</label>
                  <div className="grid grid-cols-5 gap-2">
                    {presetColors.map((color) => (
                      <button key={color.value} type="button" onClick={() => setEditColor(color.value)} className={`relative h-10 rounded-xl transition-all ${editColor === color.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100 scale-105' : 'hover:scale-105'}`} style={{ backgroundColor: color.value }} title={color.name}>
                        {editColor === color.value && (<div className="absolute inset-0 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-base-content/10 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setEditingBoard(null)} className="btn btn-ghost rounded-xl">Cancel</button>
                  <button type="submit" disabled={updateBoardMutation.isPending || !editTitle.trim()} className="btn btn-primary rounded-xl px-6 disabled:opacity-50">
                    {updateBoardMutation.isPending ? (<><span className="loading loading-spinner loading-sm" /><span>Saving...</span></>) : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingBoard && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setDeletingBoard(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="w-full max-w-sm rounded-2xl border border-base-content/10 bg-base-100 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-error/10 text-error">
                <Trash size={22} />
              </div>
              <h3 className="text-lg font-bold text-base-content">Delete Board?</h3>
              <p className="mt-1 text-sm text-base-content/60">Are you sure you want to delete <strong>"{deletingBoard.title}"</strong>? This action cannot be undone.</p>
              <div className="mt-6 flex gap-3 justify-end">
                <button onClick={() => setDeletingBoard(null)} className="btn btn-ghost rounded-xl">Cancel</button>
                <button onClick={() => deleteBoardMutation.mutate()} disabled={deleteBoardMutation.isPending} className="btn btn-error rounded-xl px-5 text-error-content disabled:opacity-50">
                  {deleteBoardMutation.isPending ? (<><span className="loading loading-spinner loading-sm" /><span>Deleting...</span></>) : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
