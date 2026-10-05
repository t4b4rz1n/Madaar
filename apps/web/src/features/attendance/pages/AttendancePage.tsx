import { t as translate, useTranslation } from "../../../i18n/locale";
import { useSearchParams } from "react-router-dom";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, DocumentText, People, Timer1 } from 'iconsax-reactjs';
import { getOrganizations } from '../api/attendanceApi';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { CheckInOut } from '../components/CheckInOut';
import { LiveTimer } from '../components/LiveTimer';
import { TimesheetTable } from '../components/TimesheetTable';
import { ManualTimeLogForm } from '../components/ManualTimeLogForm';
import { TimeOffRequestForm } from '../components/TimeOffRequestForm';
import { TimeOffRequestList } from '../components/TimeOffRequestList';
import { HolidayCalendar } from '../components/HolidayCalendar';
import { TeamTimesheetView } from '../components/TeamTimesheetView';
import { getTasks, getBoards } from '../../tasks/api/tasksApi';
import { getProjects } from '../../projects/api/projectsApi';
import { useTaskStore } from '../../tasks/store/useTaskStore';
import type { Task } from '../../tasks/types';
import { usePermissions } from '../../auth/hooks/usePermissions';

type AttendanceTab = 'overview' | 'timesheet' | 'timeoff' | 'team';

const tabs: { id: AttendanceTab; label: string; helper: string; icon: typeof Timer1 }[] = [
  { id: 'overview', get label() { return translate("نمای کلی"); }, get helper() { return translate("Track today"); }, icon: Timer1 },
  { id: 'timesheet', get label() { return translate("My timesheet"); }, get helper() { return translate("Review logged time"); }, icon: Clock },
  { id: 'timeoff', get label() { return translate("Time off"); }, get helper() { return translate("Requests & holidays"); }, icon: DocumentText },
  { id: 'team', get label() { return translate("Team timesheet"); }, get helper() { return translate("See team workload"); }, icon: People },
];

export const AttendancePage: React.FC = () => {
  const t = useTranslation();
  const { activeOrganizationId, setActiveOrganization } = useAttendanceStore();
  const { activeProjectId, activeBoardId, setActiveProject, setActiveBoard } = useTaskStore();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as AttendanceTab) || 'overview';
  const [activeTab, setActiveTab] = useState<AttendanceTab>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab') as AttendanceTab;
    if (tab && ['overview', 'timesheet', 'timeoff', 'team'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: getOrganizations,
  });

  // ── Project & Board selectors ──────────────────────────────────────────────
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['attendanceProjects'],
    queryFn: () => getProjects(),
  });

  const { data: boards = [], isLoading: isLoadingBoards } = useQuery({
    queryKey: ['attendanceBoards', activeProjectId],
    queryFn: () => getBoards(activeProjectId!),
    enabled: Boolean(activeProjectId),
  });

  // Auto-select first project if nothing is selected
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      setActiveProject(String(projects[0].id));
    }
  }, [projects, activeProjectId, setActiveProject]);

  // Auto-select first board when project changes or boards load
  useEffect(() => {
    if (boards.length > 0 && !activeBoardId) {
      setActiveBoard(String(boards[0].id));
    }
  }, [boards, activeBoardId, setActiveBoard]);

  // Re-select first board when project changes (activeBoardId reset by store)
  const prevProjectRef = React.useRef(activeProjectId);
  useEffect(() => {
    if (prevProjectRef.current !== activeProjectId) {
      prevProjectRef.current = activeProjectId;
      if (boards.length > 0) setActiveBoard(String(boards[0].id));
    }
  }, [activeProjectId, boards, setActiveBoard]);

  // ── Tasks ──────────────────────────────────────────────────────────────────
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

  const { hasAnyPermission } = usePermissions();
  const isManager = hasAnyPermission(['attendance.view_all', 'leave.approve']);
  const visibleTabs = tabs.filter((tab) => tab.id !== 'team' || isManager);
  const activeTabMeta = visibleTabs.find((tab) => tab.id === activeTab) || visibleTabs[0];

  return (
    <div className="heledone-attendance flex h-full flex-col overflow-y-auto bg-base-200 text-base-content custom-scrollbar">
      <div className="mx-auto w-full max-w-[1480px]">
        {/* Top Header */}
        <header className="heledone-page-heading mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
                {t("Time & Attendance")}</h1>
            </div>
            <p className="mt-1 text-xs font-medium text-heledone-ink-muted">
              {t("Track work hours, manage timesheets and time off requests.")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">

            {/* ── Project selector ── */}
            <label className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-heledone-ink-muted uppercase tracking-wider">
                {t("پروژه")}</span>
              <select
                value={activeProjectId || ''}
                onChange={(e) => {
                  setActiveProject(e.target.value || null);
                }}
                disabled={isLoadingProjects}
                className="h-8.5 rounded-xl border border-base-content/10 bg-base-100 px-3 text-xs font-semibold text-base-content outline-none focus:border-primary/40 disabled:opacity-50"
              >
                <option value="" disabled>{t("Select project")}</option>
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </label>

            {/* ── Board selector ── */}
            <label className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-heledone-ink-muted uppercase tracking-wider">
                {t("کانبان")}</span>
              <select
                value={activeBoardId || ''}
                onChange={(e) => setActiveBoard(e.target.value || null)}
                disabled={!activeProjectId || isLoadingBoards}
                className="h-8.5 rounded-xl border border-base-content/10 bg-base-100 px-3 text-xs font-semibold text-base-content outline-none focus:border-primary/40 disabled:opacity-50"
              >
                <option value="" disabled>{t("Select board")}</option>
                {boards.map((b) => (
                  <option key={b.id} value={String(b.id)}>{b.title}</option>
                ))}
              </select>
            </label>

            {/* ── Org selector (only if multiple orgs) ── */}
            {organizations.length > 1 ? (
              <label className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-heledone-ink-muted uppercase tracking-wider">
                  {t("Org")}</span>
                <select
                  value={activeOrganizationId || ''}
                  onChange={(event) => setActiveOrganization(event.target.value)}
                  className="h-8.5 rounded-xl border border-base-content/10 bg-base-100 px-3 text-xs font-semibold text-base-content outline-none focus:border-primary/40"
                >
                  <option value="" disabled>{t("Select org")}</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="rounded-xl border border-base-content/10 bg-base-100 px-3 py-1.5 text-xs font-semibold text-heledone-ink-muted">
                {organizations[0]?.name || t("Your organization")}
              </span>
            )}
          </div>
        </header>

        {/* Minimal Tab Navigation */}
        <nav
          role="tablist"
          aria-label={t("Time and attendance sections")}
          className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-base-content/8 bg-base-100 p-1"
        >
          {visibleTabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                id={`attendance-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`attendance-panel-${id}`}
                onClick={() => setActiveTab(id)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-content shadow-xs'
                    : 'text-heledone-ink-muted hover:bg-base-200 hover:text-base-content'
                }`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div
          id={`attendance-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`attendance-tab-${activeTab}`}
          className="min-h-0"
        >
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[13px] font-bold uppercase  text-primary">{activeTabMeta.label}</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-base-content">{activeTabMeta.helper}</h2></div><span className="hidden text-xs font-medium text-heledone-ink-muted sm:block">{t("All times are shown in your local timezone")}</span></div>

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
