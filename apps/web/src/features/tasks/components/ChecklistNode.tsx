import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

export const ChecklistNode = ({ data }: NodeProps) => {
  const title = data.title as string;
  const isCompleted = data.isCompleted as boolean;

  return (
    <div className={`relative flex items-center p-3 w-48 rounded-lg shadow-sm border backdrop-blur-sm transition-all hover:scale-105 ${
      isCompleted 
        ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 opacity-70' 
        : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
    }`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-400 border-none" />
      
      <div className={`flex-shrink-0 w-4 h-4 rounded-sm border mr-3 flex items-center justify-center ${
        isCompleted 
          ? 'bg-emerald-500 border-emerald-500 text-white' 
          : 'bg-transparent border-slate-300 dark:border-slate-600'
      }`}>
        {isCompleted && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      
      <span className={`text-xs font-medium line-clamp-2 ${isCompleted ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-slate-700 dark:text-slate-300'}`} dir="auto">
        {title as string}
      </span>
    </div>
  );
};
