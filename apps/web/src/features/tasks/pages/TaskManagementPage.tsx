import React, { lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GlobalProjectSelector } from '../components/GlobalProjectSelector';
import { WorkspaceView } from '../components/WorkspaceView';
import { KanbanBoard } from '../components/KanbanBoard';
import { DependencyGraph } from '../components/DependencyGraph';
import { useTaskStore } from '../store/useTaskStore';
import { getBoards } from '../api/tasksApi';
import { Calendar1, Kanban, Graph } from 'iconsax-reactjs';

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
      <div className="relative z-50 flex flex-wrap items-center justify-between gap-3 border-b border-base-content/10 bg-base-100/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        {/* Left side: Project selector + Board tabs */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-base-content/40 lg:flex"><Kanban size={15} className="text-primary" /> Workspace</div>
          <div className="h-5 w-px bg-base-content/10" />
          <GlobalProjectSelector />

          {/* Board tabs */}
          {activeProjectId && boards && boards.length > 0 && (
            <div className="ml-1 flex min-w-0 max-w-[48vw] items-center gap-1 overflow-x-auto rounded-xl bg-base-200/70 p-1">
              {boards.map(board => (
                <button
                  key={board.id}
                  onClick={() => {
                    setActiveBoard(board.id.toString());
                    setViewMode('kanban');
                  }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
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
        <div className="flex items-center gap-2">
          {activeBoardId && (
            <div className="flex max-w-[calc(100vw-2rem)] overflow-x-auto rounded-xl bg-base-200 p-1 custom-scrollbar">
              <button
                type="button"
                aria-pressed={viewMode === 'kanban'}
                onClick={() => setViewMode('kanban')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-base-100 text-primary shadow-sm'
                    : 'text-base-content/50 hover:text-base-content'
                }`}
                >
                  <Kanban size={13} />
                  Kanban
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'graph'}
                onClick={() => setViewMode('graph')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  viewMode === 'graph'
                    ? 'bg-base-100 text-primary shadow-sm'
                    : 'text-base-content/50 hover:text-base-content'
                }`}
                >
                  <Graph size={13} />
                  Graph
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'attendance'}
                onClick={() => setViewMode('attendance')}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  viewMode === 'attendance'
                    ? 'bg-base-100 text-primary shadow-sm'
                    : 'text-base-content/50 hover:text-base-content'
                }`}
                >
                  <Calendar1 size={13} />
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

    </div>
  );
};
