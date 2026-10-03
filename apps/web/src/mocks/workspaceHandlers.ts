import { http, HttpResponse } from "msw";
import { mockProfile, mockProjectMembers } from "./db";
import type { Board, Task } from "../features/tasks/types";

// Local-only fixtures for reviewing the main working screens with VITE_USE_MOCK=true.
const base = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");
const respond = (data: unknown) => HttpResponse.json({ status: true, message: "Success", data });
const board: Board = {
  id: "1", title: "کارهای تیم", background_color: "#DF765B",
  statuses: [
    { id: "todo", code: "todo", name: "برای انجام", category: "todo", order: 0 },
    { id: "doing", code: "doing", name: "در حال انجام", category: "in_progress", order: 1 },
    { id: "review", code: "review", name: "در حال بررسی", category: "review", order: 2 },
    { id: "done", code: "done", name: "انجام‌شده", category: "done", order: 3 },
  ],
};
type PreviewTask = Task & { status: string; board: string };
let tasks: PreviewTask[] = [
  { id: "1", key: "HLD-01", title: "هماهنگی برنامه هفته با هم‌تیمی‌ها", priority: "medium", status: "todo", board: "1", project: 1, is_finished: false, is_blocked: false, progress_percent: 0, subtasks_count: 0, order: 0 },
  { id: "2", key: "HLD-02", title: "طراحی گزارش کارکرد تیم و بررسی متن ترکیبی فارسی با API v2", priority: "high", status: "doing", board: "1", project: 1, is_finished: false, is_blocked: true, description: "علت مانع: نمونه داده گزارش هنوز آماده نیست. قدم بعدی: هماهنگی با مسئول گزارش برای دریافت نمونه داده.", progress_percent: 40, subtasks_count: 0, order: 0 },
  { id: "3", key: "HLD-03", title: "بازبینی مسیر شروع همکاری", priority: "low", status: "review", board: "1", project: 1, is_finished: false, is_blocked: false, progress_percent: 90, subtasks_count: 0, order: 0 },
  { id: "4", key: "HLD-04", title: "آماده‌سازی راهنمای هله‌دان", priority: "medium", status: "done", board: "1", project: 1, is_finished: true, is_blocked: false, progress_percent: 100, subtasks_count: 0, order: 0 },
];
const decorate = (task: PreviewTask) => ({ ...task, status_detail: board.statuses.find(status => status.id === task.status) });

export const workspaceHandlers = [
  http.get(`${base}/accounts/profile/`, () => respond({ ...mockProfile, first_name: "سارا", last_name: "دریایی", calendar_preference: "jalali" })),
  http.get(`${base}/organizations/`, () => respond([{ id: "1", name: "تیم هله‌دان", slug: "heledone", status: "active" }])),
  http.get(`${base}/tasks/boards/`, () => respond([board])),
  http.get(`${base}/tasks/`, () => respond(tasks.map(decorate))),
  http.get(`${base}/tasks/comments/`, () => respond([])),
  http.get(`${base}/tasks/checklist-items/`, () => respond([])),
  http.get(`${base}/tasks/:id/activities/`, () => respond([])),
  http.get(`${base}/tasks/:id/`, ({ params }) => respond(decorate(tasks.find(task => task.id === params.id) || tasks[0]))),
  http.patch(`${base}/tasks/:id/`, async ({ request, params }) => {
    const patch = await request.json() as Partial<Task>;
    tasks = tasks.map(task => task.id === params.id ? { ...task, ...patch } : task);
    return respond(decorate(tasks.find(task => task.id === params.id) || tasks[0]));
  }),
  http.get(`${base}/projects/:id/members/`, () => respond(mockProjectMembers)),
  http.get(`${base}/attendance/active-timers/`, () => respond([])),
  http.get(`${base}/finance/my-reports/`, () => respond({
    user_id: "1", total_income: 48000000, total_paid: 32000000, current_balance: 16000000, currency: "IRR",
    projects: [{ project_id: "1", project_name: "وب‌اپ هله‌دان", payment_type: "hourly", rate: 2000000, total_worked_hours: 24, total_earned: 48000000, total_paid: 32000000, current_balance: 16000000, currency: "IRR", salary_override: false }],
  })),
];
