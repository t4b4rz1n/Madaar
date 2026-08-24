import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Calendar, CloseSquare, Trash } from 'iconsax-reactjs';
import { createStandup, updateStandup, deleteStandup } from '../api/tasksApi';
import { getProjects } from '../../projects/api/projectsApi';
import { STANDUP_STRINGS as S } from '../constants/standupStrings';

interface StandupModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When omitted the modal renders a project selector (generic entry points). */
  projectId?: string;
  /** ISO date (YYYY-MM-DD); defaults to today. */
  date?: string;
  memberName?: string;
  readOnly?: boolean;
  /** Existing entry id → PATCH instead of POST. */
  entryId?: string;
  /** Hours already entered in the grid cell → the form focuses on descriptions */
  hideHours?: boolean;
  initial?: {
    hoursWorked?: string;
    todayWork?: string;
    blockers?: string;
  };
  onSaved?: () => void;
  /** Called after the entry is successfully deleted. */
  onDeleted?: () => void;
}

interface StandupFormData {
  projectId: string;
  hoursWorked: string;
  todayWork: string;
  blockers: string;
}

const todayIso = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

export const StandupModal: React.FC<StandupModalProps> = ({
  isOpen,
  onClose,
  projectId,
  date,
  memberName,
  readOnly = false,
  entryId,
  hideHours = false,
  initial,
  onSaved,
  onDeleted,
}) => {
  const targetDate = date ?? todayIso();
  const needsProjectPicker = !projectId;
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StandupFormData>({
    defaultValues: {
      projectId: projectId ?? '',
      hoursWorked: initial?.hoursWorked ?? '',
      todayWork: initial?.todayWork ?? '',
      blockers: initial?.blockers ?? '',
    },
  });

  // Reset the form each time the modal opens with fresh context.
  useEffect(() => {
    if (isOpen) {
      reset({
        projectId: projectId ?? '',
        hoursWorked: initial?.hoursWorked ?? '',
        todayWork: initial?.todayWork ?? '',
        blockers: initial?.blockers ?? '',
      });
    }
  }, [isOpen, projectId, initial, reset]);

  // Close on Escape — cleanup prevents listener leaks (see standards doc §3).
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const projectsQuery = useQuery({
    queryKey: ['projects-for-standup'],
    queryFn: () => getProjects(),
    enabled: isOpen && needsProjectPicker,
  });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const dateLabel = useMemo(() => {
    const parsed = new Date(`${targetDate}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? targetDate
      : format(parsed, 'EEEE, MMMM d, yyyy');
  }, [targetDate]);

  if (!isOpen) return null;

  const onSubmit = async (data: StandupFormData) => {
    const resolvedProjectId = projectId ?? data.projectId;
    try {
      const payload = {
        projectId: resolvedProjectId,
        date: targetDate,
        hoursWorked: Math.round(Number(hideHours ? initial?.hoursWorked ?? 0 : data.hoursWorked) * 100) / 100,
        todayWork: data.todayWork.trim(),
        blockers: data.blockers,
      };
      if (entryId) {
        await updateStandup(entryId, payload);
      } else {
        await createStandup(payload);
      }
      toast.success(S.toastSavedSuccess);
      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Failed to save standup', error);
      toast.error(S.toastSaveFailed);
    }
  };

  const inputClass = (hasError?: boolean) =>
    `w-full rounded-xl border bg-base-200/40 px-4 py-2.5 text-sm text-base-content placeholder:text-base-content/35 focus:outline-none focus:border-primary/60 transition-colors disabled:opacity-60 ${
      hasError ? 'border-error/60' : 'border-base-content/15'
    }`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-sm"
      onClick={readOnly ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label={S.modalTitle}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-content/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2 text-primary">
              <Calendar size="20" variant="Bulk" />
            </div>
            <div>
              <h2 className="text-base font-bold text-base-content">{S.modalTitle}</h2>
              <p className="text-xs text-base-content/55">
                {memberName ? `${memberName} · ` : ''}
                {dateLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {readOnly && (
              <span className="rounded-lg bg-base-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-base-content/60">
                {S.viewOnlyBadge}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-base-content/45 transition-colors hover:text-base-content"
            >
              <CloseSquare size="22" variant="Outline" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form
          id="standup-modal-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 space-y-4 overflow-y-auto p-5"
        >
          {needsProjectPicker && (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-base-content/60">
                {S.projectLabel} *
              </label>
              <select
                className={`select w-full rounded-xl border bg-base-200/40 text-sm [&>option]:bg-base-100 [&>option]:text-base-content ${errors.projectId ? 'select-error border-error/60' : 'border-base-content/15'}`}
                disabled={readOnly || projectsQuery.isLoading}
                {...register('projectId', { required: S.projectRequired })}
              >
                <option value="" disabled hidden>
                  {S.selectProjectPlaceholder}
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p className="mt-1 text-xs text-error">{errors.projectId.message}</p>
              )}
            </div>
          )}

          {readOnly ? (
            // View mode: show the logged hours as a read-only summary
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-base-content/60">
                {S.hoursWorkedToday.replace(' *', '')}
              </label>
              <div className="rounded-xl border border-base-content/15 bg-base-200/40 px-4 py-2.5">
                <span className="text-sm font-semibold text-base-content/70">
                  {initial?.hoursWorked || 0}h
                </span>
              </div>
            </div>
          ) : (
            !hideHours && (
              // Own cell without hours yet → let the user enter them here.
              // When hours were already typed in the cell, this whole section
              // is omitted and the draft value is kept in the form state.
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-base-content/60">
                  {S.hoursWorkedToday}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="24"
                  inputMode="decimal"
                  placeholder="e.g. 22.22"
                  disabled={readOnly}
                  autoFocus
                  className={inputClass(!!errors.hoursWorked)}
                  {...register('hoursWorked', {
                    required: S.hoursRequired,
                    min: { value: 0, message: 'Hours cannot be negative' },
                    max: { value: 24, message: 'Hours worked cannot exceed 24 hours per day' },
                  })}
                />
                 {errors.hoursWorked && (
                   <p className="mt-1 text-xs text-error">{errors.hoursWorked.message}</p>
                 )}
               </div>
             )
           )}

           <div>
             <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-base-content/60">
               {S.whatDidYouDoToday} *
             </label>
            <textarea
              rows={3}
              placeholder={S.whatDidYouDoTodayPlaceholder}
              disabled={readOnly}
              className={`${inputClass(!!errors.todayWork)} resize-none`}
              {...register('todayWork', { required: S.todayWorkRequired })}
            />
            {errors.todayWork && (
              <p className="mt-1 text-xs text-error">{errors.todayWork.message}</p>
            )}
          </div>



          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-base-content/60">
              {S.blockers}
            </label>
            <textarea
              rows={2}
              placeholder={S.blockersPlaceholder}
              disabled={readOnly}
              className={`${inputClass()} resize-none`}
              {...register('blockers')}
            />
          </div>
        </form>

        {/* Footer */}
        {!readOnly && (
          <div className="border-t border-base-content/10 px-5 py-4">
            {!confirmDelete ? (
              <div className="flex items-center justify-between">
                {/* Delete button — only when editing an existing entry */}
                {entryId ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isDeleting || isSubmitting}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error/70 transition-colors hover:bg-error/8 hover:text-error disabled:opacity-40"
                  >
                    <Trash size={14} variant="Outline" />
                    Delete standup
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
                    {S.cancel}
                  </button>
                  <button
                    type="submit"
                    form="standup-modal-form"
                    className="btn btn-primary btn-sm px-6"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      S.save
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmation panel */
              <div className="flex flex-col gap-3">
                <p className="text-sm text-base-content/70">
                  Are you sure you want to permanently delete this standup entry?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        await deleteStandup(entryId!);
                        toast.success(S.toastDeleteSuccess);
                        onDeleted?.();
                        onClose();
                      } catch {
                        toast.error(S.toastDeleteFailed);
                        setConfirmDelete(false);
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    className="btn btn-error btn-sm gap-2 px-5"
                  >
                    {isDeleting ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <Trash size={14} variant="Bold" />
                    )}
                    {isDeleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isDeleting}
                    className="btn btn-ghost btn-sm"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default StandupModal;
