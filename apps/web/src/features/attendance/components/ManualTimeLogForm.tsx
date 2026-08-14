import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createManualLog } from '../api/attendanceApi';
import { Timer1, AddSquare } from 'iconsax-reactjs';
import { toast } from 'sonner';

export const ManualTimeLogForm: React.FC<{ taskId?: number; onSuccess?: () => void }> = ({ taskId, onSuccess }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    task: taskId || '',
    hours: '',
    minutes: '',
    description: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => createManualLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myWeeklyTimesheet'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Time logged successfully');
      setFormData({ task: taskId || '', hours: '', minutes: '', description: '' });
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to log time');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.task || (!formData.hours && !formData.minutes)) {
      toast.error('Please enter the time duration');
      return;
    }
    
    const h = Number(formData.hours) || 0;
    const m = Number(formData.minutes) || 0;
    if (h === 0 && m === 0) {
      toast.error('Time duration must be greater than 0');
      return;
    }

    const totalMs = (h * 3600000) + (m * 60000);
    const end = new Date();
    const start = new Date(end.getTime() - totalMs);

    mutation.mutate({
      task: Number(formData.task),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      description: formData.description,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#1C253B] p-5 rounded-xl border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <AddSquare size={20} className="text-emerald-400" />
        <h3 className="text-white font-semibold">Log Time Manually</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {!taskId && (
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs text-white/50 mb-1">Task ID</label>
            <input
              type="number"
              value={formData.task}
              onChange={(e) => setFormData({ ...formData, task: e.target.value })}
              className="w-full bg-[#171F32] border border-white/10 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500"
              placeholder="e.g. 12"
              required
            />
          </div>
        )}
        
        <div>
          <label className="block text-xs text-white/50 mb-1">Hours</label>
          <input
            type="number"
            min="0"
            value={formData.hours}
            onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
            className="w-full bg-[#171F32] border border-white/10 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500"
            placeholder="e.g. 2"
          />
        </div>
        
        <div>
          <label className="block text-xs text-white/50 mb-1">Minutes</label>
          <input
            type="number"
            min="0"
            max="59"
            value={formData.minutes}
            onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
            className="w-full bg-[#171F32] border border-white/10 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500"
            placeholder="e.g. 30"
          />
        </div>
        
        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs text-white/50 mb-1">Description (Optional)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-[#171F32] border border-white/10 rounded-lg p-2.5 text-white text-sm outline-none focus:border-blue-500 resize-none h-20"
            placeholder="What did you work on?"
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
        >
          {mutation.isPending ? 'Saving...' : 'Save Log'}
        </button>
      </div>
    </form>
  );
};
