import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoards, createBoard } from '../api/tasksApi';
import { useTaskStore } from '../store/useTaskStore';
import { Add, FolderAdd } from 'iconsax-reactjs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const WorkspaceView: React.FC = () => {
  const { activeProjectId, setActiveBoard } = useTaskStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [boardColor, setBoardColor] = useState('linear-gradient(135deg, #b39ddb, #9fa8da)');

  const { data: boards } = useQuery({
    queryKey: ['boards', activeProjectId],
    queryFn: () => getBoards(activeProjectId!),
    enabled: !!activeProjectId,
  });

  const createBoardMutation = useMutation({
    mutationFn: () => createBoard(activeProjectId!, boardTitle, boardColor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', activeProjectId] });
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
    'linear-gradient(135deg, #b39ddb, #9fa8da)', // Lavender -> Periwinkle
    'linear-gradient(135deg, #81d4fa, #80cbc4)', // Sky -> Mint
    'linear-gradient(135deg, #a5d6a7, #c5e1a5)', // Sage -> Pistachio
    'linear-gradient(135deg, #ffcc80, #f48fb1)', // Peach -> Blush
    'linear-gradient(135deg, #ce93d8, #e1bee7)', // Mauve -> Lilac
    'linear-gradient(135deg, #90caf9, #b2dfdb)', // Dusty Blue -> Seafoam
    'linear-gradient(135deg, #ef9a9a, #ffcc80)', // Rose Quartz -> Peach
    'linear-gradient(135deg, #bcaaa4, #ffe0b2)', // Clay -> Sand
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
          const pastelFallback = presetColors[idx % presetColors.length];
          return (
            <button
              key={board.id}
              onClick={() => setActiveBoard(board.id.toString())}
              className="group relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl p-4 text-left border border-base-content/6 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: board.background_color || pastelFallback }}
            >
              <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition duration-300" />
              
              <div className="relative z-10">
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  {board.statuses?.length || 0} Statuses
                </span>
              </div>
              
              <div className="relative z-10">
                <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                  {board.title}
                </h3>
              </div>
            </button>
          );
        })}

        {/* Add Board Card */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-base-content/15 bg-base-100/50 text-base-content/40 transition hover:border-base-content/25 hover:bg-base-100 hover:text-base-content"
        >
          <Add size={20} />
          <span className="text-xs font-bold">Add Board</span>
        </button>
      </div>

      {/* Create Board Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-base-100 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-base-content/10 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-base-content mb-4">Create New Board</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-base-content/40 mb-1 uppercase tracking-wider">Board Title</label>
                <input
                  type="text"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  className="w-full bg-base-200 rounded-xl px-3 py-2 text-xs font-semibold text-base-content outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30 focus:bg-base-100 transition-all"
                  placeholder="e.g. Sprint Backlog"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-base-content/40 mb-2 uppercase tracking-wider">Color Theme</label>
                <div className="grid grid-cols-4 gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBoardColor(color)}
                      className={`h-9 rounded-xl border-2 transition-all ${
                        boardColor === color ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setBoardTitle('');
                  setBoardColor(presetColors[0]);
                }}
                className="rounded-xl px-4 py-2 text-xs font-bold text-base-content/50 hover:bg-base-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createBoardMutation.mutate()}
                disabled={!boardTitle.trim() || createBoardMutation.isPending}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-content shadow-xs transition hover:bg-primary/95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {createBoardMutation.isPending ? 'Creating...' : 'Create Board'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
