import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkIn, checkOut, getTodayAttendance } from '../api/attendanceApi';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { format } from 'date-fns';
import { Login, Logout, Timer1 } from 'iconsax-reactjs';
import { toast } from 'sonner';

export const CheckInOut: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAttendanceStore();

  const { data: todayAttendance, isLoading } = useQuery({
    queryKey: ['todayAttendance'],
    queryFn: getTodayAttendance,
  });

  const checkInMutation = useMutation({
    mutationFn: (orgId: string) => checkIn(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
      toast.success('Checked in successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to check in');
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: () => checkOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
      queryClient.invalidateQueries({ queryKey: ['activeTimer'] });
      toast.success('Checked out successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to check out');
    }
  });

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-[#171F32] rounded-xl" />;
  }

  const isCheckedIn = !!todayAttendance?.check_in;
  const isCheckedOut = !!todayAttendance?.check_out;

  const handleCheckIn = () => {
    if (!activeOrganizationId) {
      toast.error('Please select an organization first.');
      return;
    }
    checkInMutation.mutate(activeOrganizationId);
  };

  return (
    <div className="bg-[#171F32] border border-[#2D364D] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between shadow-lg">
      <div className="flex items-center gap-4 mb-4 md:mb-0">
        <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Timer1 size={28} className="text-blue-400" />
        </div>
        <div>
          <h2 className="text-white text-lg font-semibold">Today's Attendance</h2>
          <p className="text-white/60 text-sm">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-white/50 text-xs mb-1 uppercase font-semibold">Check In</p>
          <p className="text-white font-medium text-lg">
            {todayAttendance?.check_in ? format(new Date(todayAttendance.check_in), 'HH:mm') : '--:--'}
          </p>
        </div>
        
        <div className="h-10 w-px bg-white/10" />

        <div className="text-center">
          <p className="text-white/50 text-xs mb-1 uppercase font-semibold">Check Out</p>
          <p className="text-white font-medium text-lg">
            {todayAttendance?.check_out ? format(new Date(todayAttendance.check_out), 'HH:mm') : '--:--'}
          </p>
        </div>

        <div className="ml-4 flex gap-3">
          {!isCheckedIn ? (
            <button
              onClick={handleCheckIn}
              disabled={checkInMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95"
            >
              <Login size={20} />
              Check In
            </button>
          ) : !isCheckedOut ? (
            <button
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95"
            >
              <Logout size={20} />
              Check Out
            </button>
          ) : (
            <div className="px-5 py-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg font-medium border border-emerald-500/20">
              Work Completed
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
