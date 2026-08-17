import React, { useState, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GlobalProjectSelector } from '../components/GlobalProjectSelector';
import { WorkspaceView } from '../components/WorkspaceView';
import { KanbanBoard } from '../components/KanbanBoard';
import { DependencyGraph } from '../components/DependencyGraph';
import { useTaskStore } from '../store/useTaskStore';
import { getBoards } from '../api/tasksApi';
import { StandupModal } from '../components/StandupModal';
import { Edit2 } from 'iconsax-reactjs';

const AttendancePage = lazy(() => import('../../attendance/pages/AttendancePage'));

export const TaskManagementPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'kanban' | 'graph' | 'attendance'>('kanban');
  const [isStandupModalOpen, setIsStandupModalOpen] = useState(false);
  const { activeProjectId, activeBoardId, setActiveBoard } = useTaskStore();

  const { data: boards } = useQuery({
    queryKey: ['boards', activeProjectId],
    queryFn: () => getBoards(activeProjectId!),
    enabled: !!activeProjectId,
  });


  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] -m-6 flex-col bg-base-200">
      {/* Top Navigation Bar */}
      <div className="relative z-50 flex flex-wrap items-center justify-between gap-2 border-b border-base-content/10 bg-base-100/90 px-3 py-2 backdrop-blur-xl sm:px-4">
        {/* Left side: Project selector + Board tabs */}
        <div className="flex items-center gap-1">
          <GlobalProjectSelector />

          {/* Board tabs */}
          {activeProjectId && boards && boards.length > 0 && (
            <div className="ml-2 flex min-w-0 max-w-[48vw] items-center gap-1 overflow-x-auto">
              <div className="w-px h-6 bg-base-300 mx-1"></div>
              {boards.map(board => (
                <button
                  key={board.id}
                  onClick={() => {
                    setActiveBoard(board.id.toString());
                    setViewMode('kanban');
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeBoardId === board.id.toString()
                      ? 'bg-base-300 text-base-content'
                      : 'text-base-content/50 hover:text-base-content hover:bg-base-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: board.background_color || '#6366f1' }}
                  ></span>
                  {board.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right side: View mode toggle & Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsStandupModalOpen(true)}
            className="btn btn-sm btn-outline gap-2 border-base-300 text-base-content/80 hover:bg-base-200 hover:border-base-300 hover:text-base-content"
          >
            <Edit2 size="16" />
            <span className="hidden sm:inline">Daily Standup</span>
          </button>

          {activeBoardId && (
            <div className="flex bg-base-200 p-0.5 rounded-lg ml-2">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-base-100 text-primary shadow-sm'
                    : 'text-base-content/50 hover:text-base-content'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'graph'
                    ? 'bg-base-100 text-primary shadow-sm'
                    : 'text-base-content/50 hover:text-base-content'
                }`}
              >
                Graph
              </button>
              <button
                onClick={() => setViewMode('attendance')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'attendance'
                    ? 'bg-base-100 text-primary shadow-sm'
                    : 'text-base-content/50 hover:text-base-content'
                }`}
              >
                Time & Attendance
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="relative flex-1 overflow-hidden bg-base-200 transition-colors duration-300"
      >
        {!activeBoardId ? (
          <WorkspaceView />
        ) : (
          viewMode === 'kanban' ? (
            <KanbanBoard />
          ) : viewMode === 'graph' ? (
            <div className="p-4 h-full">
              <DependencyGraph />
            </div>
          ) : (
            <div className="h-full overflow-hidden bg-base-100">
              <AttendancePage />
            </div>
          )
        )}
      </div>

      <StandupModal isOpen={isStandupModalOpen} onClose={() => setIsStandupModalOpen(false)} />
    </div>
  );
};
