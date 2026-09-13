export const buildNotificationLink = (linkStr: string | null | undefined): string => {
  if (!linkStr) return "/";

  // If it's a normal link (e.g., from old notifications), return it as is
  if (!linkStr.startsWith("/_routing")) return linkStr;

  try {
    const params = new URLSearchParams(linkStr.split("?")[1]);
    const eventType = params.get("e") || params.get("event_type");
    const projectId = params.get("p") || params.get("project_id");
    const taskId = params.get("t") || params.get("task_id");
    const boardId = params.get("b") || params.get("board_id");
    const organizationId = params.get("o") || params.get("organization_id");

    switch (eventType) {
      case "task_assigned":
      case "task_needs_review":
      case "task_completed":
      case "task_deadline_approaching":
      case "user_mentioned":
      case "task_commented":
      case "task_created":
      case "timer_started":
        if (taskId && projectId) return `/tasks?project=${projectId}&board=${boardId || ""}&task=${taskId}`;
        break;

      case "member_added_to_project":
        if (projectId) return `/projects/${projectId}?tab=members`;
        break;

      case "member_added_to_org":
      case "you_added_to_org":
      case "project_member_removed":
        return "/projects";

      case "milestone_approaching":
      case "milestone_completed":
      case "milestone_created":
        if (projectId) return `/projects/${projectId}?tab=milestones`;
        break;

      case "project_created":
      case "project_actually_created":
      case "project_over_budget":
      case "project_budget_set":
        if (projectId) return `/projects/${projectId}`;
        break;

      case "board_created":
        if (projectId && boardId) return `/tasks?project=${projectId}&board=${boardId}`;
        if (projectId) return `/tasks?project=${projectId}`;
        break;

      case "standup_submitted":
        return "/standups";

      case "leave_requested":
      case "leave_resolved":
        return "/attendance?tab=timeoff";

      case "organization_created":
        if (organizationId) return `/organizations/${organizationId}`;
        break;
    }

    // Fallbacks
    if (taskId && projectId) return `/tasks?project=${projectId}&board=${boardId || ""}&task=${taskId}`;
    if (projectId) return `/projects/${projectId}`;
    if (organizationId) return `/organizations/${organizationId}`;

    return "/";
  } catch (error) {
    console.error("Error parsing notification routing link:", error);
    return "/";
  }
};
