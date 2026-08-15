import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getStandups } from '../api/tasksApi';
import { getOrganizations } from '../../attendance/api/attendanceApi';
import type { AsyncStandup } from '../types';
import { NoteText, Calendar, ArrowDown2, ArrowRight2 } from 'iconsax-reactjs';

// Helper to group standups by user
const groupStandupsByUser = (standups: AsyncStandup[]) => {
  const grouped = new Map<number, { user: any; standups: AsyncStandup[] }>();
  
  standups.forEach(standup => {
    if (!grouped.has(standup.user)) {
      grouped.set(standup.user, {
        user: standup.user_detail || { id: standup.user, username: `User ${standup.user}` },
        standups: []
      });
    }
    grouped.get(standup.user)!.standups.push(standup);
  });
  
  return Array.from(grouped.values());
};

const UserStandupsAccordion = ({ group }: { group: { user: any; standups: AsyncStandup[] } }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, standups } = group;

  return (
    <div className="mb-4 bg-base-200/50 border border-base-content/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-base-200 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="avatar placeholder">
            <div className="bg-primary/20 text-primary rounded-full w-10 h-10 flex items-center justify-center font-bold">
              {user.first_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
          <div className="text-left">
            <div className="font-bold text-base-content text-lg">
              {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
            </div>
            <div className="text-sm text-base-content/60">
              {standups.length} Standup{standups.length !== 1 ? 's' : ''} reported
            </div>
          </div>
        </div>
        <div className="text-base-content/50">
          {isOpen ? <ArrowDown2 size={24} /> : <ArrowRight2 size={24} />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-base-content/10"
          >
            <div className="p-4 flex flex-col gap-4">
              {standups.map(standup => (
                <div key={standup.id} className="bg-base-100 rounded-xl p-5 border border-base-content/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-primary">
                    <Calendar size={18} />
                    {new Date(standup.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-2">Yesterday</h4>
                      <p className="text-sm text-base-content leading-relaxed whitespace-pre-wrap">{standup.yesterday_work}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-2">Today</h4>
                      <p className="text-sm text-base-content leading-relaxed whitespace-pre-wrap">{standup.today_work}</p>
                    </div>
                  </div>
                  
                  {standup.blockers && (
                    <div className="mt-6 pt-4 border-t border-base-content/5">
                      <h4 className="text-xs font-bold text-warning uppercase tracking-wider mb-2">Blockers</h4>
                      <p className="text-sm text-warning/90 leading-relaxed whitespace-pre-wrap">{standup.blockers}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const StandupsPage = () => {
  const [selectedOrg, setSelectedOrg] = useState<string>('');

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
  });

  // Automatically select the first org if none selected
  React.useEffect(() => {
    if (orgs && orgs.length > 0 && !selectedOrg) {
      setSelectedOrg(orgs[0].id.toString());
    }
  }, [orgs, selectedOrg]);

  const { data: standups, isLoading: standupsLoading } = useQuery({
    queryKey: ['standups', selectedOrg],
    queryFn: () => getStandups(selectedOrg),
    enabled: !!selectedOrg,
  });

  const groupedStandups = useMemo(() => {
    return standups ? groupStandupsByUser(standups) : [];
  }, [standups]);

  if (orgsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <NoteText variant="Bulk" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-base-content">Daily Standups</h1>
            <p className="text-base-content/60 mt-1">Review your team's daily progress and blockers</p>
          </div>
        </div>

        {orgs && orgs.length > 0 && (
          <select
            className="select select-bordered w-full md:w-64 bg-base-200/50 rounded-xl font-medium focus:outline-none focus:border-primary/50"
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id.toString()}>
                {org.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {standupsLoading ? (
        <div className="flex justify-center items-center h-48">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : groupedStandups.length === 0 ? (
        <div className="bg-base-200/30 border border-base-content/10 rounded-2xl p-12 text-center">
          <NoteText size={48} className="mx-auto text-base-content/20 mb-4" />
          <h3 className="text-lg font-semibold text-base-content mb-2">No Standups Found</h3>
          <p className="text-base-content/60">There are no standup reports for the selected organization.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {groupedStandups.map((group) => (
            <UserStandupsAccordion key={group.user.id} group={group} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default StandupsPage;
