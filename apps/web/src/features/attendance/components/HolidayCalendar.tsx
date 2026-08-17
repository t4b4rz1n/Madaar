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
    <div className="madaar-surface overflow-hidden rounded-[26px] border border-base-content/10 bg-base-100 shadow-sm">
      <div className="flex items-center gap-3 border-b border-base-content/10 p-5 sm:p-6">
        <div className="grid size-10 place-items-center rounded-xl bg-warning/10 text-warning"><CalendarTick size={20} /></div>
        <div><h2 className="text-base font-semibold text-base-content">Holiday calendar</h2><p className="mt-1 text-xs text-base-content/45">Company and official holidays in {year}.</p></div>
      </div>

      <div className="p-5 sm:p-6">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-base-200/70" />)}
          </div>
        ) : holidays.length === 0 ? (
          <div className="py-10 text-center text-base-content/40">
            <CalendarTick size={40} className="mx-auto mb-3 text-base-content/20" />
            <p>No holidays found for this year.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {holidays.map(holiday => (
              <div key={holiday.id} className="flex items-center gap-4 rounded-2xl border border-base-content/10 bg-base-200/45 p-4 transition-colors hover:border-warning/30 hover:bg-base-200/75">
                <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-warning/10 text-warning">
                  <span className="text-xs font-semibold uppercase">{format(new Date(holiday.date), 'MMM')}</span>
                  <span className="text-xl font-bold leading-none">{format(new Date(holiday.date), 'dd')}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-base-content">{holiday.name}</h3>
                  <p className="line-clamp-1 text-sm text-base-content/50">{holiday.description || (holiday.is_official ? 'Official holiday' : 'Company holiday')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
