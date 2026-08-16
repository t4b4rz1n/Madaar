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
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar bg-[#0F172A] text-white p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Time & Attendance</h1>
          <p className="text-white/50 text-sm">Manage your working hours, timesheets, and time off requests.</p>
        </div>
        
        {organizations.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Organization</span>
            <select 
              value={activeOrganizationId || ''} 
              onChange={(e) => setActiveOrganization(e.target.value)}
              className="bg-[#171F32] border border-[#2D364D] rounded-lg px-4 py-2 text-sm text-white/90 outline-none focus:border-blue-500"
            >
              {organizations.map((org: any) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto custom-scrollbar border-b border-[#2D364D] mb-8">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${activeTab === 'overview' ? 'text-blue-400' : 'text-white/50 hover:text-white/80'}`}
        >
          Overview
          {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]" />}
        </button>
        <button 
          onClick={() => setActiveTab('timesheet')}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${activeTab === 'timesheet' ? 'text-blue-400' : 'text-white/50 hover:text-white/80'}`}
        >
          My Timesheet
          {activeTab === 'timesheet' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]" />}
        </button>
        <button 
          onClick={() => setActiveTab('timeoff')}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${activeTab === 'timeoff' ? 'text-purple-400' : 'text-white/50 hover:text-white/80'}`}
        >
          Time Off & Holidays
          {activeTab === 'timeoff' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-t-full shadow-[0_-2px_10px_rgba(168,85,247,0.5)]" />}
        </button>
        {/* Keeping team tab open for demo, should be controlled by org role */}
        <button 
          onClick={() => setActiveTab('team')}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${activeTab === 'team' ? 'text-emerald-400' : 'text-white/50 hover:text-white/80'}`}
        >
          Team Timesheet
          {activeTab === 'team' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full shadow-[0_-2px_10px_rgba(16,185,129,0.5)]" />}
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
