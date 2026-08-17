import ApiService from '../../../core/api/apiService';

import type { Attendance, TimeLog, TimeOffRequest, Holiday, TimesheetEntry, Organization } from '../types';

const extractData = <T>(res: any): T[] => {
  const data = res?.results ?? res?.data?.results ?? res?.data ?? res;
  return Array.isArray(data) ? data : [];
};

export const getOrganizations = async (): Promise<Organization[]> => {
  const res = await ApiService.get('/organizations/');
  return extractData<Organization>(res);
};

// ================= Attendance =================
export const checkIn = async (organizationId: string): Promise<Attendance> => {
  const res = await ApiService.post<Attendance>('/attendance/attendances/check_in/', { organization: organizationId });
  return res as unknown as Attendance;
};

export const checkOut = async (): Promise<Attendance> => {
  const res = await ApiService.post<Attendance>('/attendance/attendances/check_out/');
  return res as unknown as Attendance;
};

export const getTodayAttendance = async (): Promise<Attendance | null> => {
  try {
    const res = await ApiService.get<Attendance>('/attendance/attendances/my_today/');
    return res as unknown as Attendance;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const getAttendances = async (params: Record<string, any> = {}): Promise<Attendance[]> => {
  const res = await ApiService.get('/attendance/attendances/', { params });
  return extractData<Attendance>(res);
};

// ================= Time Logs =================
export const getActiveTimer = async (): Promise<TimeLog | null> => {
  try {
    const res = await ApiService.get<TimeLog>('/attendance/time-logs/active-timer/');
    return res.data as unknown as TimeLog;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const startTimer = async (taskId: string | number): Promise<TimeLog> => {
  const res = await ApiService.post<TimeLog>('/attendance/time-logs/start-timer/', { task: taskId });
  return res.data as unknown as TimeLog;
};

export const stopTimer = async (timerId?: string | number): Promise<TimeLog | null> => {
  let id = timerId;
  if (!id) {
    const active = await getActiveTimer();
    if (!active) return null;
    id = active.id;
  }
  const res = await ApiService.post<TimeLog>(`/attendance/time-logs/${id}/stop-timer/`);
  return res.data as unknown as TimeLog;
};

export const cancelTimer = async (timerId: string | number): Promise<void> => {
  await ApiService.post(`/attendance/time-logs/${timerId}/cancel/`);
};

export const createManualLog = async (data: { task: number; start_time: string; end_time: string; description?: string }): Promise<TimeLog> => {
  const res = await ApiService.post<TimeLog>('/attendance/time-logs/manual-timer/', data);
  return res.data as unknown as TimeLog;
};

export const getTimeLogs = async (params: Record<string, any> = {}): Promise<TimeLog[]> => {
  const res = await ApiService.get('/attendance/time-logs/', { params });
  return extractData<TimeLog>(res);
};

export const deleteTimeLog = async (id: number): Promise<void> => {
  await ApiService.delete(`/attendance/time-logs/${id}/`);
};

// ================= Time Off Requests =================
export const getTimeOffRequests = async (params: Record<string, any> = {}): Promise<TimeOffRequest[]> => {
  const res = await ApiService.get('/attendance/timeoff-requests/', { params });
  return extractData<TimeOffRequest>(res);
};

export const createTimeOffRequest = async (data: Partial<TimeOffRequest>): Promise<TimeOffRequest> => {
  const res = await ApiService.post<TimeOffRequest>('/attendance/timeoff-requests/', data);
  return res as unknown as TimeOffRequest;
};

export const approveTimeOffRequest = async (id: string | number): Promise<TimeOffRequest> => {
  const res = await ApiService.post<TimeOffRequest>(`/attendance/timeoff-requests/${id}/approve/`);
  return res as unknown as TimeOffRequest;
};

export const rejectTimeOffRequest = async (id: string | number, manager_note: string): Promise<TimeOffRequest> => {
  const res = await ApiService.post<TimeOffRequest>(`/attendance/timeoff-requests/${id}/reject/`, { manager_note });
  return res as unknown as TimeOffRequest;
};

export const cancelTimeOffRequest = async (id: string | number): Promise<void> => {
  await ApiService.post(`/attendance/timeoff-requests/${id}/cancel/`);
};

// ================= Holidays =================
export const getHolidays = async (params: Record<string, any> = {}): Promise<Holiday[]> => {
  const res = await ApiService.get('/attendance/holidays/', { params });
  return extractData<Holiday>(res);
};

export const createHoliday = async (data: Partial<Holiday>): Promise<Holiday> => {
  const res = await ApiService.post<Holiday>('/attendance/holidays/', data);
  return res as unknown as Holiday;
};

export const deleteHoliday = async (id: number): Promise<void> => {
  await ApiService.delete(`/attendance/holidays/${id}/`);
};

// ================= Timesheets =================
export const getMyWeeklyTimesheet = async (date?: string): Promise<TimesheetEntry[]> => {
  const params = date ? { date } : {};
  const res = await ApiService.get('/attendance/timesheets/my_weekly/', { params });
  return extractData<TimesheetEntry>(res);
};

export const getMyMonthlyTimesheet = async (year: number, month: number): Promise<TimesheetEntry[]> => {
  const res = await ApiService.get('/attendance/timesheets/my_monthly/', { params: { year, month } });
  return extractData<TimesheetEntry>(res);
};

export const getTeamTimesheet = async (organizationId: string, startDate: string, endDate: string): Promise<TimesheetEntry[]> => {
  const res = await ApiService.get('/attendance/timesheets/team/', { 
    params: { organization: organizationId, start_date: startDate, end_date: endDate } 
  });
  return extractData<TimesheetEntry>(res);
};
