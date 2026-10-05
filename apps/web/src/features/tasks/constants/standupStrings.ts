import { t } from "../../../i18n/locale";
/**
 * Centralized copy for the Daily Standups feature.
 * Clean, minimal, and catchy copy for modern UX.
 */
export const STANDUP_STRINGS = {
  get pageTitle() { return t("Daily Standups"); },
  get pageSubtitle() { return t("Track team progress, logged hours, and blockers in real-time"); },
  get gridTitle() { return t("Standup Matrix"); },
  get projectLabel() { return t("پروژه"); },
  get memberColumnLabel() { return t("Team Member"); },
  get hoursTotalSuffix() { return t("ساعت"); },
  get legendCompleted() { return t("Report Logged"); },
  get legendUnsaved() { return t("Draft (Press Enter to save)"); },
  get legendIncomplete() { return t("Incomplete (Click to complete)"); },
  get hintRightClick() { return t("Click any cell to edit or view daily log."); },
  get hintRightClickShort() { return t("Click to log standup"); },
  get lockedCellTitle() { return t("Future Date Locked"); },
  get viewerNotice() { return t("Read-only view. Only project members can log daily standups."); },

  get modalTitle() { return t("Daily Log"); },
  get hoursWorkedToday() { return t("Hours Logged *"); },
  hoursPlaceholder: '8.0',
  get whatDidYouDoToday() { return t("Today's Accomplishments *"); },
  get whatDidYouDoTodayPlaceholder() { return t("Briefly list what you accomplished today..."); },
  get blockers() { return t("Blockers / Impediments"); },
  get blockersPlaceholder() { return t("Any issues, dependencies, or blockers holding you back?"); },
  get cancel() { return t("انصراف"); },
  get save() { return t("Save Log"); },
  get saving() { return t("در حال ذخیره…"); },
  get viewOnlyBadge() { return t("View Only"); },
  get selectProjectPlaceholder() { return t("Choose project..."); },
  get projectRequired() { return t("Project is required"); },
  get hoursRequired() { return t("Hours are required"); },
  get hoursRange() { return t("Hours cannot be negative"); },
  get todayWorkRequired() { return t("Accomplishments are required"); },
  get tomorrowPlanRequired() { return t("Plan is required"); },

  get toastSavedSuccess() { return t("Daily log saved successfully!"); },
  get toastSaveFailed() { return t("Failed to save log."); },
  get toastDeleteSuccess() { return t("Daily log deleted."); },
  get toastDeleteFailed() { return t("Failed to delete log."); },
  get deleteConfirm() { return t("Delete this daily log entry?"); },
  get noProjectsTitle() { return t("No Projects Available"); },
  get noProjectsHint() { return t("Join or create a project to start logging daily standups."); },
  get emptyGridTitle() { return t("No Team Members"); },
  get emptyGridHint() { return t("Add members to this project to view the standup matrix."); },
} as const;
