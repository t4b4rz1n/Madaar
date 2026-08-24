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
    return <div className="madaar-surface rounded-2xl border border-dashed border-base-content/15 bg-base-100 p-8 text-center text-sm text-base-content/50">Please select an organization to view team timesheet.</div>;
  }

  return (
    <div className="madaar-surface overflow-hidden rounded-[26px] border border-base-content/10 bg-base-100 shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-base-content/10 p-5 md:flex-row md:items-center sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-info/10 text-info"><People size={20} /></div>
          <div><h2 className="text-base font-semibold text-base-content">Team weekly timesheet</h2><p className="mt-1 text-xs text-base-content/45">Compare logged hours across the week.</p></div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-base-content/10 bg-base-200/70 p-1">
          <button type="button" onClick={prevWeek} className="grid size-8 place-items-center rounded-lg text-base-content/45 transition-colors hover:bg-base-100 hover:text-base-content">
            <ArrowLeft2 size={18} />
          </button>
          <span className="min-w-[140px] text-center text-xs font-bold text-base-content/60">
            {format(currentWeek, 'MMM dd')} - {format(addDays(currentWeek, 6), 'MMM dd, yyyy')}
          </span>
          <button type="button" onClick={nextWeek} className="grid size-8 place-items-center rounded-lg text-base-content/45 transition-colors hover:bg-base-100 hover:text-base-content">
            <ArrowRight2 size={18} />
          </button>
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        {isLoading ? (
          <div className="p-5 animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-base-200/70" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center text-base-content/40">
            <People size={40} className="mx-auto mb-3 text-base-content/20" />
            <p>No team logs found for this week.</p>
          </div>
        ) : (
          <table className="min-w-[800px] w-full text-left text-sm text-base-content/70">
            <thead className="border-b border-base-content/10 bg-base-200 text-xs uppercase text-base-content/50">
              <tr>
                <th className="sticky left-0 z-10 bg-base-200 px-6 py-4 font-semibold">Team member</th>
                <th className="px-6 py-4 text-center font-bold text-success">Total</th>
                {weekDates.map((date, i) => (
                  <th key={i} className="px-4 py-4 font-semibold text-center">
                    <div className="text-base-content/40">{format(date, 'EEE')}</div>
                    <div className="mt-1 text-base-content/80">{format(date, 'dd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-content/10">
              {users.map((user, i) => (
              <tr key={i} className="transition-colors hover:bg-base-200/60">
                  <td className="sticky left-0 z-10 bg-base-100 px-6 py-4 font-medium text-base-content/90">
                    <div className="flex items-center gap-3">
                      <div className="grid size-8 place-items-center rounded-full bg-info/10 text-xs font-bold uppercase text-info">
                        {user.name[0]}
                      </div>
                      {user.name}
                    </div>
                  </td>
                  <td className="bg-base-200/30 px-6 py-4 text-center font-mono font-bold text-success">
                    {formatDuration(user.total)}
                  </td>
                  {weekDates.map((date, i) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const seconds = user.days[dateStr] || 0;
                    return (
                      <td key={i} className="px-4 py-4 text-center font-mono">
                        {seconds > 0 ? (
                          <span className="text-base-content/80">{formatDuration(seconds)}</span>
                        ) : (
                          <span className="text-base-content/20">-</span>
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
