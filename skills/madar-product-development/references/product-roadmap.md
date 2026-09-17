# Madaar product roadmap

This is the distilled implementation contract from `مدار.docx`. The source document is a North Star PRD, not a promise that all modules belong in the first release.

## Product intent

Madaar is an internal operating system for teams: structured work management, async communication, time visibility, healthy focus, recognition, and measurable organizational growth around a shared company core.

## Delivery phases

| Phase | Goal | Modules |
|---|---|---|
| 1 — Core MVP | Move daily work and time tracking into the platform | Identity & organization; projects; tasks/Kanban; basic time & attendance; base dashboards; essential notifications |
| 2 — Operations & Motivation | Increase adoption and automate operational workflows | Gamification; payroll/bonus; requests; performance; culture; global search; Git integrations |
| 3 — Enterprise & Analytics | Add intelligence, planning, knowledge, and organizational maturity | OKRs; knowledge wiki; wellbeing; resource planning; project health; advanced dashboards and automation |

## The 18 product modules

1. **Core identity & organization** — employee profiles, work-style profile, RBAC, roles, teams/squads, org chart, onboarding and offboarding.
2. **Project management** — projects, budgets, deadlines, members, resource allocation, capacity, milestones, activity feed and timeline.
3. **Task management** — tasks, priorities, statuses, assignees, subtasks, checklists, dependencies, blocked/waiting state, Kanban, comments, attachments, activity log and async standups.
4. **Time & attendance** — live task timer, manual logs, timesheets, check-in/out, leave, remote work, overtime and holidays.
5. **Gamification & recognition** — badges, points engine, leaderboards, quests, bug bounty, peer kudos, mentorship challenges, reward store and bonus conversion.
6. **Performance management** — review cycles, 360 reviews, KPIs, growth reports and skill matrix.
7. **OKR & goals** — company, team and personal objectives, progress and alignment from daily work to strategic goals.
8. **Payroll & finance** — salary models, payroll engine, bonuses, payslips, expenses and reimbursement workflow.
9. **Requests center** — leave, remote work, equipment and expense requests with approval workflow and history.
10. **Communication & culture** — anonymous feedback, suggestions, scoring, announcements and multi-channel notifications.
11. **Knowledge management** — wiki, technical docs, coding standards, architecture/setup guides, lessons learned, solution bank, upvotes, knowledge rewards and smart search.
12. **Wellbeing & focus** — focus/Pomodoro, silent notifications, mood tracking, burnout monitoring and team mood analytics.
13. **Reporting & analytics** — employee, manager and executive dashboards.
14. **Resource planning** — team/individual capacity, utilization, overload detection, available resources and future allocation.
15. **Project health** — risk engine, burn-down, sprint health, delay prediction and delivery forecast.
16. **Notification & automation** — event system, notification rules, Telegram/email, scheduled jobs and workflow automation.
17. **Global search** — permission-aware search, filters and full-text search across users, projects, tasks, comments, docs and feedback.
18. **Developer integrations** — GitHub/GitLab, commit logs, commit links, webhook handling and auto-close/transition through merge events.

## Role expectations

- **Employee:** see assigned projects/tasks, update permitted task state, log time, submit standups/requests, manage profile and personal focus/mood data.
- **Team lead/manager:** manage team/project work, assign tasks, inspect activity and dependency graphs, review timesheets, approve requests, and view team dashboards.
- **Organization owner/admin:** manage organization-wide users, roles, teams, policies, announcements, automations and executive visibility.
- **HR/accounting:** access only the domains granted by role; finance/payroll and employee data must never be exposed through frontend-only guards.

## Current repository alignment

Already present in the repository: authentication/accounts, organizations/teams, projects/members/milestones/activity, task Kanban/subtasks/checklists/comments/activity/standups, timer and attendance foundations, notifications/automations, reports foundations, and panel/support/billing foundations.

Partially present or incomplete relative to the PRD: resource allocation/capacity, project timeline/Gantt, true task dependency entities, labels, richer dashboard views, request workflows, and full i18n in the frontend. Not yet represented as complete product modules: gamification, payroll, performance, OKR, knowledge, wellbeing analytics, global search, project-health forecasting, and Git integrations.

## Integration seams to preserve

- `Task` ↔ `TimeLog` is the first operational event seam; future points, payroll, project health, and reporting should consume recorded events rather than duplicate time logic.
- Project and organization membership are the access-control boundary for tasks, time, reports and notifications.
- Activity/event records are the audit seam for notifications, analytics, automation and future integrations.
- Keep financial calculations separate from task/time UI and place them behind services and immutable/auditable records.
