import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getBoards, createBoard } from '../api/tasksApi';
import { useTaskStore } from '../store/useTaskStore';
import { Add, FolderAdd, CloseCircle } from 'iconsax-reactjs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { usePermissions } from '../../auth/hooks/usePermissions';

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


  const { data: boards } = useQuery({
    queryKey: ['boards', activeProjectId],
    queryFn: () => getBoards(activeProjectId!),
    enabled: !!activeProjectId,
  });

  const createBoardMutation = useMutation({
    mutationFn: () => createBoard(activeProjectId!, boardTitle, boardColor),
    onSuccess: (newBoard) => {
      queryClient.invalidateQueries({ queryKey: ['boards', activeProjectId] });
      setActiveBoard(newBoard.id.toString());
      setIsModalOpen(false);
      setBoardTitle('');
      toast.success("Board created successfully");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.response?.data?.detail || err?.response?.data?.error || "Failed to create board");
    }
  });

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

  return (
    <div className="h-full overflow-y-auto p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-base-content">Workspace Boards</h2>
          <p className="text-xs text-base-content/40 mt-0.5">Manage and navigate boards for this project</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Existing Boards */}
        {boards?.map((board, idx) => {
          const pastelFallback = presetColors[idx % presetColors.length].value;
          return (
            <button
              key={board.id}
              onClick={() => setActiveBoard(board.id.toString())}
              className="group relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl p-4 text-center border border-base-content/6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              style={{ background: board.background_color || pastelFallback }}
            >
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition duration-300" />

              <div className="relative z-10 flex justify-end">
                <span className="rounded-full bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  {board.statuses?.length || 0} Statuses
                </span>
              </div>

              <div className="relative z-10 my-auto flex flex-1 items-center justify-center px-3">
                <h3 dir="auto" className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight text-center drop-shadow-md">
                  {board.title}
                </h3>
              </div>
            </button>
          );
        })}

        {/* Add Board Card */}
        {canManageBoard && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex h-40 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-base-content/15 bg-base-100/50 text-base-content/40 transition hover:border-base-content/25 hover:bg-base-100 hover:text-base-content"
          >
            <Add size={24} />
            <span className="text-sm font-bold">Add Board</span>
          </button>
        )}
      </div>


      {/* Create Board Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false);
              setBoardTitle('');
              setBoardColor(presetColors[0].value);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              className="madaar-surface relative w-full max-w-md overflow-hidden rounded-[28px] border border-base-content/10 bg-base-100/95 shadow-madaar-floating backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-h-[calc(100vh-2rem)] overflow-y-auto">
                {/* Header */}
                <header className="flex items-start justify-between gap-4 border-b border-base-content/10 bg-base-200/20 px-6 py-5">
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                      Board Setup
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight text-base-content">
                      Create a new board
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-base-content/60">
                      Boards help organize tasks into different workflows.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setBoardTitle('');
                      setBoardColor(presetColors[0].value);
                    }}
                    disabled={createBoardMutation.isPending}
                    className="btn btn-ghost btn-square btn-sm shrink-0 rounded-xl text-base-content/50 transition hover:bg-base-200 hover:text-base-content"
                    aria-label="Close board form"
                  >
                    <CloseCircle size={20} />
                  </button>
                </header>

                {/* Form */}
                <form
                  className="space-y-6 p-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    createBoardMutation.mutate();
                  }}
                >
                  {/* Board Title */}
                  <div className="space-y-2">
                    <label htmlFor="board-title" className="block text-sm font-medium text-base-content">
                      Board title <span className="text-error">*</span>
                    </label>
                    <input
                      id="board-title"
                      type="text"
                      required
                      autoFocus
                      value={boardTitle}
                      onChange={(e) => setBoardTitle(e.target.value)}
                      className="input input-bordered w-full rounded-xl bg-base-200/50 transition-colors focus:border-primary focus:bg-base-100 focus:outline-none"
                      placeholder="e.g. Backend, Frontend, Design"
                      disabled={createBoardMutation.isPending}
                    />
                  </div>

                  {/* Color Picker */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-base-content">
                      Board color
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {presetColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setBoardColor(color.value)}
                          disabled={createBoardMutation.isPending}
                          className={`group relative h-10 rounded-xl transition-all ${boardColor === color.value
                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100 scale-105'
                            : 'hover:scale-105'
                            }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        >
                          {boardColor === color.value && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-base-content/45">
                      Choose a color to identify this board easily.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col-reverse gap-3 border-t border-base-content/10 pt-6 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setBoardTitle('');
                        setBoardColor(presetColors[0].value);
                      }}
                      disabled={createBoardMutation.isPending}
                      className="btn btn-ghost rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createBoardMutation.isPending || !boardTitle.trim()}
                      className="btn btn-primary rounded-xl px-6 shadow-lg shadow-primary/15 disabled:opacity-50"
                    >
                      {createBoardMutation.isPending ? (
                        <>
                          <span className="loading loading-spinner loading-sm" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Add size={16} />
                          <span>Create board</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
