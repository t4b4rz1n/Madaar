import { http, HttpResponse } from "msw";
import { db, mockProfile, mockRoles, mockUsers } from "./db";
import type { UserFormData, UserUpdateData } from "../features/users/types";
import type { DiscountFormData } from "../features/discounts/types";
import type { NotificationFormData } from "../features/notifications/types";
// import type { ProfileUpdateData } from "../features/profile/types";
import type { Ticket, TicketFormData } from "../features/tickets/types";
import { getApiUrl } from "../core/api/config";
import type { TeamFormData, SquadFormData } from "../features/teams/types";
import type { EmployeeDashboard } from "../features/dashboard/types";
import type { ManagerDashboard, ManagerMemberDetail } from "../features/dashboard/types";
import type { TimeOffRequest } from "../features/attendance/types";

const apiUrl = getApiUrl();

const createPaginatedResponse = <T>(
  results: T[],
  page: number,
  pageSize: number,
  requestUrl: string,
) => {
  const totalResults = results.length;
  const totalPages = Math.ceil(totalResults / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedResults = results.slice(startIndex, startIndex + pageSize);

  const baseUrl = requestUrl.split("?")[0];
  const nextPage =
    page < totalPages
      ? `${baseUrl}?page=${page + 1}&page_size=${pageSize}`
      : null;
  const prevPage =
    page > 1 ? `${baseUrl}?page=${page - 1}&page_size=${pageSize}` : null;

  return {
    status: true,
    message: "Success",
    data: {
      current_page: page,
      has_next: page < totalPages,
      has_previous: page > 1,
      next_page: nextPage,
      previous_page: prevPage,
      result_count: paginatedResults.length,
      total_pages: totalPages,
      total_results: totalResults,
      results: paginatedResults,
    },
  };
};

export const handlers = [
  http.get(`${apiUrl}/reports/employee/dashboard/`, () => {
    const dashboard: EmployeeDashboard = {
      upcoming_tasks: [
        {
          id: "task-today-1",
          title: "Review the new onboarding flow",
          priority: "high",
          due_date: new Date().toISOString(),
          status_name: "In progress",
          status_code: "doing",
          project_name: "Madaar Web",
          project_id: "project-1",
        },
        {
          id: "task-today-2",
          title: "Pair with Sarah on API integration",
          priority: "medium",
          due_date: null,
          status_name: "Todo",
          status_code: "todo",
          project_name: "Madaar Web",
          project_id: "project-1",
        },
      ],
      overdue_tasks: [],
      blocked_tasks: [
        {
          id: "task-blocked-1",
          title: "Waiting for design assets",
          priority: "medium",
          due_date: null,
          status_name: "Blocked",
          status_code: "blocked",
          project_name: "Madaar Web",
          project_id: "project-1",
        },
      ],
      today_standup: null,
      weekly_time: { total_seconds: 18_900, total_logs: 8 },
      active_projects: [
        {
          project_id: "project-1",
          project_name: "Madaar Web",
          project_status: "active",
          project_deadline: null,
          allocation_percentage: 80,
        },
      ],
      attendance_today: null,
      active_timers: [],
      upcoming_milestones: [],
    };

    return HttpResponse.json({ status: true, message: "Success", data: dashboard });
  }),

  http.get(`${apiUrl}/reports/manager/dashboard/`, () => {
    const dashboard: ManagerDashboard = {
      team_member_count: 6,
      task_stats: [
        { status_code: "todo", status_name: "To do", count: 12 },
        { status_code: "doing", status_name: "In progress", count: 7 },
        { status_code: "review", status_name: "Review", count: 4 },
        { status_code: "done", status_name: "Done", count: 18 },
      ],
      overdue_summary: {
        total_overdue: 3,
        by_member: [{ username: "sarah_k", first_name: "Sarah", count: 2 }],
      },
      work_hours: [
        { user_id: "member-1", username: "sarah_k", first_name: "Sarah", last_name: "Kerrigan", total_seconds: 108000, total_logs: 12 },
        { user_id: "member-2", username: "jim_raynor", first_name: "Jim", last_name: "Raynor", total_seconds: 86400, total_logs: 10 },
      ],
      members_attendance: [],
      project_summary: [
        { id: "project-1", name: "Madaar Web", status: "active", budget: "24000", budget_currency: "USD", deadline: new Date(Date.now() + 12 * 86400000).toISOString(), active_member_count: 4, total_tasks: 24, done_tasks: 15, total_time_seconds: 194400 },
        { id: "project-2", name: "Mobile launch", status: "active", budget: "18000", budget_currency: "USD", deadline: new Date(Date.now() - 2 * 86400000).toISOString(), active_member_count: 3, total_tasks: 14, done_tasks: 4, total_time_seconds: 108000 },
      ],
    };
    return HttpResponse.json({ status: true, message: "Success", data: dashboard });
  }),

  http.get(`${apiUrl}/reports/manager/members/`, () => {
    const members: ManagerMemberDetail[] = [
      { id: "member-1", username: "sarah_k", first_name: "Sarah", last_name: "Kerrigan", email: "sarah.k@example.com", total_tasks: 9, done_tasks: 6, overdue_tasks: 2, week_seconds: 108000 },
      { id: "member-2", username: "jim_raynor", first_name: "Jim", last_name: "Raynor", email: "jim.r@example.com", total_tasks: 7, done_tasks: 5, overdue_tasks: 0, week_seconds: 86400 },
      { id: "member-3", username: "nova_terra", first_name: "Nova", last_name: "Terra", email: "nova@example.com", total_tasks: 5, done_tasks: 2, overdue_tasks: 1, week_seconds: 64800 },
    ];
    return HttpResponse.json({ status: true, message: "Success", data: members });
  }),

  http.get(`${apiUrl}/attendance/timeoff-requests/`, () => {
    const request: TimeOffRequest = {
      id: "leave-1",
      user: "member-3",
      user_detail: { id: 3, username: "nova_terra", email: "nova@example.com", first_name: "Nova", last_name: "Terra" },
      organization: "org-1",
      request_type: "vacation",
      start_datetime: new Date(Date.now() + 3 * 86400000).toISOString(),
      end_datetime: new Date(Date.now() + 5 * 86400000).toISOString(),
      reason: "A short break after the mobile launch milestone.",
      status: "pending",
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json({ status: true, message: "Success", data: { results: [request] } });
  }),

  http.post(`${apiUrl}/attendance/timeoff-requests/:id/approve/`, () => HttpResponse.json({ status: true, message: "Request approved", data: {} })),
  http.post(`${apiUrl}/attendance/timeoff-requests/:id/reject/`, () => HttpResponse.json({ status: true, message: "Request rejected", data: {} })),

  http.post(`${apiUrl}/auth/login/`, async ({ request }) => {
    interface LoginBody {
      username?: string;
      password?: string;
    }

    const credentials = (await request.json()) as LoginBody;
    const user = mockUsers.find(
      (mockUser) => mockUser.username === credentials.username,
    );

    if (user && credentials.password) {
      // پیدا کردن نقش کاربر از دیتابیس موک
      const userRole = user.role_id
        ? mockRoles.find((r) => r.id === user.role_id)
        : null;
      return HttpResponse.json({
        status: true,
        message: "Login successful",
        data: {
          access: "mock-access-token-jwt-secret-string",
          refresh: "mock-refresh-token-jwt-secret-string",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            is_staff: user.is_staff,
            role_id: user.role_id ?? null,
            role: userRole
              ? {
                  id: userRole.id,
                  name: userRole.name,
                  permissions: userRole.permissions,
                }
              : null,
            profile_image_url: user.profile_image,
          },
        },
      });
    }

    return HttpResponse.json(
      {
        status: false,
        message: "Invalid username or password",
        data: {},
      },
      { status: 400 },
    );
  }),

  http.get("*/panel/users/", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 10;
    const search = url.searchParams.get("search");
    const ordering = url.searchParams.get("ordering");
    const isActive = url.searchParams.get("is_active");
    const isStaff = url.searchParams.get("is_staff");
    const roleId = url.searchParams.get("role_id");

    let users = [...db.users.getAll()];

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.first_name || "").toLowerCase().includes(q) ||
          (u.last_name || "").toLowerCase().includes(q),
      );
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      const activeBool = isActive === "true";
      users = users.filter((u) => u.is_active === activeBool);
    }

    if (isStaff !== null && isStaff !== undefined && isStaff !== "") {
      const staffBool = isStaff === "true";

      users = users.filter((user) => Boolean(user.is_staff) === staffBool);
    }

    if (roleId !== null && roleId !== undefined && roleId !== "") {
      const normalizedRoleId = Number(roleId);

      users = users.filter(
        (user) =>
          user.role_id !== null && Number(user.role_id) === normalizedRoleId,
      );
    }

    if (ordering) {
      const isDesc = ordering.startsWith("-");
      const field = isDesc ? ordering.slice(1) : ordering;

      users.sort((a, b) => {
        let valA = (a as unknown as Record<string, unknown>)[field];
        let valB = (b as unknown as Record<string, unknown>)[field];

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA === undefined || valA === null) return isDesc ? -1 : 1;
        if (valB === undefined || valB === null) return isDesc ? 1 : -1;

        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }

    const response = createPaginatedResponse(
      users,
      page,
      pageSize,
      request.url,
    );

    return HttpResponse.json(response);
  }),

  http.post("*/panel/users/", async ({ request }) => {
    const data = (await request.json()) as UserFormData;

    const exists = db.users
      .getAll()
      .some(
        (user) => user.username === data.username || user.email === data.email,
      );

    if (exists) {
      return HttpResponse.json(
        {
          status: false,
          message: "Username or Email already exists",
          data: {},
        },
        { status: 400 },
      );
    }

    const newUser = db.users.create({
      username: data.username,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      is_active: Boolean(data.is_active),
      is_staff: Boolean(data.is_staff),
      role_id:
        data.role_id === null || data.role_id === undefined
          ? null
          : Number(data.role_id),
      profile_image: null,
    });

    return HttpResponse.json({
      status: true,
      message: "User created successfully",
      data: newUser,
    });
  }),

  http.patch("*/panel/users/:id/", async ({ params, request }) => {
    const id = Number(params.id);
    const data = (await request.json()) as UserUpdateData;

    const updated = db.users.update(id, {
      username: data.username,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      is_active: Boolean(data.is_active),
      is_staff: Boolean(data.is_staff),
      ...(data.role_id !== undefined && {
        role_id: data.role_id === null ? null : Number(data.role_id),
      }),
    });

    if (!updated) {
      return HttpResponse.json(
        {
          status: false,
          message: "User not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "User updated successfully",
      data: updated,
    });
  }),

  http.delete("*/panel/users/:id/", ({ params }) => {
    const id = Number(params.id);
    const success = db.users.delete(id);

    if (!success) {
      return HttpResponse.json(
        {
          status: false,
          message: "User not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "User deleted successfully",
      data: {},
    });
  }),

  http.get("*/panel/discounts", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 10;
    const search = url.searchParams.get("search");
    const ordering = url.searchParams.get("ordering");
    const isActive = url.searchParams.get("is_active");

    let discounts = [...db.discounts.getAll()];

    if (search) {
      const q = search.toLowerCase();
      discounts = discounts.filter(
        (d) =>
          d.code.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q),
      );
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      const activeBool = isActive === "true";
      discounts = discounts.filter((d) => d.is_active === activeBool);
    }

    if (ordering) {
      const isDesc = ordering.startsWith("-");
      const field = isDesc ? ordering.slice(1) : ordering;

      discounts.sort((a, b) => {
        let valA = (a as unknown as Record<string, unknown>)[field];
        let valB = (b as unknown as Record<string, unknown>)[field];

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA === undefined || valA === null) return isDesc ? -1 : 1;
        if (valB === undefined || valB === null) return isDesc ? 1 : -1;

        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }

    const response = createPaginatedResponse(
      discounts,
      page,
      pageSize,
      request.url,
    );

    return HttpResponse.json(response);
  }),

  http.post("*/panel/discounts", async ({ request }) => {
    const data = (await request.json()) as DiscountFormData;

    const exists = db.discounts
      .getAll()
      .some((d) => d.code.toUpperCase() === data.code.toUpperCase());

    if (exists) {
      return HttpResponse.json(
        {
          status: false,
          message: "Discount code already exists",
          data: {},
        },
        { status: 400 },
      );
    }

    const newDiscount = db.discounts.create({
      code: data.code.toUpperCase(),
      description: data.description,
      percent: data.percent,
      max_usage: data.max_usage,
      expiration_date: data.expiration_date,
      is_active: data.is_active,
    });

    return HttpResponse.json({
      status: true,
      message: "Discount coupon created successfully",
      data: newDiscount,
    });
  }),

  http.put("*/panel/discounts/:id/", async ({ params, request }) => {
    const id = params.id as string;
    const data = (await request.json()) as DiscountFormData;

    const updated = db.discounts.update(id, data);

    if (!updated) {
      return HttpResponse.json(
        {
          status: false,
          message: "Discount coupon not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Discount coupon updated successfully",
      data: updated,
    });
  }),

  http.delete("*/panel/discounts/:id/", ({ params }) => {
    const id = params.id as string;
    const success = db.discounts.delete(id);

    if (!success) {
      return HttpResponse.json(
        {
          status: false,
          message: "Discount coupon not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Discount coupon deleted successfully",
      data: {},
    });
  }),

  http.get("*/dashboard/notifications/", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 10;
    const ordering = url.searchParams.get("ordering");

    const notifications = [...db.notifications.getAll()];

    if (ordering) {
      const isDesc = ordering.startsWith("-");
      const field = isDesc ? ordering.slice(1) : ordering;

      notifications.sort((a, b) => {
        let valA = (a as unknown as Record<string, unknown>)[field];
        let valB = (b as unknown as Record<string, unknown>)[field];

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA === undefined || valA === null) return isDesc ? -1 : 1;
        if (valB === undefined || valB === null) return isDesc ? 1 : -1;

        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }

    const response = createPaginatedResponse(
      notifications,
      page,
      pageSize,
      request.url,
    );

    return HttpResponse.json(response);
  }),

  http.post("*/panel/notifications/send-broadcast/", async ({ request }) => {
    const data = (await request.json()) as NotificationFormData;

    const newNotification = db.notifications.create({
      text: data.text,
      link: data.link || "",
    });

    return HttpResponse.json({
      status: true,
      message: "Notification broadcast sent successfully",
      data: newNotification,
    });
  }),

  http.patch("*/accounts/profile/", async ({ request }) => {
    const formData = await request.formData();

    const firstName = formData.get("first_name");
    const lastName = formData.get("last_name");
    const profileImage = formData.get("profile_image");

    if (firstName !== null) {
      mockProfile.first_name = String(firstName);
    }

    if (lastName !== null) {
      mockProfile.last_name = String(lastName);
    }

    if (profileImage instanceof File) {
      mockProfile.profile_image = URL.createObjectURL(profileImage);
    }

    return HttpResponse.json({
      status: true,
      message: "Profile updated successfully",
      data: mockProfile,
    });
  }),

  http.get("*/support/tickets/", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 10;
    const search = url.searchParams.get("search");
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const ordering = url.searchParams.get("ordering");

    let tickets = [...db.tickets.getAll()];

    if (search) {
      const q = search.toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.user.username.toLowerCase().includes(q) ||
          (t.user.email || "").toLowerCase().includes(q),
      );
    }

    if (status) {
      tickets = tickets.filter((t) => t.status === status);
    }

    if (priority) {
      tickets = tickets.filter((t) => t.priority === priority);
    }

    if (ordering) {
      const isDesc = ordering.startsWith("-");
      const field = isDesc ? ordering.slice(1) : ordering;

      tickets.sort((a, b) => {
        let valA: string | number | undefined | null = null;
        let valB: string | number | undefined | null = null;

        if (field === "user") {
          valA = a.user.username.toLowerCase();
          valB = b.user.username.toLowerCase();
        } else {
          const rawA = a[field as keyof Ticket];
          const rawB = b[field as keyof Ticket];

          if (typeof rawA === "string") {
            valA = rawA.toLowerCase();
          } else if (typeof rawA === "number") {
            valA = rawA;
          }

          if (typeof rawB === "string") {
            valB = rawB.toLowerCase();
          } else if (typeof rawB === "number") {
            valB = rawB;
          }
        }

        if (valA === undefined || valA === null) return isDesc ? -1 : 1;
        if (valB === undefined || valB === null) return isDesc ? 1 : -1;

        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }

    const response = createPaginatedResponse(
      tickets,
      page,
      pageSize,
      request.url,
    );

    return HttpResponse.json(response);
  }),

  http.get("*/support/tickets/:id/", ({ params }) => {
    const id = Number(params.id);
    const ticket = db.tickets.getById(id);

    if (!ticket) {
      return HttpResponse.json(
        {
          status: false,
          message: "Ticket not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Success",
      data: ticket,
    });
  }),

  http.post("*/support/tickets/", async ({ request }) => {
    const data = (await request.json()) as TicketFormData;
    const newTicket = db.tickets.create(data);

    return HttpResponse.json({
      status: true,
      message: "Ticket created successfully",
      data: newTicket,
    });
  }),

  http.patch("*/support/tickets/:id/", async ({ params, request }) => {
    const id = Number(params.id);
    const data = (await request.json()) as Partial<Ticket>;
    const updated = db.tickets.update(id, data);

    if (!updated) {
      return HttpResponse.json(
        {
          status: false,
          message: "Ticket not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Ticket updated successfully",
      data: updated,
    });
  }),

  http.get("*/support/tickets/:id/messages/", ({ params, request }) => {
    const id = Number(params.id);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 15;

    const messages = db.tickets.getMessages(id);
    const response = createPaginatedResponse(
      messages,
      page,
      pageSize,
      request.url,
    );

    return HttpResponse.json(response);
  }),

  http.post("*/support/tickets/:id/messages/", async ({ params, request }) => {
    const id = Number(params.id);
    const contentType = request.headers.get("content-type") || "";

    let text = "";
    let mediaUrl: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      text = (formData.get("text") as string) || "";

      const mediaFile = formData.get("media") as File | null;
      if (mediaFile) {
        mediaUrl = URL.createObjectURL(mediaFile);
      }
    } else {
      const body = (await request.json()) as { text?: string };
      text = body.text || "";
    }

    const newMessage = db.tickets.addMessage(id, text, mediaUrl);

    return HttpResponse.json({
      status: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  }),

  http.get("*/support/ticket-types/", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 10;
    const search = url.searchParams.get("search");

    let types = [...db.tickets.ticketTypes.getAll()];

    if (search) {
      const q = search.toLowerCase();
      types = types.filter((t) => t.name.toLowerCase().includes(q));
    }

    const response = createPaginatedResponse(
      types,
      page,
      pageSize,
      request.url,
    );

    return HttpResponse.json(response);
  }),

  http.post("*/support/ticket-types/", async ({ request }) => {
    const data = (await request.json()) as { name: string };
    const newItem = db.tickets.ticketTypes.create(data.name);

    return HttpResponse.json({
      status: true,
      message: "Ticket category created successfully",
      data: newItem,
    });
  }),

  http.put("*/support/ticket-types/:id/", async ({ params, request }) => {
    const id = Number(params.id);
    const data = (await request.json()) as { name: string };
    const updated = db.tickets.ticketTypes.update(id, data.name);

    if (!updated) {
      return HttpResponse.json(
        {
          status: false,
          message: "Ticket category not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Ticket category updated successfully",
      data: updated,
    });
  }),

  http.delete("*/support/ticket-types/:id/", ({ params }) => {
    const id = Number(params.id);
    const success = db.tickets.ticketTypes.delete(id);

    if (!success) {
      return HttpResponse.json(
        {
          status: false,
          message: "Ticket category not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Ticket category deleted successfully",
      data: {},
    });
  }),

  http.get("*/admin-panel/dashboard/overview/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        total_assets: 12450,
        total_vulnerabilities: 348,
        total_templates: 1280,
        total_queued_tasks: 45,
        active_workers: 12,
        scans: {
          discovery: { launched: 245, finished: 240, failed: 5 },
          vulnerability: { launched: 180, finished: 172, failed: 8 },
        },
      },
    });
  }),

  http.get("*/admin-panel/dashboard/queues/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        queues: [
          { queue_name: "Discovery Queue", pending_tasks: 15 },
          { queue_name: "Vulnerability Queue", pending_tasks: 22 },
          { queue_name: "Web Scans Queue", pending_tasks: 8 },
        ],
      },
    });
  }),

  http.get("*/admin-panel/dashboard/workers/resources/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        workers_resources: {
          "Worker-01": [
            { label: "10:00", cpu: 45, memory: 55 },
            { label: "10:10", cpu: 60, memory: 58 },
            { label: "10:20", cpu: 35, memory: 62 },
            { label: "10:30", cpu: 70, memory: 64 },
            { label: "10:40", cpu: 50, memory: 60 },
          ],
          "Worker-02": [
            { label: "10:00", cpu: 30, memory: 40 },
            { label: "10:10", cpu: 42, memory: 41 },
            { label: "10:20", cpu: 55, memory: 45 },
            { label: "10:30", cpu: 28, memory: 48 },
            { label: "10:40", cpu: 62, memory: 50 },
          ],
        },
        labels: ["10:00", "10:10", "10:20", "10:30", "10:40"],
      },
    });
  }),

  http.get("*/admin-panel/dashboard/workers/growth/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        worker_growth: [
          { label: "Jan", value: 2 },
          { label: "Feb", value: 4 },
          { label: "Mar", value: 6 },
          { label: "Apr", value: 8 },
          { label: "May", value: 10 },
          { label: "Jun", value: 12 },
        ],
      },
    });
  }),

  http.get("*/admin-panel/dashboard/vulnerabilities/growth/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        vulnerability_discovery: [
          { label: "Jan", value: 120 },
          { label: "Feb", value: 180 },
          { label: "Mar", value: 140 },
          { label: "Apr", value: 210 },
          { label: "May", value: 190 },
          { label: "Jun", value: 348 },
        ],
      },
    });
  }),

  http.get("*/admin-panel/dashboard/vulnerabilities/severities/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        severity_posture: [
          { severity: "critical", count: 24 },
          { severity: "high", count: 68 },
          { severity: "medium", count: 112 },
          { severity: "low", count: 94 },
          { severity: "info", count: 50 },
        ],
      },
    });
  }),

  http.get("*/admin-panel/dashboard/assets/growth/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        asset_growth: [
          { label: "Jan", value: 5000 },
          { label: "Feb", value: 6200 },
          { label: "Mar", value: 7800 },
          { label: "Apr", value: 9100 },
          { label: "May", value: 11000 },
          { label: "Jun", value: 12450 },
        ],
      },
    });
  }),

  http.get("*/admin-panel/dashboard/scans/throughput/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        scan_throughput: [
          { label: "Mon", requests: 1200, results: 85 },
          { label: "Tue", requests: 1500, results: 120 },
          { label: "Wed", requests: 1800, results: 160 },
          { label: "Thu", requests: 1400, requests_v: 95 },
          { label: "Fri", requests: 2100, results: 190 },
          { label: "Sat", requests: 800, results: 40 },
          { label: "Sun", requests: 950, results: 55 },
        ],
      },
    });
  }),

  http.get("*/admin-panel/dashboard/scans/status/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        scan_status_breakdown: [
          { status: "completed", count: 312 },
          { status: "running", count: 14 },
          { status: "failed", count: 8 },
          { status: "cancelled", count: 5 },
        ],
      },
    });
  }),

  http.get("*/admin-panel/dashboard/templates/growth/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        template_growth: [
          { label: "Jan", value: 400 },
          { label: "Feb", value: 580 },
          { label: "Mar", value: 720 },
          { label: "Apr", value: 900 },
          { label: "May", value: 1100 },
          { label: "Jun", value: 1280 },
        ],
      },
    });
  }),

  http.get("*/admin-panel/dashboard/users/registrations/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        user_registrations: [
          { label: "Jan", value: 150 },
          { label: "Feb", value: 220 },
          { label: "Mar", value: 310 },
          { label: "Apr", value: 450 },
          { label: "May", value: 680 },
          { label: "Jun", value: 890 },
        ],
      },
    });
  }),

  http.get("*/admin-panel/dashboard/licenses/distribution/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        license_distribution: [
          { name: "Free", value: 450, color: "#a855f7" },
          { name: "Pro", value: 320, color: "#3b82f6" },
          { name: "Enterprise", value: 120, color: "#10b981" },
        ],
      },
    });
  }),

  http.get("*/admin-panel/dashboard/teams/active/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        top_teams: [
          { label: "Alpha Team", value: 145 },
          { label: "SecOps", value: 120 },
          { label: "Dev Team B", value: 98 },
          { label: "Platform", value: 85 },
          { label: "Audit Org", value: 62 },
        ],
      },
    });
  }),

  http.get("*/roles/", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 10;
    const search = url.searchParams.get("search");
    const isActive = url.searchParams.get("is_active");

    let roles = [...db.roles.getAll()];

    if (search) {
      const q = search.toLowerCase();
      roles = roles.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q),
      );
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      const activeBool = isActive === "true";
      roles = roles.filter((r) => r.is_active === activeBool);
    }

    const response = createPaginatedResponse(
      roles,
      page,
      pageSize,
      request.url,
    );

    return HttpResponse.json(response);
  }),

  http.post("*/roles/", async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      is_active?: boolean;
      is_staff?: boolean;
      permissions?: string[];
    };

    if (!body?.name?.trim()) {
      return HttpResponse.json(
        {
          status: false,
          message: "Role name is required",
          data: {},
        },
        { status: 400 },
      );
    }

    const exists = db.roles
      .getAll()
      .some((r) => r.name.toLowerCase() === body.name.trim().toLowerCase());

    if (exists) {
      return HttpResponse.json(
        {
          status: false,
          message: "Role name already exists",
          data: {},
        },
        { status: 400 },
      );
    }

    const newRole = db.roles.create({
      name: body.name.trim(),
      description: body.description?.trim?.() ?? "",
      is_active: body.is_active ?? true,
      is_staff: body.is_staff ?? false,
      permissions: body.permissions ?? [],
    });

    return HttpResponse.json(
      {
        status: true,
        message: "Role created successfully",
        data: newRole,
      },
      { status: 201 },
    );
  }),

  http.delete("*/roles/:id/", ({ params }) => {
    const id = Number(params.id);
    const success = db.roles.delete(id);

    if (!success) {
      return HttpResponse.json(
        {
          status: false,
          message: "Role not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.patch("*/roles/:id/", async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      is_active?: boolean;
      is_staff?: boolean;
      permissions?: string[];
    };

    const role = db.roles.getById(id);

    if (!role) {
      return HttpResponse.json(
        {
          status: false,
          message: "Role not found",
          data: {},
        },
        { status: 404 },
      );
    }

    const updatedRole = db.roles.update(id, {
      name: body.name !== undefined ? body.name.trim() : role.name,
      description:
        body.description !== undefined
          ? body.description.trim()
          : (role.description ?? ""),
      is_active: body.is_active !== undefined ? body.is_active : role.is_active,
      is_staff: body.is_staff !== undefined ? body.is_staff : role.is_staff,
      permissions:
        body.permissions !== undefined ? body.permissions : role.permissions,
    });

    return HttpResponse.json(
      {
        status: true,
        message: "Role updated successfully",
        data: updatedRole,
      },
      { status: 200 },
    );
  }),
  // --- Teams MSW Handlers ---
  http.get("*/panel/teams/", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 10;
    const search = url.searchParams.get("search");
    const ordering = url.searchParams.get("ordering");
    const isActive = url.searchParams.get("is_active");

    let teams = [...db.teams.getAll()];

    // Filter by team name and description
    if (search) {
      const q = search.toLowerCase();
      teams = teams.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q),
      );
    }

    // Filter by active/inactive status
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      const activeBool = isActive === "true";
      teams = teams.filter((t) => t.is_active === activeBool);
    }

    // Sorting
    if (ordering) {
      const isDesc = ordering.startsWith("-");
      const field = isDesc ? ordering.slice(1) : ordering;

      teams.sort((a, b) => {
        let valA = (a as unknown as Record<string, unknown>)[field];
        let valB = (b as unknown as Record<string, unknown>)[field];

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA === undefined || valA === null) return isDesc ? -1 : 1;
        if (valB === undefined || valB === null) return isDesc ? 1 : -1;

        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }

    // Enrich with lead info, squad count, and member count
    const detailedTeams = teams.map((team) => {
      const lead = team.lead_id ? db.users.getById(team.lead_id) : null;
      const squadsCount = db.squads.getByTeamId(team.id).length;
      // Team members are simulated based on users in this team's squads or the team lead
      // For simplicity, we currently simulate member count using other filters or a fixed number
      const membersCount = lead ? 3 : 0;

      return {
        ...team,
        lead,
        squads_count: squadsCount,
        members_count: membersCount,
      };
    });

    const response = createPaginatedResponse(
      detailedTeams,
      page,
      pageSize,
      request.url,
    );

    return HttpResponse.json(response);
  }),

  http.post("*/panel/teams/", async ({ request }) => {
    const data = (await request.json()) as TeamFormData;

    // Check for duplicate team name
    const exists = db.teams
      .getAll()
      .some((t) => t.name.toLowerCase() === data.name.trim().toLowerCase());

    if (exists) {
      return HttpResponse.json(
        {
          status: false,
          message: "A team with this name already exists",
          data: {},
        },
        { status: 400 },
      );
    }

    const newTeam = db.teams.create({
      name: data.name.trim(),
      description: data.description || "",
      lead_id: data.lead_id ?? null,
      is_active: Boolean(data.is_active),
    });

    return HttpResponse.json({
      status: true,
      message: "Team created successfully",
      data: newTeam,
    });
  }),

  http.patch("*/panel/teams/:id/", async ({ params, request }) => {
    const id = Number(params.id);
    const data = (await request.json()) as Partial<TeamFormData>;

    const updated = db.teams.update(id, data);

    if (!updated) {
      return HttpResponse.json(
        {
          status: false,
          message: "Team not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Team updated successfully",
      data: updated,
    });
  }),

  http.delete("*/panel/teams/:id/", ({ params }) => {
    const id = Number(params.id);
    const success = db.teams.delete(id);

    if (!success) {
      return HttpResponse.json(
        {
          status: false,
          message: "Team not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Team and its sub-squads deleted successfully",
      data: {},
    });
  }),

  // --- Squads MSW Handlers ---
  http.get("*/panel/squads/", ({ request }) => {
    const url = new URL(request.url);
    const teamId = url.searchParams.get("team_id");

    let squads = [...db.squads.getAll()];

    if (teamId) {
      squads = squads.filter((s) => s.team_id === Number(teamId));
    }

    return HttpResponse.json({
      status: true,
      message: "Success",
      data: squads,
    });
  }),

  http.post("*/panel/squads/", async ({ request }) => {
    const data = (await request.json()) as SquadFormData;

    const exists = db.squads
      .getAll()
      .some(
        (s) =>
          s.team_id === data.team_id &&
          s.name.toLowerCase() === data.name.trim().toLowerCase(),
      );

    if (exists) {
      return HttpResponse.json(
        {
          status: false,
          message: "A squad with this name already exists in this team",
          data: {},
        },
        { status: 400 },
      );
    }

    const newSquad = db.squads.create({
      team_id: data.team_id,
      name: data.name.trim(),
      description: data.description || "",
      is_active: Boolean(data.is_active),
    });

    return HttpResponse.json({
      status: true,
      message: "Squad created successfully",
      data: newSquad,
    });
  }),

  http.patch("*/panel/squads/:id/", async ({ params, request }) => {
    const id = Number(params.id);
    const data = (await request.json()) as Partial<SquadFormData>;

    const updated = db.squads.update(id, data);

    if (!updated) {
      return HttpResponse.json(
        {
          status: false,
          message: "Squad not found",
          data: {},
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Squad updated successfully",
      data: updated,
    });
  }),

  http.delete("*/panel/squads/:id/", ({ params }) => {
    const id = Number(params.id);
    const success = db.squads.delete(id);

    if (!success) {
      return HttpResponse.json(
        {
          status: false,
          message: "Squad not found",
          errors: null,
          data: null,
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Squad deleted successfully",
      data: null,
    });
  }),
  // ==========================================
  // --- Projects MSW Handlers ---
  // ==========================================

  // --- Projects Core API ---
  http.get("*/api/v1/projects/", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 10;

    const projects = [...db.projects.getAll()];

    const response = createPaginatedResponse(
      projects,
      page,
      pageSize,
      request.url,
    );
    return HttpResponse.json(response);
  }),

  http.get("*/api/v1/projects/:id/", ({ params }) => {
    const { id } = params;
    const project = db.projects.getById(id as string);
    if (!project) {
      return HttpResponse.json(
        { status: false, message: "Project not found", data: {} },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      status: true,
      message: "Success",
      data: project,
    });
  }),

  http.post("*/api/v1/projects/", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newProject = db.projects.create(body);
    return HttpResponse.json(
      {
        status: true,
        message: "Project created successfully",
        data: newProject,
      },
      { status: 201 },
    );
  }),

  http.put("*/api/v1/projects/:id/", async ({ request, params }) => {
    const { id } = params;
    const body = (await request.json()) as Record<string, unknown>;
    const updated = db.projects.update(id as string, body);
    if (!updated) {
      return HttpResponse.json(
        { status: false, message: "Project not found", data: {} },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      status: true,
      message: "Project updated successfully",
      data: updated,
    });
  }),

  http.patch("*/api/v1/projects/:id/", async ({ request, params }) => {
    const { id } = params;
    const body = (await request.json()) as Record<string, unknown>;
    const updated = db.projects.update(id as string, body);
    if (!updated) {
      return HttpResponse.json(
        { status: false, message: "Project not found", data: {} },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      status: true,
      message: "Project updated successfully",
      data: updated,
    });
  }),

  http.delete("*/api/v1/projects/:id/", ({ params }) => {
    const { id } = params;
    const success = db.projects.delete(id as string);
    if (!success) {
      return HttpResponse.json(
        { status: false, message: "Project not found", data: {} },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      status: true,
      message: "Project deleted successfully",
      data: {},
    });
  }),

  http.post("*/api/v1/projects/:id/archive/", ({ params }) => {
    const { id } = params;
    const archived = db.projects.archive(id as string);
    if (!archived) {
      return HttpResponse.json(
        { status: false, message: "Project not found", data: {} },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      status: true,
      message: "Project archived",
      data: archived,
    });
  }),

  http.post("*/api/v1/projects/:id/complete/", ({ params }) => {
    const { id } = params;
    const completed = db.projects.complete(id as string);
    if (!completed) {
      return HttpResponse.json(
        { status: false, message: "Project not found", data: {} },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      status: true,
      message: "Project completed",
      data: completed,
    });
  }),

  // --- Project Members API ---
  http.get("*/api/v1/projects/:project_pk/members/", ({ params }) => {
    const { project_pk } = params;
    const members = db.projects.members.getAll(project_pk as string);
    return HttpResponse.json({
      status: true,
      message: "Success",
      data: members,
    });
  }),

  http.post(
    "*/api/v1/projects/:project_pk/members/",
    async ({ request, params }) => {
      const { project_pk } = params;
      const body = (await request.json()) as Record<string, unknown>;
      const newMember = db.projects.members.add(project_pk as string, body);
      return HttpResponse.json(
        { status: true, message: "Member added", data: newMember },
        { status: 201 },
      );
    },
  ),

  // --- Project Milestones API ---
  http.get("*/api/v1/projects/:project_pk/milestones/", ({ params }) => {
    const { project_pk } = params;
    const milestones = db.projects.milestones.getAll(project_pk as string);
    return HttpResponse.json({
      status: true,
      message: "Success",
      data: milestones,
    });
  }),

  http.post(
    "*/api/v1/projects/:project_pk/milestones/",
    async ({ request, params }) => {
      const { project_pk } = params;
      const body = (await request.json()) as Record<string, unknown>;
      const newMilestone = db.projects.milestones.create(
        project_pk as string,
        body,
      );
      return HttpResponse.json(
        { status: true, message: "Milestone created", data: newMilestone },
        { status: 201 },
      );
    },
  ),

  // --- Project Activities API ---
  http.get("*/api/v1/projects/:project_pk/activities/", ({ params }) => {
    const { project_pk } = params;
    const activities = db.projects.activities.getAll(project_pk as string);
    return HttpResponse.json({
      status: true,
      message: "Success",
      data: activities,
    });
  }),
];
