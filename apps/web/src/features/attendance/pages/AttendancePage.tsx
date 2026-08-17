import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

export const AttendancePage: React.FC = () => {
  const { user } = useAuthStore();
  const { activeOrganizationId, setActiveOrganization } = useAttendanceStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'timesheet' | 'timeoff' | 'team'>('overview');

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
  });

  useEffect(() => {
    if (!activeOrganizationId && organizations.length > 0) {
      setActiveOrganization(organizations[0].id);
    }
  }, [organizations, activeOrganizationId, setActiveOrganization]);

  const isManager = user?.is_staff || false; // Ideally check org role

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-base-200 p-5 text-base-content custom-scrollbar md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-base-content">Time & Attendance</h1>
          <p className="text-sm text-base-content/50">Manage your working hours, timesheets, and time off requests.</p>
        </div>
        
        {organizations.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Organization</span>
            <select 
              value={activeOrganizationId || ''} 
              onChange={(e) => setActiveOrganization(e.target.value)}
              className="rounded-xl border border-base-content/10 bg-base-100 px-4 py-2 text-sm text-base-content/90 outline-none focus:border-primary"
            >
              {organizations.map((org: any) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-8 flex overflow-x-auto border-b border-base-content/10 custom-scrollbar">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`relative px-6 py-3 text-sm font-medium transition-all ${activeTab === 'overview' ? 'text-primary' : 'text-base-content/50 hover:text-base-content/80'}`}
        >
          Overview
          {activeTab === 'overview' && <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab('timesheet')}
          className={`relative px-6 py-3 text-sm font-medium transition-all ${activeTab === 'timesheet' ? 'text-primary' : 'text-base-content/50 hover:text-base-content/80'}`}
        >
          My Timesheet
          {activeTab === 'timesheet' && <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-primary" />}
        </button>
        <button 
          onClick={() => setActiveTab('timeoff')}
          className={`relative px-6 py-3 text-sm font-medium transition-all ${activeTab === 'timeoff' ? 'text-secondary' : 'text-base-content/50 hover:text-base-content/80'}`}
        >
          Time Off & Holidays
          {activeTab === 'timeoff' && <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-secondary" />}
        </button>
        {/* Keeping team tab open for demo, should be controlled by org role */}
        <button 
          onClick={() => setActiveTab('team')}
          className={`relative px-6 py-3 text-sm font-medium transition-all ${activeTab === 'team' ? 'text-success' : 'text-base-content/50 hover:text-base-content/80'}`}
        >
          Team Timesheet
          {activeTab === 'team' && <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-success" />}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-5xl">
            <CheckInOut />
            <LiveTimer />
          </div>
        )}
        
        {activeTab === 'timesheet' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl">
            <div className="col-span-1 lg:col-span-2">
              <TimesheetTable />
            </div>
            <div className="col-span-1">
              <ManualTimeLogForm />
            </div>
          </div>
        )}

        {activeTab === 'timeoff' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl">
            <div className="col-span-1 space-y-6">
              <TimeOffRequestForm />
              <HolidayCalendar />
            </div>
            <div className="col-span-1 xl:col-span-2">
              <TimeOffRequestList isManager={isManager} />
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="max-w-7xl">
            <TeamTimesheetView />
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
