import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStandups } from '../../tasks/api/tasksApi';
import type { AsyncStandup } from '../../tasks/types';
import { NoteText, Calendar } from 'iconsax-reactjs';

export const StandupsList = () => {
  const { data: standups, isLoading, error } = useQuery<AsyncStandup[]>({
    queryKey: ['standups'],
    queryFn: () => getStandups(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading loading-spinner loading-md text-primary"></span>
      </div>
    );
  }

  if (error) {
    return null; // Or return an error state if we want to show it
  }

  if (!standups || standups.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 bg-base-200/30 border border-base-content/10 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-xl text-primary">
          <NoteText variant="Bulk" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-base-content">Daily Standups</h2>
          <p className="text-sm text-base-content/60">View recent team standup reports</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-base-content/5">
        <table className="table w-full bg-base-100/50">
          <thead>
            <tr className="bg-base-200/50 text-base-content/70 border-b border-base-content/5">
              <th className="font-semibold px-4 py-3">Member</th>
              <th className="font-semibold px-4 py-3">Date</th>
              <th className="font-semibold px-4 py-3">Yesterday</th>
              <th className="font-semibold px-4 py-3">Today</th>
              <th className="font-semibold px-4 py-3">Blockers</th>
            </tr>
          </thead>
          <tbody>
            {standups.map((standup) => (
              <tr key={standup.id} className="border-b border-base-content/5 hover:bg-base-200/30 transition-colors">
                <td className="px-4 py-4 align-top whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className="bg-primary/20 text-primary rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs">
                        {standup.user_detail?.first_name?.[0]?.toUpperCase() || standup.user_detail?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-base-content">
                        {standup.user_detail?.first_name && standup.user_detail?.last_name
                          ? `${standup.user_detail.first_name} ${standup.user_detail.last_name}`
                          : standup.user_detail?.username || `User ${standup.user}`}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-xs text-base-content/70">
                    <Calendar size={14} />
                    {new Date(standup.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-4 align-top max-w-[200px]">
                  <p className="text-sm text-base-content/80 whitespace-pre-wrap break-words">{standup.yesterday_work}</p>
                </td>
                <td className="px-4 py-4 align-top max-w-[200px]">
                  <p className="text-sm text-base-content/80 whitespace-pre-wrap break-words">{standup.today_work}</p>
                </td>
                <td className="px-4 py-4 align-top max-w-[200px]">
                  {standup.blockers ? (
                    <p className="text-sm text-warning whitespace-pre-wrap break-words">{standup.blockers}</p>
                  ) : (
                    <span className="text-sm text-base-content/30 italic">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
