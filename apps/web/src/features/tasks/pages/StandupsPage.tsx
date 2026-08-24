import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft2,
  ArrowRight2,
  Check,
  NoteText,
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

/** localStorage key so the selected project survives page refreshes. */
const SELECTED_PROJECT_STORAGE_KEY = 'madar:standups:selectedProjectId';

/** `${userId}:${isoDate}` key used by the entries lookup and hour drafts. */
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

  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: () => getProjects() });
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  // Persist the selection so a refresh keeps the same project.
  React.useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, selectedProjectId);
    }
  }, [selectedProjectId]);

  // Fall back to the first project when nothing (valid) is stored yet.
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

  /** Entries indexed by `${userId}:${isoDate}` for O(1) cell rendering. */
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

      // Read-only cells need content to be worth opening.
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
      /** Hours were already entered in the grid cell → modal focuses on descriptions */
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

  /** Cells with an in-flight quick-save (Enter) request. */
  const [savingCellKeys, setSavingCellKeys] = useState<Set<string>>(() => new Set());
  const [focusedCellKey, setFocusedCellKey] = useState<string | null>(null);

  /**
   * Enter on an editable cell saves the typed hours directly when a standup
   * entry already exists; otherwise it opens the full standup modal.
   */
  const handleEnterOnCell = useCallback(
    async (member: StandupGridMember, day: number) => {
      const isoDate = dayIso(day);
      const key = cellKey(member.id, isoDate);
      const entry = entryIndex.get(key);

      // No report for this day yet → descriptions are required, use the modal.
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
    // Green check: standup fully reported. Orange dot: hours present but the
    // report is not saved/complete yet.
    const showGreenCheck = Boolean(entry?.is_complete);
    const showOrangeDot = isDirty || Boolean(entry && !entry.is_complete);

    return (
      <div className="relative flex h-8 w-full min-w-[24px] max-w-[34px] items-center justify-center mx-auto">
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
              className="h-7 w-full rounded-md bg-transparent text-center text-xs font-semibold text-primary placeholder:text-base-content/30 focus:border-primary/50 focus:bg-base-200/80 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none p-0 transition-colors"
            />
          ) : (
            <div
              tabIndex={0}
              onFocus={() => setFocusedCellKey(key)}
              onClick={() => setFocusedCellKey(key)}
              className="flex h-7 w-full cursor-text items-center justify-center rounded-md bg-transparent text-center text-xs font-semibold text-primary transition-colors hover:bg-base-200/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
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
                  ? 'text-primary'
                  : 'text-base-content/60'
                : 'text-base-content/25'
            }`}
          >
            {value ? formatDecimalHours(value) : '-'}
          </span>
        )}
        {showGreenCheck && (
          <span
            className="absolute -top-0.5 -end-0.5 z-10 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-success text-success-content shadow-sm"
            title={S.legendCompleted}
          >
            <Check size={6} variant="Bold" />
          </span>
        )}
        {showOrangeDot && !showGreenCheck && (
          <span
            className="absolute -top-0.5 -end-0.5 z-10 h-1.5 w-1.5 rounded-full bg-warning shadow-sm"
            title={isDirty ? S.legendUnsaved : S.legendIncomplete}
          />
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-[1600px] p-3 sm:p-5 lg:p-6"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <NoteText variant="Bulk" size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-base-content md:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-base-content/60">{subtitle}</p>
          </div>
        </div>

        {projects.length > 0 && (
          <label className="form-control w-full md:w-64">
            <span className="sr-only">{S.projectLabel}</span>
            <select
              className="select select-bordered w-full rounded-xl bg-base-200/50 font-medium focus:outline-none [&>option]:bg-base-100 [&>option]:text-base-content"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : !selectedProjectId || projects.length === 0 ? (
        <div className="rounded-2xl border border-base-content/10 bg-base-200/30 p-12 text-center">
          <NoteText size={48} className="mx-auto mb-4 text-base-content/20" />
          <h3 className="mb-2 text-lg font-semibold text-base-content">{S.noProjectsTitle}</h3>
          <p className="text-base-content/60">{S.noProjectsHint}</p>
        </div>
      ) : (
        /* Grid card */
        <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
          {/* Viewer notice: grid visible but writing is member-only */}
          {grid && !grid.can_write && (
            <div className="border-b border-warning/20 bg-warning/10 px-4 py-2.5 text-xs font-medium text-warning">
              {S.viewerNotice}
            </div>
          )}

          {/* Month navigation */}
          <div className="relative flex items-center px-3 py-3 md:px-4">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-primary"
            >
              <ArrowLeft2 size={18} />
            </button>
            <div className="absolute start-1/2 -translate-x-1/2 text-center rtl:translate-x-1/2">
              <p className="text-base font-bold text-base-content md:text-lg">{monthLabel}</p>
              <p className="text-[11px] text-base-content/45">{S.gridTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="btn btn-ghost btn-circle btn-sm ms-auto text-base-content/60 hover:text-primary"
            >
              <ArrowRight2 size={18} />
            </button>
          </div>

          {/* Members × days matrix */}
          <div className="custom-scrollbar overflow-x-auto pb-1">
            <table className="w-full min-w-max border-separate border-spacing-0 table-fixed sm:table-auto lg:table-fixed">
              <thead>
                <tr>
                  {/* MEMBER header — same bg as member sticky column */}
                  <th className="sticky start-0 z-20 w-32 min-w-[110px] max-w-[130px] border-b border-base-content/10 bg-base-200/80 px-3 py-2 text-start text-[11px] font-bold uppercase tracking-wider text-base-content/60 backdrop-blur">
                    {S.memberColumnLabel}
                  </th>
                  {/* Day number headers — NO border-l between them, same bg zone */}
                  {days.map((day) => {
                    const isToday =
                      Boolean(grid?.today) && dayIso(day) === grid?.today;
                    return (
                      <th
                        key={day}
                        className={`border-b border-base-content/10 bg-base-200/30 px-0.5 py-2 text-center text-[11px] font-bold ${
                          isToday ? 'bg-primary/10 text-primary' : 'text-base-content/50'
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
                  return (
                    <tr key={member.id} className="group">
                      {/* Member sticky column — slightly lighter than cell area */}
                      <td className="sticky start-0 z-20 w-32 min-w-[110px] max-w-[130px] border-b border-base-content/8 bg-base-200/40 px-3 py-1.5 backdrop-blur group-hover:bg-base-200/70">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              isOwnRow(member) ? 'bg-primary' : 'bg-base-content/40'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-base-content" title={displayName}>
                              {displayName}
                            </p>
                            <p className="text-[10px] font-medium text-base-content/50">
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
                            className={`border-b border-l border-base-content/[0.07] p-0.5 text-center ${
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
                                    ? 'cursor-not-allowed'
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
                      <h3 className="text-base font-semibold text-base-content">
                        {S.emptyGridTitle}
                      </h3>
                      <p className="mt-1 text-sm text-base-content/60">{S.emptyGridHint}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer legend */}
          <div className="flex flex-col justify-between gap-2 border-t border-base-content/10 px-4 py-3 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-4 text-xs text-base-content/55">
              <span className="flex items-center gap-1.5">
                <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-success text-success-content shadow-sm">
                  <Check size={7} variant="Bold" />
                </span>
                {S.legendCompleted}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning" />
                {S.legendUnsaved}
              </span>
            </div>
            <span className="text-xs text-base-content/35">{S.hintRightClick}</span>
          </div>
        </div>
      )}

      {/* Right-click standup modal — keyed per cell so the form state is always fresh */}
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
