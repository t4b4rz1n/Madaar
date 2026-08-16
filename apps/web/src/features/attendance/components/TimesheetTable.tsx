import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyWeeklyTimesheet } from '../api/attendanceApi';
import { format, subDays, addDays, startOfWeek } from 'date-fns';
import { Calendar, ArrowLeft2, ArrowRight2, Timer1 } from 'iconsax-reactjs';

export const TimesheetTable: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 6 })); // Week starts on Saturday for solar calendar contexts typically, but Date uses Sunday as 0. We'll stick to Date object.

  const { data: timesheet = [], isLoading } = useQuery({
    queryKey: ['myWeeklyTimesheet', format(currentWeek, 'yyyy-MM-dd')],
    queryFn: () => getMyWeeklyTimesheet(format(currentWeek, 'yyyy-MM-dd')),
  });

  const nextWeek = () => setCurrentWeek(addDays(currentWeek, 7));
  const prevWeek = () => setCurrentWeek(subDays(currentWeek, 7));

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const totalWeeklySeconds = timesheet.reduce((acc, curr) => acc + curr.total_seconds, 0);

  return (
    <div className="bg-[#171F32] border border-[#2D364D] rounded-xl overflow-hidden shadow-lg">
      <div className="p-5 border-b border-[#2D364D] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Weekly Timesheet</h2>
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

      <div className="p-5">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded-lg" />
            ))}
          </div>
        ) : timesheet.length === 0 ? (
          <div className="text-center py-10 text-white/40">
            <Timer1 size={48} className="mx-auto mb-3 opacity-20" />
            <p>No time logged this week.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {timesheet.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-[#1C253B] rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex flex-col items-center justify-center text-blue-400">
                    <span className="text-xs font-semibold uppercase">{format(new Date(entry.date), 'EEE')}</span>
                    <span className="text-lg font-bold leading-none">{format(new Date(entry.date), 'dd')}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{format(new Date(entry.date), 'MMMM d, yyyy')}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400 font-mono tracking-wider">
                    {formatDuration(entry.total_seconds)}
                  </p>
                  <p className="text-xs text-white/40 uppercase tracking-wide">Logged</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#1C253B] p-5 border-t border-[#2D364D] flex justify-between items-center">
        <span className="text-white/60 font-medium">Total Weekly Hours</span>
        <span className="text-xl font-bold text-white">{formatDuration(totalWeeklySeconds)}</span>
      </div>
    </div>
  );
};
