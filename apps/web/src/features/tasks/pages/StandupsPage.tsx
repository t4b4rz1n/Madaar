import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft2,
  ArrowRight2,
  Check,
  NoteText,
  Calendar,
  Add,
  ArrowDown2,
  TickCircle,
  Folder,
} from 'iconsax-reactjs';
import { getStandupGrid, updateStandupHours } from '../api/tasksApi';
import { getProjects } from '../../projects/api/projectsApi';
import { useAuthStore } from '../../auth/store/authStore';
import { STANDUP_STRINGS as S } from '../constants/standupStrings';
import { StandupModal } from '../components/StandupModal';
import type {
  StandupGridData,
  StandupGridEntry,
  StandupGridMember,
} from '../types';

const PASTEL_COLORS = ['#b39ddb', '#9fa8da', '#81d4fa', '#80cbc4', '#a5d6a7', '#ffcc80', '#f48fb1', '#ce93d8'];

function formatDecimalHours(decimalValue: number | string | null | undefined): string {
  const num = Number(decimalValue);
  if (!num || isNaN(num) || num <= 0) return '00:00';
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

const SELECTED_PROJECT_STORAGE_KEY = 'madar:standups:selectedProjectId';

const cellKey = (userId: string, isoDate: string): string => `${userId}:${isoDate}`;

interface CellModalState {
  memberId: string;
  memberName: string;
  isoDate: string;
}

interface HourDrafts {
  [cellKey: string]: string;
}

interface StandupPageProps {
  title?: string;
  subtitle?: string;
}

export const StandupsPage: React.FC<StandupPageProps> = ({
  title = S.pageTitle,
  subtitle = S.pageSubtitle,
}) => {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const now = new Date();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    () => localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY) ?? '',
  );
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [modalState, setModalState] = useState<CellModalState | null>(null);
  const [hourDrafts, setHourDrafts] = useState<HourDrafts>({});
  const [isProjDropdownOpen, setIsProjDropdownOpen] = useState(false);
  const projDropdownRef = useRef<HTMLDivElement>(null);

  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: () => getProjects() });
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projDropdownRef.current && !projDropdownRef.current.contains(e.target as Node)) {
        setIsProjDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProject = useMemo(
    () => projects.find((p) => String(p.id) === String(selectedProjectId)) || projects[0],
    [projects, selectedProjectId]
  );
  const selectedProjectIndex = useMemo(
    () => projects.findIndex((p) => String(p.id) === String(selectedProject?.id)),
    [projects, selectedProject]
  );
  const selectedProjectColor =
    selectedProject?.color || PASTEL_COLORS[selectedProjectIndex % PASTEL_COLORS.length];

  React.useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, selectedProjectId);
    }
  }, [selectedProjectId]);

  React.useEffect(() => {
    if (!projectsQuery.isSuccess || projects.length === 0) return;
    if (!projects.some((project) => String(project.id) === selectedProjectId)) {
      setSelectedProjectId(String(projects[0].id));
    }
  }, [projectsQuery.isSuccess, projects, selectedProjectId]);

  const gridQuery = useQuery({
    queryKey: ['standup-grid', selectedProjectId, cursor.year, cursor.month],
    queryFn: () => getStandupGrid(selectedProjectId, cursor.year, cursor.month),
    enabled: Boolean(selectedProjectId),
  });
  const grid: StandupGridData | undefined = gridQuery.data;

  const days = useMemo(
    () => Array.from({ length: grid?.days_in_month ?? 0 }, (_, index) => index + 1),
    [grid?.days_in_month],
  );

  const dayIso = useCallback(
    (day: number): string => `${cursor.year}-${pad2(cursor.month)}-${pad2(day)}`,
    [cursor.year, cursor.month],
  );

  const entryIndex = useMemo(() => {
    const index = new Map<string, StandupGridEntry>();
    (grid?.entries ?? []).forEach((entry) => {
      index.set(cellKey(entry.user_id, entry.date), entry);
    });
    return index;
  }, [grid?.entries]);

  const isOwnRow = useCallback(
    (member: StandupGridMember): boolean =>
      currentUserId != null && String(member.id) === String(currentUserId),
    [currentUserId],
  );

  const isEditableDay = useCallback(
    (isoDate: string): boolean => Boolean(grid?.today) && isoDate <= (grid?.today ?? ''),
    [grid?.today],
  );

  const canEditCell = useCallback(
    (member: StandupGridMember, isoDate: string): boolean =>
      Boolean(grid?.can_write) && isOwnRow(member) && isEditableDay(isoDate),
    [grid?.can_write, isOwnRow, isEditableDay],
  );

  const savedHours = useCallback(
    (memberId: string, isoDate: string): string | null => {
      const entry = entryIndex.get(cellKey(memberId, isoDate));
      if (!entry) return null;
      const hours = Number(entry.hours_worked);
      return Number.isFinite(hours)
        ? String(Number.isInteger(hours) ? hours : Number(hours.toFixed(2)))
        : null;
    },
    [entryIndex],
  );

  const shiftMonth = useCallback((delta: number) => {
    setCursor((prev) => {
      const shifted = new Date(prev.year, prev.month - 1 + delta, 1);
      return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 };
    });
  }, []);

  const handleOpenCell = useCallback(
    (member: StandupGridMember, day: number) => {
      const isoDate = dayIso(day);
      const editable = canEditCell(member, isoDate);
      const entry = entryIndex.get(cellKey(member.id, isoDate));

      if (!editable && !entry) return;

      const name =
        [member.first_name, member.last_name].filter(Boolean).join(' ') ||
        member.username;

      setModalState({
        memberId: member.id,
        memberName: name,
        isoDate,
      });
    },
    [canEditCell, dayIso, entryIndex],
  );

  const activeCell = useMemo(() => {
    if (!modalState) return null;
    const key = cellKey(modalState.memberId, modalState.isoDate);
    const entry = entryIndex.get(key);
    const draft = hourDrafts[key];
    const member = grid?.members.find((m) => m.id === modalState.memberId);
    const saved = savedHours(modalState.memberId, modalState.isoDate);
    const hasHours = Boolean((draft ?? '') !== '') || Boolean(saved && Number(saved) > 0);
    return {
      entryId: entry?.id,
      readOnly: member ? !canEditCell(member, modalState.isoDate) : true,
      hideHours: hasHours,
      initial: {
        hoursWorked: draft ?? saved ?? '',
        todayWork: entry?.today_work ?? '',
        blockers: entry?.blockers ?? '',
      },
    };
  }, [modalState, entryIndex, hourDrafts, grid?.members, canEditCell, savedHours]);

  const handleSaved = useCallback(() => {
    if (modalState) {
      const key = cellKey(modalState.memberId, modalState.isoDate);
      setHourDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setModalState(null);
    queryClient.invalidateQueries({
      queryKey: ['standup-grid', selectedProjectId, cursor.year, cursor.month],
    });
  }, [modalState, queryClient, selectedProjectId, cursor.year, cursor.month]);

  const [savingCellKeys, setSavingCellKeys] = useState<Set<string>>(() => new Set());
  const [focusedCellKey, setFocusedCellKey] = useState<string | null>(null);

  const handleEnterOnCell = useCallback(
    async (member: StandupGridMember, day: number) => {
      const isoDate = dayIso(day);
      const key = cellKey(member.id, isoDate);
      const entry = entryIndex.get(key);

      if (!entry) {
        handleOpenCell(member, day);
        return;
      }

      const draft = hourDrafts[key];
      const saved = savedHours(member.id, isoDate);
      if (savingCellKeys.has(key)) return;

      const parsedHours = Number((draft ?? '').trim());
      if ((draft ?? '') !== '' && !Number.isFinite(parsedHours)) return;
      if (parsedHours > 24) {
        toast.error('Hours worked cannot exceed 24 hours per day.');
        return;
      }
      if (parsedHours < 0) {
        toast.error('Hours worked cannot be negative.');
        return;
      }

      const hoursWorked = Math.max(
        0,
        Math.min(24, Number.isFinite(parsedHours) ? Math.round(parsedHours * 100) / 100 : 0),
      );
      if (Number(saved ?? 0) === hoursWorked) return;

      setSavingCellKeys((prev) => new Set(prev).add(key));
      try {
        await updateStandupHours(entry.id, hoursWorked);
        toast.success(S.toastSavedSuccess);
        setHourDrafts((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        queryClient.invalidateQueries({
          queryKey: ['standup-grid', selectedProjectId, cursor.year, cursor.month],
        });
      } catch (error) {
        console.error('Failed to quick-save standup hours', error);
        toast.error(S.toastSaveFailed);
      } finally {
        setSavingCellKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [
      dayIso,
      entryIndex,
      hourDrafts,
      savingCellKeys,
      savedHours,
      handleOpenCell,
      queryClient,
      selectedProjectId,
      cursor.year,
      cursor.month,
    ],
  );

  const monthLabel = useMemo(
    () => format(new Date(cursor.year, cursor.month - 1, 1), 'MMMM yyyy'),
    [cursor.year, cursor.month],
  );

  const isLoading = projectsQuery.isLoading || (Boolean(selectedProjectId) && gridQuery.isLoading);

  const renderCellContent = (
    member: StandupGridMember,
    day: number,
    isoDate: string,
  ) => {
    const key = cellKey(member.id, isoDate);
    const editable = canEditCell(member, isoDate);
    const entry = entryIndex.get(key);
    const draft = hourDrafts[key];
    const saved = savedHours(member.id, isoDate);
    const value = editable ? draft ?? saved ?? '' : saved ?? '';
    const isDirty =
      editable && draft !== undefined && Number(draft) !== Number(saved ?? 0);
    const showGreenCheck = Boolean(entry?.is_complete);
    const showOrangeDot = isDirty || Boolean(entry && !entry.is_complete);

    return (
      <div className="relative flex h-8 w-full min-w-[28px] max-w-[36px] items-center justify-center mx-auto">
        {editable ? (
          focusedCellKey === key ? (
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0"
              max="24"
              value={value}
              placeholder="-"
              aria-label={`${member.username} ${isoDate}`}
              onBlur={() => setFocusedCellKey(null)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || (Number(val) >= 0 && Number(val) <= 24)) {
                  setHourDrafts((prev) => ({ ...prev, [key]: val }));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleEnterOnCell(member, day);
                  setFocusedCellKey(null);
                }
              }}
              className="h-7 w-full rounded-lg bg-primary/10 text-center text-xs font-bold text-primary placeholder:text-base-content/30 focus:border-primary/50 focus:bg-primary/15 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none p-0 transition-all"
            />
          ) : (
            <div
              tabIndex={0}
              onFocus={() => setFocusedCellKey(key)}
              onClick={() => setFocusedCellKey(key)}
              className="flex h-7 w-full cursor-text items-center justify-center rounded-lg bg-transparent text-center text-xs font-bold text-primary transition-all hover:bg-primary/10 focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {value ? formatDecimalHours(value) : '-'}
            </div>
          )
        ) : (
          <span
            title={value ? formatDecimalHours(value) : undefined}
            className={`text-xs font-bold ${
              value
                ? isOwnRow(member)
                  ? 'text-primary font-black'
                  : 'text-base-content/75'
                : 'text-base-content/20'
            }`}
          >
            {value ? formatDecimalHours(value) : '-'}
          </span>
        )}
        {showGreenCheck && (
          <span
            className="absolute -top-0.5 -end-0.5 z-10 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs"
            title={S.legendCompleted}
          >
            <Check size={8} variant="Bold" />
          </span>
        )}
        {showOrangeDot && !showGreenCheck && (
          <span
            className="absolute -top-0.5 -end-0.5 z-10 h-2 w-2 rounded-full bg-amber-500 shadow-xs"
            title={isDirty ? S.legendUnsaved : S.legendIncomplete}
          />
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 pb-10"
    >
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-base-content/8 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary shrink-0">
            <NoteText variant="Bulk" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-base-content sm:text-2xl">
              {title}
            </h1>
            <p className="text-xs text-base-content/50">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {projects.length > 0 && (
            <div className="relative z-[50]" ref={projDropdownRef}>
              <button
                type="button"
                onClick={() => setIsProjDropdownOpen((prev) => !prev)}
                className="flex h-9.5 items-center gap-2.5 rounded-xl border border-base-content/10 bg-base-100 px-3.5 text-xs font-bold text-base-content shadow-xs transition-all hover:border-primary/40 hover:bg-base-200/50"
              >
                <span
                  className="size-3.5 rounded-full shrink-0 shadow-xs"
                  style={{
                    background: selectedProjectColor,
                    boxShadow: `0 0 8px ${selectedProjectColor}60`,
                  }}
                />
                {selectedProject?.prefix && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-white shrink-0"
                    style={{ background: selectedProjectColor }}
                  >
                    {selectedProject.prefix}
                  </span>
                )}
                <span dir="auto" className="truncate max-w-[150px] text-xs font-bold">
                  {selectedProject?.name || 'Select Project'}
                </span>
                <ArrowDown2
                  size={14}
                  className={`shrink-0 text-base-content/50 transition-transform duration-200 ${
                    isProjDropdownOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>

              {isProjDropdownOpen && (
                <div className="absolute right-0 sm:left-0 sm:right-auto mt-1.5 w-64 rounded-2xl border border-base-content/10 bg-base-100 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-100 z-[101]">
                  <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-base-content/40 border-b border-base-content/8 mb-1">
                    <Folder size={13} className="text-primary" />
                    <span>Select Project</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                    {projects.map((p, index) => {
                      const color = p.color || PASTEL_COLORS[index % PASTEL_COLORS.length];
                      const isSelected = String(p.id) === String(selectedProjectId);

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(String(p.id));
                            setIsProjDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-bold'
                              : 'text-base-content/80 hover:bg-base-200/60 hover:text-base-content font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="size-3.5 rounded-full shrink-0 shadow-xs"
                              style={{ background: color }}
                            />
                            {p.prefix && (
                              <span
                                className="rounded-md px-1.5 py-0.5 text-[9px] font-extrabold text-white shrink-0"
                                style={{ background: color }}
                              >
                                {p.prefix}
                              </span>
                            )}
                            <span dir="auto" className="truncate text-xs">
                              {p.name}
                            </span>
                          </div>

                          {isSelected && (
                            <TickCircle size={15} className="shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {grid?.can_write && grid?.today && (
            <button
              type="button"
              onClick={() => {
                const me = grid.members.find((m) => isOwnRow(m));
                if (me) {
                  const todayNum = Number(grid.today.split('-')[2]);
                  handleOpenCell(me, todayNum);
                }
              }}
              className="inline-flex h-9.5 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-content shadow-md shadow-primary/15 hover:bg-primary/90 transition-all"
            >
              <Add size={16} />
              <span>Log Today's Standup</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : !selectedProjectId || projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-base-content/15 bg-base-100 p-12 text-center">
          <NoteText size={40} className="mx-auto mb-3 text-base-content/25" />
          <h3 className="text-base font-bold text-base-content">{S.noProjectsTitle}</h3>
          <p className="mt-1 text-xs text-base-content/50">{S.noProjectsHint}</p>
        </div>
      ) : (
        /* Standup Grid Card */
        <div className="overflow-hidden rounded-2xl border border-base-content/8 bg-base-100 shadow-sm">
          {/* Viewer notice */}
          {grid && !grid.can_write && (
            <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              {S.viewerNotice}
            </div>
          )}

          {/* Month Navigator Header */}
          <div className="flex items-center justify-between border-b border-base-content/8 px-4 py-3 bg-base-200/30">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="flex size-8 items-center justify-center rounded-xl border border-base-content/10 bg-base-100 text-base-content/60 hover:bg-base-200 hover:text-base-content transition-all"
            >
              <ArrowLeft2 size={16} />
            </button>

            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              <span className="text-sm font-bold text-base-content">{monthLabel}</span>
            </div>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="flex size-8 items-center justify-center rounded-xl border border-base-content/10 bg-base-100 text-base-content/60 hover:bg-base-200 hover:text-base-content transition-all"
            >
              <ArrowRight2 size={16} />
            </button>
          </div>

          {/* Matrix Table */}
          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-max border-separate border-spacing-0 table-fixed">
              <thead>
                <tr>
                  <th className="sticky start-0 z-20 w-44 border-b border-base-content/8 bg-base-100 px-4 py-2.5 text-start text-[11px] font-bold uppercase tracking-wider text-base-content/50">
                    {S.memberColumnLabel}
                  </th>
                  {days.map((day) => {
                    const isToday =
                      Boolean(grid?.today) && dayIso(day) === grid?.today;
                    return (
                      <th
                        key={day}
                        className={`border-b border-base-content/8 px-1 py-2 text-center text-[11px] font-bold transition-all ${
                          isToday
                            ? 'bg-primary/10 text-primary border-b-primary/40'
                            : 'bg-base-200/20 text-base-content/50'
                        }`}
                      >
                        {day}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(grid?.members ?? []).map((member) => {
                  const total = Number(member.total_hours) || 0;
                  const displayName =
                    [member.first_name, member.last_name].filter(Boolean).join(' ') ||
                    member.username;
                  const isCurrent = isOwnRow(member);

                  return (
                    <tr key={member.id} className="group">
                      <td className="sticky start-0 z-20 border-b border-base-content/6 bg-base-100 px-4 py-2 backdrop-blur group-hover:bg-base-200/50 transition-all">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`grid size-7 place-items-center rounded-lg text-[10px] font-bold shrink-0 ${
                              isCurrent
                                ? 'bg-primary text-primary-content'
                                : 'bg-base-200 text-base-content/60'
                            }`}
                          >
                            {displayName[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p
                              dir="auto"
                              className={`truncate text-xs font-bold ${
                                isCurrent ? 'text-primary' : 'text-base-content'
                              }`}
                              title={displayName}
                            >
                              {displayName}
                            </p>
                            <p className="text-[10px] font-medium text-base-content/40">
                              {formatDecimalHours(total)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {days.map((day) => {
                        const isoDate = dayIso(day);
                        const editable = canEditCell(member, isoDate);
                        const isToday =
                          Boolean(grid?.today) && isoDate === grid?.today;
                        const isFuture =
                          Boolean(grid?.today) && isoDate > (grid?.today ?? '');
                        const hasEntry = entryIndex.has(cellKey(member.id, isoDate));

                        return (
                          <td
                            key={day}
                            className={`border-b border-l border-base-content/5 p-1 text-center transition-all ${
                              isToday ? 'bg-primary/5' : ''
                            }`}
                            onClick={
                              editable ? undefined : () => handleOpenCell(member, day)
                            }
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleOpenCell(member, day);
                            }}
                            title={
                              isFuture
                                ? S.lockedCellTitle
                                : editable && !hasEntry
                                  ? S.hintRightClickShort
                                  : undefined
                            }
                          >
                            <div
                              className={`mx-auto flex w-full items-center justify-center ${
                                editable
                                  ? 'cursor-text'
                                  : isFuture
                                    ? 'cursor-not-allowed opacity-40'
                                    : hasEntry
                                      ? 'cursor-pointer'
                                      : 'cursor-default'
                              }`}
                            >
                              {renderCellContent(member, day, isoDate)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {(grid?.members.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={(grid?.days_in_month ?? 0) + 1} className="py-12 text-center">
                      <h3 className="text-sm font-bold text-base-content">
                        {S.emptyGridTitle}
                      </h3>
                      <p className="mt-1 text-xs text-base-content/50">{S.emptyGridHint}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Legend */}
          <div className="flex flex-col justify-between gap-2 border-t border-base-content/8 px-4 py-3 bg-base-200/20 md:flex-row md:items-center text-xs">
            <div className="flex flex-wrap items-center gap-4 text-base-content/60">
              <span className="flex items-center gap-1.5">
                <span className="flex size-3 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check size={8} variant="Bold" />
                </span>
                <span className="text-[11px] font-medium">{S.legendCompleted}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                <span className="text-[11px] font-medium">{S.legendUnsaved}</span>
              </span>
            </div>
            <span className="text-[11px] text-base-content/40">{S.hintRightClick}</span>
          </div>
        </div>
      )}

      {/* Standup Modal */}
      {modalState && (
        <StandupModal
          key={`${modalState.memberId}:${modalState.isoDate}`}
          isOpen
          onClose={() => setModalState(null)}
          projectId={selectedProjectId}
          date={modalState.isoDate}
          memberName={modalState.memberName}
          entryId={activeCell?.entryId}
          readOnly={activeCell?.readOnly ?? true}
          hideHours={activeCell?.hideHours ?? false}
          initial={activeCell?.initial}
          onSaved={handleSaved}
          onDeleted={handleSaved}
        />
      )}
    </motion.div>
  );
};

export default StandupsPage;
