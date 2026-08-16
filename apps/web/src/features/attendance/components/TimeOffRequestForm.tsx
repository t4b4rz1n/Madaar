import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTimeOffRequest } from '../api/attendanceApi';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { Calendar, Note, TagRight } from 'iconsax-reactjs';
import { toast } from 'sonner';

export const TimeOffRequestForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAttendanceStore();
  
  const [formData, setFormData] = useState({
    request_type: 'vacation',
    start_datetime: '',
    end_datetime: '',
    reason: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => createTimeOffRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] });
      toast.success('Time off request submitted');
      setFormData({ request_type: 'vacation', start_datetime: '', end_datetime: '', reason: '' });
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrganizationId) {
      toast.error('Please select an organization first.');
      return;
    }
    if (!formData.start_datetime || !formData.end_datetime) {
      toast.error('Please select start and end dates');
      return;
    }
    
    mutation.mutate({
      ...formData,
      organization: activeOrganizationId,
      start_datetime: new Date(formData.start_datetime).toISOString(),
      end_datetime: new Date(formData.end_datetime).toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#171F32] border border-[#2D364D] rounded-xl overflow-hidden shadow-lg">
      <div className="p-5 border-b border-[#2D364D] flex items-center gap-3">
        <Calendar size={24} className="text-purple-400" />
        <h2 className="text-lg font-semibold text-white">Request Time Off</h2>
      </div>
      
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide font-semibold">Leave Type</label>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'vacation', label: 'Vacation' },
              { id: 'sick', label: 'Sick Leave' },
              { id: 'hourly', label: 'Hourly Leave' },
              { id: 'overtime', label: 'Overtime' },
            ].map(type => (
              <label key={type.id} className={`flex-1 min-w-[120px] p-3 rounded-lg border cursor-pointer transition-all ${formData.request_type === type.id ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-[#1C253B] border-white/5 text-white/70 hover:bg-white/5'}`}>
                <input
                  type="radio"
                  name="request_type"
                  value={type.id}
                  checked={formData.request_type === type.id}
                  onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 font-medium">
                  <TagRight size={16} />
                  {type.label}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide font-semibold">Start Date & Time</label>
          <input
            type="datetime-local"
            value={formData.start_datetime}
            onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
            className="w-full bg-[#1C253B] border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-purple-500 transition-colors"
            required
          />
        </div>
        
        <div>
          <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide font-semibold">End Date & Time</label>
          <input
            type="datetime-local"
            value={formData.end_datetime}
            onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
            className="w-full bg-[#1C253B] border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-purple-500 transition-colors"
            required
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide font-semibold">Reason / Note</label>
          <div className="relative">
            <Note size={18} className="absolute top-3 left-3 text-white/40" />
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full bg-[#1C253B] border border-white/10 rounded-lg p-3 pl-10 text-white text-sm outline-none focus:border-purple-500 resize-none h-24 transition-colors"
              placeholder="Provide a reason for your request..."
            />
          </div>
        </div>
      </div>
      
      <div className="p-5 border-t border-[#2D364D] flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95"
        >
          {mutation.isPending ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
};
