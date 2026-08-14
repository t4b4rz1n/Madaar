import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHolidays } from '../api/attendanceApi';
import { CalendarTick } from 'iconsax-reactjs';
import { format } from 'date-fns';

export const HolidayCalendar: React.FC<{ year?: number }> = ({ year = new Date().getFullYear() }) => {
  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => getHolidays({ year }),
  });

  return (
    <div className="bg-[#171F32] border border-[#2D364D] rounded-xl overflow-hidden shadow-lg">
      <div className="p-5 border-b border-[#2D364D] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarTick size={24} className="text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Holiday Calendar ({year})</h2>
        </div>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-lg" />)}
          </div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-10 text-white/40">
            <CalendarTick size={48} className="mx-auto mb-3 opacity-20" />
            <p>No holidays found for this year.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {holidays.map(holiday => (
              <div key={holiday.id} className="bg-[#1C253B] border border-white/5 rounded-lg p-4 flex items-center gap-4 hover:border-amber-500/30 transition-colors">
                <div className="w-14 h-14 rounded-lg bg-amber-500/10 flex flex-col items-center justify-center text-amber-400 shrink-0">
                  <span className="text-xs font-semibold uppercase">{format(new Date(holiday.date), 'MMM')}</span>
                  <span className="text-xl font-bold leading-none">{format(new Date(holiday.date), 'dd')}</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">{holiday.name}</h3>
                  <p className="text-sm text-white/50 line-clamp-1">{holiday.description || (holiday.is_official ? 'Official Holiday' : 'Company Holiday')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
