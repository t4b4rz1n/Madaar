import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { Task } from '../types';

export const CustomTaskNode = ({ data }: NodeProps) => {
  const task = data.task as Task;
  const isBlocked = task.is_blocked;

  const priorityColors = {
    low: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    critical: 'text-red-500 bg-red-500/10 border-red-500/20',
  };

  const priorityIcons = {
    low: '🔽',
    medium: '▶️',
    high: '🔼',
    critical: '🔥',
  };

  return (
    <div className={`relative flex flex-col p-4 w-64 rounded-xl shadow-lg border backdrop-blur-md transition-all hover:scale-105 ${
      isBlocked 
        ? 'bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-900' 
        : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'
    }`}>
      {/* Target handle (top) */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-500 border-2 border-white dark:border-slate-800" />
      
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{task.key}</span>
        <div className="flex items-center gap-1">
          {isBlocked && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
              Blocked
            </span>
          )}
          <span title={task.priority} className={`flex items-center justify-center w-6 h-6 rounded-md text-xs border ${priorityColors[task.priority]}`}>
            {priorityIcons[task.priority]}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 mb-3" dir="auto">
        {task.title}
      </h3>

      <div className="flex justify-between items-center mt-auto">
        <div className="flex -space-x-2">
          {task.assignee_detail ? (
            <img 
              src={task.assignee_detail.avatar_url || `https://ui-avatars.com/api/?name=${task.assignee_detail.username}&background=random`} 
              alt={task.assignee_detail.username}
              className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800"
              title={`Assignee: ${task.assignee_detail.first_name} ${task.assignee_detail.last_name}`}
            />
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-800" title="Unassigned">
              <span className="text-[10px] text-slate-400">?</span>
            </div>
          )}
        </div>
        
        {task.status_detail && (
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-[10px] font-medium rounded-full" dir="auto">
            {task.status_detail.name}
          </span>
        )}
      </div>

      {/* Source handle (bottom) */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500 border-2 border-white dark:border-slate-800" />
    </div>
  );
};
