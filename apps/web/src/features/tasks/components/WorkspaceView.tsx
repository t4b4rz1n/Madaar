import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoards, createBoard } from '../api/tasksApi';
import { useTaskStore } from '../store/useTaskStore';
import { Add } from 'iconsax-reactjs';

export const WorkspaceView: React.FC = () => {
  const { activeProjectId, setActiveBoard } = useTaskStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [boardColor, setBoardColor] = useState('#6366f1');

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
    },
    onError: (err: any) => {
      console.error(err);
      alert('Error creating board: ' + JSON.stringify(err?.response?.data || err.message));
    }
  });

  if (!activeProjectId) {
    return <div className="p-8 text-center text-slate-500">Please select a project from the top menu.</div>;
  }

  const presetColors = [
    // Gradients
    'linear-gradient(135deg, #a855f7, #6366f1)',
    'linear-gradient(135deg, #8b5cf6, #3b82f6)',
    'linear-gradient(135deg, #1e293b, #0f172a)',
    'linear-gradient(135deg, #2563eb, #1e40af)',
    'linear-gradient(135deg, #3b82f6, #60a5fa)',
    'linear-gradient(135deg, #4f46e5, #4338ca)',
    'linear-gradient(135deg, #991b1b, #ef4444)',
    'linear-gradient(135deg, #475569, #1e293b)',
    'linear-gradient(135deg, #10b981, #047857)',
    'linear-gradient(135deg, #ec4899, #be185d)',
    'linear-gradient(135deg, #f59e0b, #b45309)',
    // Solids
    '#e11d48', // rose
    '#7c3aed', // purple
    '#b91c1c', // red
    '#059669', // green
    '#c2410c', // rust
    '#2563eb', // blue
    '#475569', // slate
    '#0284c7', // light blue
    '#65a30d', // olive
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-base-content">Workspaces</h2>
          <p className="text-sm text-base-content/70 mt-1">Manage boards for this project</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-stretch">
        {/* Existing Boards */}
        {boards?.map(board => (
          <button
            key={board.id}
            onClick={() => setActiveBoard(board.id)}
            className="w-64 h-32 rounded-xl p-4 flex flex-col justify-between text-right border border-white/10 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden"
            style={{ background: board.background_color || '#334155' }}
          >
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300"></div>
            <div className="relative z-10 w-full flex justify-between items-start">
              <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">{board.statuses?.length || 0} Statuses</span>
            </div>
            <div className="relative z-10 w-full text-left">
              <h3 className="text-white font-bold text-lg">{board.title}</h3>
            </div>
          </button>
        ))}

        {/* Add Board Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-64 h-32 rounded-xl p-4 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-base-300 text-base-content/60 hover:text-base-content hover:border-base-content/40 transition-colors bg-transparent"
        >
          <Add size={24} />
          <span className="font-semibold text-sm">Add Board</span>
        </button>
      </div>

      {/* Create Board Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-base-100 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-base-300">
            <h3 className="text-lg font-bold text-base-content mb-4">Create New Board</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1">Board Title</label>
                <input 
                  type="text" 
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  className="w-full bg-base-200 border border-base-300 rounded-lg px-4 py-2 text-base-content outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Development Sprint"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-2">Color Theme</label>
                <div className="flex flex-wrap gap-2">
                  {presetColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setBoardColor(color)}
                      className={`w-12 h-8 rounded-lg border-2 transition-all ${boardColor === color ? 'border-white ring-2 ring-indigo-500 scale-110' : 'border-transparent'}`}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setBoardTitle('');
                  setBoardColor('#6366f1');
                }}
                className="px-4 py-2 text-sm font-medium text-base-content/60 hover:text-base-content"
              >
                Cancel
              </button>
              <button 
                onClick={() => createBoardMutation.mutate()}
                disabled={!boardTitle || createBoardMutation.isPending}
                className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {createBoardMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
