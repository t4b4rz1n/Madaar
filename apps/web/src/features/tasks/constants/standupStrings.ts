/**
 * Centralized copy for the Daily Standups feature.
 * Clean, minimal, and catchy copy for modern UX.
 */
export const STANDUP_STRINGS = {
  pageTitle: 'Daily Standups',
  pageSubtitle: 'Track team progress, logged hours, and blockers in real-time',
  gridTitle: 'Standup Matrix',
  projectLabel: 'Project',
  memberColumnLabel: 'Team Member',
  hoursTotalSuffix: 'h',
  legendCompleted: 'Report Logged',
  legendUnsaved: 'Draft (Press Enter to save)',
  legendIncomplete: 'Incomplete (Click to complete)',
  hintRightClick: 'Click any cell to edit or view daily log.',
  hintRightClickShort: 'Click to log standup',
  lockedCellTitle: 'Future Date Locked',
  viewerNotice:
    'Read-only view. Only project members can log daily standups.',

  modalTitle: 'Daily Log',
  hoursWorkedToday: 'Hours Logged *',
  hoursPlaceholder: '8.0',
  whatDidYouDoToday: "Today's Accomplishments *",
  whatDidYouDoTodayPlaceholder: 'Briefly list what you accomplished today...',
  blockers: 'Blockers / Impediments',
  blockersPlaceholder: 'Any issues, dependencies, or blockers holding you back?',
  cancel: 'Cancel',
  save: 'Save Log',
  saving: 'Saving...',
  viewOnlyBadge: 'View Only',
  selectProjectPlaceholder: 'Choose project...',
  projectRequired: 'Project is required',
  hoursRequired: 'Hours are required',
  hoursRange: 'Hours cannot be negative',
  todayWorkRequired: 'Accomplishments are required',
  tomorrowPlanRequired: 'Plan is required',

  toastSavedSuccess: 'Daily log saved successfully!',
  toastSaveFailed: 'Failed to save log.',
  toastDeleteSuccess: 'Daily log deleted.',
  toastDeleteFailed: 'Failed to delete log.',
  deleteConfirm: 'Delete this daily log entry?',
  noProjectsTitle: 'No Projects Available',
  noProjectsHint: 'Join or create a project to start logging daily standups.',
  emptyGridTitle: 'No Team Members',
  emptyGridHint: 'Add members to this project to view the standup matrix.',
} as const;
