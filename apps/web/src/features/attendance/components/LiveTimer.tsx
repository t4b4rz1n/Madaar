import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActiveTimer, stopTimer, cancelTimer } from '../api/attendanceApi';
import { Stop, Trash, Timer1, TaskSquare } from 'iconsax-reactjs';
import { toast } from 'sonner';

export const LiveTimer: React.FC = () => {
  const queryClient = useQueryClient();
  const [elapsed, setElapsed] = useState(0);

  const { data: activeTimer } = useQuery({
    queryKey: ['activeTimer'],
    queryFn: getActiveTimer,
    refetchInterval: 10000, // Refetch every 10s to stay in sync
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      const startTime = new Date(activeTimer.start_time).getTime();
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const stopMutation = useMutation({
    mutationFn: () => stopTimer(activeTimer!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTimer'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Timer stopped successfully');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelTimer(activeTimer!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeTimer'] });
      toast.success('Timer cancelled');
    }
  });

  if (!activeTimer) {
    return (
      <div className="bg-[#171F32] border border-[#2D364D] rounded-xl p-5 flex items-center gap-4 shadow-sm text-white/50">
        <Timer1 size={24} />
        <span className="text-sm font-medium">No active timer running. Drag a task to "Doing" or start one manually.</span>
      </div>
    );
  }

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-r from-blue-900/40 to-[#171F32] border border-blue-500/30 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between shadow-lg shadow-blue-900/10 relative overflow-hidden">
      
      {/* Pulse effect background */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />

      <div className="flex items-center gap-4 z-10 w-full md:w-auto mb-4 md:mb-0">
        <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
          <Timer1 size={24} className="text-blue-400" variant="Bold" />
        </div>
        <div className="flex flex-col flex-1 text-left">
          <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">Active Timer</span>
          <div className="flex items-center gap-2">
            <TaskSquare size={14} className="text-white/60" />
            <h3 className="text-white font-medium text-sm truncate max-w-[200px]">
              Task #{activeTimer.task}
            </h3>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 z-10 w-full md:w-auto justify-between md:justify-end">
        <div className="text-3xl font-bold font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
          {formatTime(elapsed)}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all shadow-md shadow-rose-500/20"
          >
            <Stop size={18} variant="Bold" />
            Stop
          </button>
          
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors border border-white/10"
            title="Cancel timer without saving"
          >
            <Trash size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
