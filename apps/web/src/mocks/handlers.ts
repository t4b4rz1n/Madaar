import { http, HttpResponse } from "msw";
import { db, mockProfile } from "./db";
import type { UserFormData, UserUpdateData } from "../features/users/types";
import type { DiscountFormData } from "../features/discounts/types";
import type { NotificationFormData } from "../features/notifications/types";
import type { ProfileUpdateData } from "../features/profile/types";
import type { Ticket, TicketFormData } from "../features/tickets/types";

const createPaginatedResponse = <T>(
  results: T[],
  page: number,
  pageSize: number,
  requestUrl: string
) => {
  const totalResults = results.length;
  const totalPages = Math.ceil(totalResults / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const paginatedResults = results.slice(startIndex, startIndex + pageSize);

  const baseUrl = requestUrl.split("?")[0];
  const nextPage = page < totalPages ? `${baseUrl}?page=${page + 1}&page_size=${pageSize}` : null;
  const prevPage = page > 1 ? `${baseUrl}?page=${page - 1}&page_size=${pageSize}` : null;

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
  http.post("*/auth/login/", async ({ request }) => {
    interface LoginBody {
      username?: string;
      password?: string;
    }
    const credentials = (await request.json()) as LoginBody;

    if (credentials.username && credentials.password) {
      return HttpResponse.json({
        status: true,
        message: "Login successful",
        data: {
          access: "mock-access-token-jwt-secret-string",
          refresh: "mock-refresh-token-jwt-secret-string",
          user: mockProfile,
        },
      });
    }

    return HttpResponse.json(
      {
        status: false,
        message: "Invalid username or password",
        data: {},
      },
      { status: 400 }
    );
  }),

  http.get("*/panel/users", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 10;
    const search = url.searchParams.get("search");
    const ordering = url.searchParams.get("ordering");
    const isActive = url.searchParams.get("is_active");
    const isStaff = url.searchParams.get("is_staff");

    let users = [...db.users.getAll()];

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.first_name || "").toLowerCase().includes(q) ||
          (u.last_name || "").toLowerCase().includes(q)
      );
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      const activeBool = isActive === "true";
      users = users.filter((u) => u.is_active === activeBool);
    }

    if (isStaff !== null && isStaff !== undefined && isStaff !== "") {
      const staffBool = isStaff === "true";
      users = users.filter((u) => u.is_staff === staffBool);
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

    const response = createPaginatedResponse(users, page, pageSize, request.url);
    return HttpResponse.json(response);
  }),

  http.post("*/panel/users/", async ({ request }) => {
    const data = (await request.json()) as UserFormData;

    const exists = db.users.getAll().some(
      (u) => u.username === data.username || u.email === data.email
    );

    if (exists) {
      return HttpResponse.json(
        {
          status: false,
          message: "Username or Email already exists",
          data: {},
        },
        { status: 400 }
      );
    }

    const newUser = db.users.create({
      username: data.username,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      is_active: data.is_active,
      is_staff: data.is_staff,
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

    const updated = db.users.update(id, data);
    if (!updated) {
      return HttpResponse.json(
        {
          status: false,
          message: "User not found",
          data: {},
        },
        { status: 404 }
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
        { status: 404 }
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
          d.description.toLowerCase().includes(q)
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

    const response = createPaginatedResponse(discounts, page, pageSize, request.url);
    return HttpResponse.json(response);
  }),

  http.post("*/panel/discounts", async ({ request }) => {
    const data = (await request.json()) as DiscountFormData;

    const exists = db.discounts.getAll().some(
      (d) => d.code.toUpperCase() === data.code.toUpperCase()
    );

    if (exists) {
      return HttpResponse.json(
        {
          status: false,
          message: "Discount code already exists",
          data: {},
        },
        { status: 400 }
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
        { status: 404 }
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
        { status: 404 }
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Discount coupon deleted successfully",
      data: {},
    });
  }),

  http.get("*/panel/feedbacks", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("page_size")) || 10;
    const search = url.searchParams.get("search");
    const ordering = url.searchParams.get("ordering");

    let feedbacks = [...db.feedbacks.getAll()];

    if (search) {
      const q = search.toLowerCase();
      feedbacks = feedbacks.filter(
        (f) =>
          f.user.toLowerCase().includes(q) ||
          f.subject.toLowerCase().includes(q) ||
          f.text.toLowerCase().includes(q)
      );
    }

    if (ordering) {
      const isDesc = ordering.startsWith("-");
      const field = isDesc ? ordering.slice(1) : ordering;
      feedbacks.sort((a, b) => {
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

    const response = createPaginatedResponse(feedbacks, page, pageSize, request.url);
    return HttpResponse.json(response);
  }),

  http.delete("*/panel/feedbacks/:id/", ({ params }) => {
    const id = params.id as string;
    const success = db.feedbacks.delete(id);

    if (!success) {
      return HttpResponse.json(
        {
          status: false,
          message: "Feedback submission not found",
          data: {},
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Feedback deleted successfully",
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
      request.url
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
    const data = (await request.json()) as ProfileUpdateData;

    if (data.first_name !== undefined) mockProfile.first_name = data.first_name;
    if (data.last_name !== undefined) mockProfile.last_name = data.last_name;

    return HttpResponse.json({
      status: true,
      message: "Profile updated successfully",
      data: mockProfile,
    });
  }),

  // ─── Tickets MSW Mocks ───────────────────────────────────────────────────────
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
          (t.user.email || "").toLowerCase().includes(q)
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

    const response = createPaginatedResponse(tickets, page, pageSize, request.url);
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
        { status: 404 }
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
        { status: 404 }
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
    const response = createPaginatedResponse(messages, page, pageSize, request.url);
    return HttpResponse.json(response);
  }),

  http.post("*/support/tickets/:id/messages/", async ({ params, request }) => {
    const id = Number(params.id);
    
    // Check if multipart/form-data (file upload)
    const contentType = request.headers.get("content-type") || "";
    let text = "";
    let mediaUrl: string | undefined = undefined;

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

    const response = createPaginatedResponse(types, page, pageSize, request.url);
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
        { status: 404 }
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
        { status: 404 }
      );
    }

    return HttpResponse.json({
      status: true,
      message: "Ticket category deleted successfully",
      data: {},
    });
  }),

  // --- Dashboard Mock Endpoints ---
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
          vulnerability: { launched: 180, finished: 172, failed: 8 }
        }
      }
    });
  }),

  http.get("*/admin-panel/dashboard/queues/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        queues: [
          { queue_name: "Discovery Queue", pending_tasks: 15 },
          { queue_name: "Vulnerability Queue", pending_tasks: 22 },
          { queue_name: "Web Scans Queue", pending_tasks: 8 }
        ]
      }
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
            { label: "10:40", cpu: 50, memory: 60 }
          ],
          "Worker-02": [
            { label: "10:00", cpu: 30, memory: 40 },
            { label: "10:10", cpu: 42, memory: 41 },
            { label: "10:20", cpu: 55, memory: 45 },
            { label: "10:30", cpu: 28, memory: 48 },
            { label: "10:40", cpu: 62, memory: 50 }
          ]
        },
        labels: ["10:00", "10:10", "10:20", "10:30", "10:40"]
      }
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
          { label: "Jun", value: 12 }
        ]
      }
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
          { label: "Jun", value: 348 }
        ]
      }
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
          { severity: "info", count: 50 }
        ]
      }
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
          { label: "Jun", value: 12450 }
        ]
      }
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
          { label: "Sun", requests: 950, results: 55 }
        ]
      }
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
          { status: "cancelled", count: 5 }
        ]
      }
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
          { label: "Jun", value: 1280 }
        ]
      }
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
          { label: "Jun", value: 890 }
        ]
      }
    });
  }),

  http.get("*/admin-panel/dashboard/licenses/distribution/", () => {
    return HttpResponse.json({
      status: true,
      data: {
        license_distribution: [
          { name: "Free", value: 450, color: "#a855f7" },
          { name: "Pro", value: 320, color: "#3b82f6" },
          { name: "Enterprise", value: 120, color: "#10b981" }
        ]
      }
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
          { label: "Audit Org", value: 62 }
        ]
      }
    });
  }),
];
