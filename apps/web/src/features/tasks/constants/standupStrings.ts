/**
 * Centralized copy for the Daily Standups feature.
 *
 * The app ships English-only today; every string used by the standup UI lives
 * here so migrating to react-i18next later is a mechanical t('key') swap.
 */
export const STANDUP_STRINGS = {
  pageTitle: 'Daily Standups',
  pageSubtitle: "Review your team's daily progress and blockers",
  gridTitle: 'Project Standup Grid',
  projectLabel: 'Project',
  memberColumnLabel: 'Member',
  hoursTotalSuffix: 'h total',
  legendCompleted: 'Standup completed',
  legendUnsaved: 'Unsaved hours (Press Enter to save)',
  legendIncomplete: 'Incomplete standup (Right-click to finish it)',
  hintRightClick: 'Right-click on any cell to add/view standup. Past days are editable, future days are locked.',
  hintRightClickShort: 'Right-click for details',
  lockedCellTitle: 'Locked',
  viewerNotice:
    "You are viewing this project's standups. Only project members can log entries.",

  modalTitle: 'Daily Standup',
  hoursWorkedToday: 'Hours worked today *',
  hoursPlaceholder: 'e.g. 8',
  whatDidYouDoToday: 'What did you do today?',
  whatDidYouDoTodayPlaceholder: 'e.g., Completed authentication API...',
  whatWillYouDoTomorrow: 'What will you do tomorrow?',
  whatWillYouDoTomorrowPlaceholder: 'e.g., Working on the dashboard UI...',
  blockers: 'Blockers? (Optional)',
  blockersPlaceholder: 'e.g., Waiting for UI designs...',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving...',
  viewOnlyBadge: 'View only',
  selectProjectPlaceholder: 'Select your project...',
  projectRequired: 'Please select a project',
  hoursRequired: 'Hours are required',
  hoursRange: 'Hours cannot be negative',
  todayWorkRequired: 'This field is required',
  tomorrowPlanRequired: 'This field is required',

  toastSavedSuccess: 'Standup saved successfully!',
  toastSaveFailed: 'Failed to save standup.',
  noProjectsTitle: 'No Projects Found',
  noProjectsHint: 'Create or join a project to start logging daily standups.',
  emptyGridTitle: 'No Members Found',
  emptyGridHint: 'This project has no members yet. Add members to see the standup grid.',
} as const;
