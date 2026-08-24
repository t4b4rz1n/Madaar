import React, { lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GlobalProjectSelector } from '../components/GlobalProjectSelector';
import { WorkspaceView } from '../components/WorkspaceView';
import { KanbanBoard } from '../components/KanbanBoard';
import { useTaskStore } from '../store/useTaskStore';
import { getBoards } from '../api/tasksApi';
import { Calendar1, Kanban } from 'iconsax-reactjs';

const AttendancePage = lazy(() => import('../../attendance/pages/AttendancePage'));

export const TaskManagementPage: React.FC = () => {
  const { activeProjectId, activeBoardId, setActiveBoard, viewMode, setViewMode } = useTaskStore();

  const { data: boards } = useQuery({
    queryKey: ['boards', activeProjectId],
    queryFn: () => getBoards(activeProjectId!),
    enabled: !!activeProjectId,
  });

  return (
    <div className="flex h-[calc(100vh-5rem)] -mx-4 -my-5 flex-col bg-base-200 sm:-mx-8 sm:-my-7">
      {/* Top Navigation Bar */}
      <div className="relative z-50 flex flex-wrap items-center justify-between gap-4 border-b border-base-content/5 bg-base-100 px-5 py-2 shrink-0">
        {/* Left side: Project selector + Board tabs */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <GlobalProjectSelector />

          {/* Board tabs */}
          {activeProjectId && boards && boards.length > 0 && (
            <div className="flex items-center gap-4 overflow-x-auto px-1 custom-scrollbar self-stretch h-8">
              <div className="h-4 w-px bg-base-content/10 shrink-0" />
              {boards.map((board, idx) => {
                const pastelFallback = ['#b39ddb', '#81d4fa', '#80cbc4', '#a5d6a7', '#ffcc80', '#f48fb1'][idx % 6];
                const isActive = activeBoardId === board.id.toString();
                return (
                  <button
                    key={board.id}
                    onClick={() => {
                      setActiveBoard(board.id.toString());
                      setViewMode('kanban');
                    }}
                    className={`flex items-center gap-1.5 py-1 text-xs font-semibold transition-all shrink-0 hover:text-base-content relative h-full ${
                      isActive
                        ? 'text-base-content font-bold'
                        : 'text-base-content/40'
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: board.background_color || pastelFallback }}
                    />
                    <span>{board.title}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side: View mode toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {activeBoardId && (
            <div className="flex items-center rounded-xl bg-base-200 p-0.5">
              {(['kanban', 'attendance'] as const).map((mode) => {
                const isActive = viewMode === mode;
                const labels: Record<string, string> = {
                  kanban: 'Board',
                  attendance: 'Attendance',
                };
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-all shrink-0 ${
                      isActive
                        ? 'bg-base-100 text-primary shadow-xs'
                        : 'text-base-content/40 hover:text-base-content'
                    }`}
                  >
                    <span>{labels[mode]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 overflow-hidden bg-base-200 transition-colors duration-300">
        {!activeBoardId ? (
          <WorkspaceView />
        ) : viewMode === 'kanban' ? (
          <KanbanBoard />
        ) : (
          <div className="h-full overflow-hidden bg-base-100">
            <AttendancePage />
          </div>
        )}
      </div>
    </div>
  );
};
