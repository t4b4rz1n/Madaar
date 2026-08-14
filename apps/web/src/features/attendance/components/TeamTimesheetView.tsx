import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTeamTimesheet } from '../api/attendanceApi';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import { People, ArrowLeft2, ArrowRight2 } from 'iconsax-reactjs';

export const TeamTimesheetView: React.FC = () => {
  const { activeOrganizationId } = useAttendanceStore();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 6 }));
  
  const startDateStr = format(currentWeek, 'yyyy-MM-dd');
  const endDateStr = format(addDays(currentWeek, 6), 'yyyy-MM-dd');

  const { data: timesheet = [], isLoading } = useQuery({
    queryKey: ['teamTimesheet', activeOrganizationId, startDateStr, endDateStr],
    queryFn: () => getTeamTimesheet(activeOrganizationId!, startDateStr, endDateStr),
    enabled: !!activeOrganizationId,
  });

  const nextWeek = () => setCurrentWeek(addDays(currentWeek, 7));
  const prevWeek = () => setCurrentWeek(subDays(currentWeek, 7));

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Group by user
  const userMap = new Map<string, { total: number, days: Record<string, number> }>();
  
  timesheet.forEach(entry => {
    const username = entry.user__username || 'Unknown';
    if (!userMap.has(username)) {
      userMap.set(username, { total: 0, days: {} });
    }
    const user = userMap.get(username)!;
    user.total += entry.total_seconds;
    user.days[entry.date] = entry.total_seconds;
  });

  const users = Array.from(userMap.entries()).map(([name, data]) => ({ name, ...data }));
  
  // Generate week dates for headers
  const weekDates = [...Array(7)].map((_, i) => addDays(currentWeek, i));

  if (!activeOrganizationId) {
    return <div className="text-white/50 p-5 text-center">Please select an organization to view team timesheet.</div>;
  }

  return (
    <div className="bg-[#171F32] border border-[#2D364D] rounded-xl overflow-hidden shadow-lg">
      <div className="p-5 border-b border-[#2D364D] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <People size={24} className="text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Team Weekly Timesheet</h2>
        </div>
        
        <div className="flex items-center gap-4 bg-[#1C253B] rounded-lg p-1 border border-white/5">
          <button onClick={prevWeek} className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/70 hover:text-white">
            <ArrowLeft2 size={18} />
          </button>
          <span className="text-sm font-medium text-white/90 min-w-[140px] text-center">
            {format(currentWeek, 'MMM dd')} - {format(addDays(currentWeek, 6), 'MMM dd, yyyy')}
          </span>
          <button onClick={nextWeek} className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/70 hover:text-white">
            <ArrowRight2 size={18} />
          </button>
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        {isLoading ? (
          <div className="p-5 animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-lg" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-white/40">
            <People size={48} className="mx-auto mb-3 opacity-20" />
            <p>No team logs found for this week.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-white/70 min-w-[800px]">
            <thead className="bg-[#1C253B] text-xs uppercase text-white/50 border-b border-[#2D364D]">
              <tr>
                <th className="px-6 py-4 font-semibold sticky left-0 bg-[#1C253B] z-10">Team Member</th>
                <th className="px-6 py-4 font-bold text-emerald-400 text-center">Total</th>
                {weekDates.map((date, i) => (
                  <th key={i} className="px-4 py-4 font-semibold text-center">
                    <div className="text-white/40">{format(date, 'EEE')}</div>
                    <div className="text-white/80 mt-1">{format(date, 'dd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D364D]">
              {users.map((user, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 sticky left-0 bg-[#171F32] z-10 font-medium text-white/90">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                        {user.name[0]}
                      </div>
                      {user.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-emerald-400 text-center bg-white/[0.01]">
                    {formatDuration(user.total)}
                  </td>
                  {weekDates.map((date, i) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const seconds = user.days[dateStr] || 0;
                    return (
                      <td key={i} className="px-4 py-4 text-center font-mono">
                        {seconds > 0 ? (
                          <span className="text-white/80">{formatDuration(seconds)}</span>
                        ) : (
                          <span className="text-white/20">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
