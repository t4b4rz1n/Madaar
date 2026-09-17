import ApiService from "../../../core/api/apiService";
import type {
  CfdData,
  CfdParams,
  CycleLeadTimeData,
  CycleLeadTimeParams,
  MilestoneBurndownData,
} from "../types/analytics";

const unwrap = <T>(response: unknown): T => {
  const value = response as { data?: unknown } | null;
  return (value?.data ?? response) as T;
};

// ── Cumulative Flow Diagram ──────────────────────────────────────────────────

export const getProjectCfd = async (
  projectId: string,
  params?: CfdParams
): Promise<CfdData> => {
  const response = await ApiService.get(`reports/projects/${projectId}/cfd/`, {
    params,
  });
  return unwrap<CfdData>(response);
};

// ── Milestone Burndown / Burnup ──────────────────────────────────────────────

export const getMilestoneBurndown = async (
  milestoneId: string,
  params?: { tz?: string }
): Promise<MilestoneBurndownData> => {
  const response = await ApiService.get(
    `reports/milestones/${milestoneId}/burndown/`,
    { params }
  );
  return unwrap<MilestoneBurndownData>(response);
};

// ── Cycle Time & Lead Time ────────────────────────────────────────────────────

export const getProjectCycleTime = async (
  projectId: string,
  params?: CycleLeadTimeParams
): Promise<CycleLeadTimeData> => {
  const response = await ApiService.get(
    `reports/projects/${projectId}/cycle-time/`,
    { params }
  );
  return unwrap<CycleLeadTimeData>(response);
};
