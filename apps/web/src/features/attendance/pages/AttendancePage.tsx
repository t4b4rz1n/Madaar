import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, DocumentText, People, Timer1 } from 'iconsax-reactjs';
import { getOrganizations } from '../api/attendanceApi';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { useAuthStore } from '../../auth/store/authStore';
import { CheckInOut } from '../components/CheckInOut';
import { LiveTimer } from '../components/LiveTimer';
import { TimesheetTable } from '../components/TimesheetTable';
import { ManualTimeLogForm } from '../components/ManualTimeLogForm';
import { TimeOffRequestForm } from '../components/TimeOffRequestForm';
import { TimeOffRequestList } from '../components/TimeOffRequestList';
import { HolidayCalendar } from '../components/HolidayCalendar';
import { TeamTimesheetView } from '../components/TeamTimesheetView';
import { getTasks } from '../../tasks/api/tasksApi';
import { useTaskStore } from '../../tasks/store/useTaskStore';
import type { Task } from '../../tasks/types';

type AttendanceTab = 'overview' | 'timesheet' | 'timeoff' | 'team';

const tabs: { id: AttendanceTab; label: string; helper: string; icon: typeof Timer1 }[] = [
  { id: 'overview', label: 'Overview', helper: 'Track today', icon: Timer1 },
  { id: 'timesheet', label: 'My timesheet', helper: 'Review logged time', icon: Clock },
  { id: 'timeoff', label: 'Time off', helper: 'Requests & holidays', icon: DocumentText },
  { id: 'team', label: 'Team timesheet', helper: 'See team workload', icon: People },
];

export const AttendancePage: React.FC = () => {
  const { user } = useAuthStore();
  const { activeOrganizationId, setActiveOrganization } = useAttendanceStore();
  const { activeProjectId, activeBoardId } = useTaskStore();
  const [activeTab, setActiveTab] = useState<AttendanceTab>('overview');

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['attendanceTasks', activeProjectId, activeBoardId],
    queryFn: () => getTasks(activeProjectId!, activeBoardId!, 100),
    enabled: Boolean(activeProjectId && activeBoardId),
  });

  useEffect(() => {
    if (organizations.length > 0) {
      const isValid = organizations.some(org => org.id === activeOrganizationId);
      if (!activeOrganizationId || !isValid) {
        setActiveOrganization(organizations[0].id);
      }
    }
  }, [organizations, activeOrganizationId, setActiveOrganization]);

  const isManager = user?.is_staff || false;
  const visibleTabs = tabs.filter((tab) => tab.id !== 'team' || isManager);
  const activeTabMeta = visibleTabs.find((tab) => tab.id === activeTab) || visibleTabs[0];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-base-200 text-base-content custom-scrollbar">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="mb-6 flex flex-col gap-5 border-b border-base-content/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary"><Timer1 size={15} /> Work hours</div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-base-content sm:text-4xl">Time &amp; Attendance</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/55">Start your work timer, keep attendance accurate, and review every hour in one calm workspace.</p>
          </div>
          <div className="flex items-center gap-3">
            {organizations.length > 1 ? <label className="flex items-center gap-3"><span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Organization</span><select value={activeOrganizationId || ''} onChange={(event) => setActiveOrganization(event.target.value)} className="h-10 min-w-40 rounded-xl border border-base-content/10 bg-base-100 px-3 text-sm font-semibold text-base-content outline-none focus:border-primary/40"><option value="" disabled>Select organization</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label> : <span className="rounded-xl border border-base-content/10 bg-base-100 px-3 py-2 text-xs font-semibold text-base-content/55">{organizations[0]?.name || 'Your organization'}</span>}
          </div>
        </header>

        <nav role="tablist" aria-label="Time and attendance sections" className="mb-6 overflow-x-auto rounded-2xl border border-base-content/10 bg-base-100 p-1.5 shadow-sm custom-scrollbar">
          <div className="flex min-w-max gap-1">
            {visibleTabs.map(({ id, label, helper, icon: Icon }) => {
              const isActive = activeTab === id;
              return <button key={id} id={`attendance-tab-${id}`} type="button" role="tab" aria-selected={isActive} aria-controls={`attendance-panel-${id}`} onClick={() => setActiveTab(id)} className={`motion-interactive flex min-w-[9.5rem] items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors sm:min-w-[12rem] ${isActive ? 'bg-base-content text-base-100 shadow-sm' : 'text-base-content/50 hover:bg-base-200 hover:text-base-content'}`}><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${isActive ? 'bg-base-100/15 text-base-100' : 'bg-base-200 text-base-content/45'}`}><Icon size={16} /></span><span><span className="block text-xs font-bold">{label}</span><span className={`mt-0.5 block text-[10px] font-medium ${isActive ? 'text-base-100/65' : 'text-base-content/35'}`}>{helper}</span></span></button>;
            })}
          </div>
        </nav>

        <div id={`attendance-panel-${activeTab}`} role="tabpanel" aria-labelledby={`attendance-tab-${activeTab}`} className="min-h-0">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{activeTabMeta.label}</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-base-content">{activeTabMeta.helper}</h2></div><span className="hidden text-xs font-medium text-base-content/35 sm:block">All times are shown in your local timezone</span></div>

          {activeTab === 'overview' && <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]"><LiveTimer tasks={tasks} /><CheckInOut /></div><div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]"><TimesheetTable /><ManualTimeLogForm tasks={tasks} /></div></div>}

          {activeTab === 'timesheet' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.8fr)]"><TimesheetTable /><ManualTimeLogForm tasks={tasks} /></div>}

          {activeTab === 'timeoff' && <div className="grid gap-5 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.6fr)]"><div className="space-y-5"><TimeOffRequestForm /><HolidayCalendar /></div><TimeOffRequestList isManager={isManager} /></div>}

          {activeTab === 'team' && <TeamTimesheetView />}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
