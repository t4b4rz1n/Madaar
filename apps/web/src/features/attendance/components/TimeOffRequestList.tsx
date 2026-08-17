import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTimeOffRequests, approveTimeOffRequest, rejectTimeOffRequest, cancelTimeOffRequest } from '../api/attendanceApi';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { format } from 'date-fns';
import { TickCircle, CloseCircle, Trash, DocumentText } from 'iconsax-reactjs';
import { toast } from 'sonner';

export const TimeOffRequestList: React.FC<{ isManager?: boolean }> = ({ isManager = false }) => {
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAttendanceStore();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['timeOffRequests', activeOrganizationId],
    queryFn: () => getTimeOffRequests(activeOrganizationId ? { organization: activeOrganizationId } : {}),
    enabled: !!activeOrganizationId,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string | number) => approveTimeOffRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] });
      toast.success('Request approved');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string | number, note: string }) => rejectTimeOffRequest(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] });
      toast.success('Request rejected');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string | number) => cancelTimeOffRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] });
      toast.success('Request cancelled');
    }
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'approved': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'rejected': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
  };

  if (!activeOrganizationId) {
    return <div className="p-5 text-center text-base-content/50">Please select an organization to view requests.</div>;
  }

  return (
    <div className="madaar-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-base-content/10 p-5">
        <div className="flex items-center gap-3">
          <DocumentText size={24} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-base-content">Time Off Requests</h2>
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        {isLoading ? (
          <div className="p-5 animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-lg" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-10 text-white/40">
            <DocumentText size={48} className="mx-auto mb-3 opacity-20" />
            <p>No requests found.</p>
          </div>
        ) : (
          <table className="w-full text-start text-sm text-base-content/70">
            <thead className="border-b border-base-content/10 bg-base-200 text-xs uppercase text-base-content/50">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Duration</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-content/10">
              {requests.map(req => (
                <tr key={req.id} className="transition-colors hover:bg-base-200/60">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                        {req.user_detail?.first_name?.[0] || req.user_detail?.username?.[0] || 'U'}
                      </div>
                      <span className="font-medium text-base-content/90">{req.user_detail?.first_name || req.user_detail?.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize font-medium">{req.request_type}</td>
                  <td className="px-6 py-4">
                    <div className="text-base-content/90">{format(new Date(req.start_datetime), 'MMM dd, HH:mm')}</div>
                    <div className="text-xs text-base-content/40">to {format(new Date(req.end_datetime), 'MMM dd, HH:mm')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full border ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    {req.status === 'pending' && isManager && (
                      <>
                        <button onClick={() => approveMutation.mutate(req.id)} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Approve">
                          <TickCircle size={20} />
                        </button>
                        <button onClick={() => {
                          const note = prompt('Rejection reason (optional):');
                          if (note !== null) rejectMutation.mutate({ id: req.id, note });
                        }} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Reject">
                          <CloseCircle size={20} />
                        </button>
                      </>
                    )}
                    {req.status === 'pending' && !isManager && (
                      <button onClick={() => {
                        if (confirm('Cancel this request?')) cancelMutation.mutate(req.id);
                      }} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Cancel">
                        <Trash size={20} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
