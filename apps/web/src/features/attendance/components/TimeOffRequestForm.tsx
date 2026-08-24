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
    <form onSubmit={handleSubmit} className="madaar-surface overflow-hidden rounded-[26px] border border-base-content/10 bg-base-100 shadow-sm">
      <div className="flex items-center gap-3 border-b border-base-content/10 p-5 sm:p-6">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Calendar size={20} /></div>
        <div><h2 className="text-base font-semibold text-base-content">Request time off</h2><p className="mt-1 text-xs text-base-content/45">Plan leave and keep your team informed.</p></div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 sm:p-6">
        <div className="col-span-1 md:col-span-2">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-base-content/45">Leave type</label>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'vacation', label: 'Vacation' },
              { id: 'sick', label: 'Sick Leave' },
              { id: 'hourly', label: 'Hourly Leave' },
              { id: 'overtime', label: 'Overtime' },
            ].map(type => (
              <label key={type.id} className={`min-w-[120px] flex-1 cursor-pointer rounded-xl border p-3 transition-all ${formData.request_type === type.id ? 'border-primary/35 bg-primary/10 text-primary' : 'border-base-content/10 bg-base-200/60 text-base-content/60 hover:bg-base-200'}`}>
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
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-base-content/45">Start date &amp; time</label>
          <input
            type="datetime-local"
            value={formData.start_datetime}
            onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
            className="h-11 w-full rounded-xl border border-base-content/10 bg-base-200/60 px-3 text-sm text-base-content outline-none transition-colors focus:border-primary/40"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-base-content/45">End date &amp; time</label>
          <input
            type="datetime-local"
            value={formData.end_datetime}
            onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
            className="h-11 w-full rounded-xl border border-base-content/10 bg-base-200/60 px-3 text-sm text-base-content outline-none transition-colors focus:border-primary/40"
            required
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-base-content/45">Reason / note</label>
          <div className="relative">
            <Note size={17} className="absolute left-3 top-3 text-base-content/35" />
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="min-h-24 w-full resize-none rounded-xl border border-base-content/10 bg-base-200/60 p-3 pl-10 text-sm text-base-content outline-none transition-colors focus:border-primary/40"
              placeholder="Provide a reason for your request..."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-base-content/10 p-5 sm:p-6">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="motion-interactive rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-content shadow-lg shadow-primary/15 hover:bg-primary/90 disabled:opacity-50"
        >
          {mutation.isPending ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
};
