import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardCheck, CircleDashed, Clock3, Hourglass, MoreVertical, Monitor, Square, CalendarDays, ChevronLeft, FileText, Code2, FlaskConical, Megaphone, Hand, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslation, formatNumber, formatRelativeTime, useLocale } from "../../../i18n/locale";
import { formatDisplayDate } from "../../../utils/date";
import { getEmployeeDashboard } from "../api/dashboardApi";
import { getTimeOffRequests, stopTimer } from "../../attendance/api/attendanceApi";
import { getProjects, getProjectMembers } from "../../projects/api/projectsApi";
import { getNotificationHistory } from "../../notifications/api/notificationsApi";
import { buildNotificationLink } from "../../notifications/utils/routing";
import { useAuthStore } from "../../auth/store/authStore";
import { getErrorMessage } from "../../../core/utils/errorHandler";
import ApiService from "../../../core/api/apiService";
import type { EmployeeTaskSummary } from "../types";
import type { ProjectMember } from "../../projects/types";
import "../home.css";

const asset = "/images/heledone-assets/";
const avatar = (id: number) => asset + `avatar-${String(id).padStart(2, "0")}.png`;
const taskLink = (task: EmployeeTaskSummary) => `/tasks?project=${encodeURIComponent(task.project_id ?? "")}&board=${encodeURIComponent(task.board_id ?? "")}&task=${encodeURIComponent(task.id)}`;

export const UserDashboardPage = () => {
  const t = useTranslation(); const locale = useLocale();
  const user = useAuthStore((s) => s.user); const queryClient = useQueryClient();
  const [week, setWeek] = useState(false); const [liveNow, setLiveNow] = useState(Date.now());
  const dashboard = useQuery({ queryKey: ["home-dashboard", user?.id, locale], queryFn: () => getEmployeeDashboard(Intl.DateTimeFormat().resolvedOptions().timeZone), enabled: !!user?.id });
  const projectQuery = useQuery({ queryKey: ["home-projects", user?.id, locale], queryFn: () => getProjects(), enabled: !!user?.id });
  const requests = useQuery({ queryKey: ["home-requests", user?.id, locale], queryFn: () => getTimeOffRequests({ user: user?.id }), enabled: !!user?.id });
  const news = useQuery({ queryKey: ["home-news", user?.id, locale], queryFn: async () => (await getNotificationHistory(new URLSearchParams("page_size=5"))).data.results, enabled: !!user?.id });
  const projects = useMemo(() => [...(projectQuery.data ?? [])].filter((project) => project.status !== "archived").sort((a,b) => (b.progress_percentage ?? 0) - (a.progress_percentage ?? 0)).slice(0, 2), [projectQuery.data]);
  const projectMembers = useQuery({ queryKey: ["home-project-members", projects.map((project) => project.id).join(",")], queryFn: async () => Promise.all(projects.map((project) => getProjectMembers(project.id))), enabled: projects.length > 0 });
  useEffect(() => { const interval = window.setInterval(() => setLiveNow(Date.now()), 1000); return () => window.clearInterval(interval); }, []);
  const realTasks = useMemo(() => Array.from(new Map([...(dashboard.data?.overdue_tasks ?? []), ...(dashboard.data?.upcoming_tasks ?? [])].map((task) => [task.id, task])).values()), [dashboard.data]);
  const today = new Date().toDateString();
  const weekEnd = Date.now() + 7 * 86400000;
  const todayTasks = realTasks.filter((task) => {
    if (!task.due_date) return true;
    const due = new Date(task.due_date);
    return due.toDateString() === today || due.getTime() < Date.now();
  });
  const tasks = week ? realTasks.filter((task) => !task.due_date || new Date(task.due_date).getTime() <= weekEnd) : todayTasks;
  const formatNews = (message: string) => {
    const created = message.match(/^New Task Created! Task: (.+?) Project: (.+)$/);
    if (created) return { heading: t("تسک جدید ایجاد شد"), detail: `${created[1]} · ${created[2]}` };
    const assigned = message.match(/^A new task has been assigned to you! Task: (.+?) By: (.+)$/);
    if (assigned) return { heading: t("تسک جدید به شما واگذار شد"), detail: assigned[1] };
    const standup = message.match(/^Daily Stand-up Report Your colleague (.+) has submitted their daily standup report\.$/);
    if (standup) return { heading: t("گزارش روزانه ثبت شد"), detail: t("{name} گزارش روزانه‌اش را ثبت کرد", { name: standup[1] }) };
    return { heading: message, detail: "" };
  };
  const statusLabel = (task: EmployeeTaskSummary) => task.status_code === "in_progress" || task.status_code === "doing" ? t("در حال انجام") : task.status_code === "review" || task.status_code === "in_review" ? t("در حال بررسی") : task.status_code === "done" ? t("انجام‌شده") : task.status_code === "todo" || task.status_code === "to_do" ? t("برای انجام") : task.status_name ?? t("برای انجام");
  const statusClass = (task: EmployeeTaskSummary) => task.status_code === "doing" ? "in_progress" : task.status_code === "to_do" ? "todo" : task.status_code ?? "todo";
  const clock = (value: number) => [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60].map((n) => formatNumber(n, { minimumIntegerDigits: 2, useGrouping: false })).join(":");
  const timer = dashboard.data?.active_timers[0];
  const todaySeconds = dashboard.data?.attendance_today?.check_in ? Math.max(0, Math.round(((dashboard.data.attendance_today.check_out ? new Date(dashboard.data.attendance_today.check_out).getTime() : liveNow) - new Date(dashboard.data.attendance_today.check_in).getTime()) / 1000)) : 0;
  const currentRequest = requests.data?.find((request) => String((request.user as unknown as { id?: string }).id ?? request.user) === String(user?.id)) ?? requests.data?.find((request) => String(request.user_detail?.id) === String(user?.id));
  const requestLabel = currentRequest?.request_type === "remote" ? t("دورکاری") : currentRequest?.request_type === "overtime" ? t("اضافه‌کاری") : currentRequest?.request_type === "sick" ? t("مرخصی استعلاجی") : currentRequest?.request_type === "hourly" ? t("مرخصی ساعتی") : t("درخواست مرخصی");
  const stats = [
    { title: t("کارهای امروز"), value: formatNumber(todayTasks.length), Icon: ClipboardCheck, color: "gold" },
    { title: t("در حال انجام"), value: formatNumber(todayTasks.filter((task) => ["in_progress", "doing"].includes(task.status_code ?? "")).length), Icon: CircleDashed, color: "blue" },
    { title: t("زمان امروز"), value: clock(todaySeconds).slice(0, -3), Icon: Clock3, color: "teal" },
    { title: t("منتظر بررسی"), value: formatNumber(todayTasks.filter((task) => ["review", "in_review"].includes(task.status_code ?? "")).length), Icon: Hourglass, color: "coral" },
  ];
  const markDone = useMutation({ mutationFn: (id: string) => ApiService.post(`/tasks/${id}/mark-done/`, {}), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["home-dashboard"] }), queryClient.invalidateQueries({ queryKey: ["home-projects"] }), queryClient.invalidateQueries({ queryKey: ["projects"] })]); toast.success(t("تسک انجام شد")); }, onError: (error) => toast.error(getErrorMessage(error)) });
  const stop = useMutation({ mutationFn: () => stopTimer(timer?.id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["home-dashboard"] }); toast.success(t("زمان ثبت شد")); }, onError: (error) => toast.error(getErrorMessage(error)) });
  const primaryError = dashboard.isError || projectQuery.isError || requests.isError || news.isError || projectMembers.isError;
  return <div className="reference-home">
    <section className="home-welcome"><div><h1>{t("سلام، روزت بخیر!")}</h1><p>{t("کارهای امروزت اینجاست.")}</p></div></section>
    <div className="home-stats">{stats.map(({ title: label, value, Icon, color }) => <Link to={color === "teal" ? "/attendance" : "/tasks"} key={label} className={`home-stat ${color}`}><div><h2>{label}</h2><strong>{value}</strong></div><span className="home-stat-icon"><Icon size={26}/></span><ChevronLeft className="home-stat-arrow" size={15}/></Link>)}</div>
    {primaryError && <div className="home-data-error" role="alert">{t("دریافت اطلاعات با مشکل مواجه شد")} <button onClick={() => { void dashboard.refetch(); void projectQuery.refetch(); void requests.refetch(); void news.refetch(); void projectMembers.refetch(); }}>{t("تلاش دوباره")}</button></div>}
    <div className="home-middle">
      <section className="home-card home-tasks"><div className="home-card-heading"><h2>{t("کارهای من")}</h2><div className="home-period"><button className={!week ? "selected" : ""} onClick={() => setWeek(false)}>{t("امروز")}</button><button className={week ? "selected" : ""} onClick={() => setWeek(true)}>{t("این هفته")}</button></div><Link to="/tasks" aria-label={t("مشاهده همه تسک‌ها")}><MoreVertical size={20}/></Link></div>
        <div className="home-task-list">{tasks.slice(0, week ? 4 : 3).map((task, index) => { const Icon = [FileText, Code2, FlaskConical][index % 3]; return <div className="home-task-row" key={task.id}>
          <Icon size={23} className="home-task-icon"/><Link to={taskLink(task)} className="home-task-title"><strong>{task.title}</strong><span className="home-task-progress"/></Link>
          <span className="home-task-project"><i className={index === 1 ? "gold" : "blue"}/>{task.project_name}</span><span className={`home-status ${statusClass(task)}`}>{statusLabel(task)}</span>
          <img className="home-avatar" src={user?.profile_image_url || user?.avatar_url || avatar(4)} alt={t("عضو تیم")}/>
          <input type="checkbox" checked={false} disabled={markDone.isPending} aria-label={t("تکمیل تسک {title}", { title: task.title })} onChange={() => markDone.mutate(task.id)}/>
        </div>; })}</div>
        {!tasks.length && <p className="home-empty">{dashboard.isLoading ? t("در حال بارگذاری...") : t("تسکی برای نمایش وجود ندارد")}</p>}
        <Link className="home-see-all" to="/tasks">{t("مشاهده همه")}<ChevronLeft size={17}/></Link>
      </section>
      <div className="home-sidecards"><section className="home-card home-timer"><div className="home-card-heading"><h2><i className={timer ? "home-live-dot" : "home-idle-dot"}/>{timer ? t("تایمر فعال") : t("زمان‌سنج")}</h2><Link to="/attendance" aria-label={t("جزئیات زمان‌سنج")}><MoreVertical size={20}/></Link></div><div className="home-timer-panel"><span className="home-timer-device"><Monitor size={25}/></span><strong>{timer?.task_title ?? t("تایمر فعالی ندارید")}</strong><p>{timer?.project_name}</p><div className="home-timer-value">{clock(timer ? Math.max(0, Math.floor((liveNow - new Date(timer.start_time).getTime()) / 1000)) : 0)}</div><div className="home-timer-actions"><button className="home-timer-stop" disabled={!timer || stop.isPending} onClick={() => stop.mutate()} aria-label={t("توقف زمان‌سنج")}><Square size={16} fill="currentColor"/></button></div></div></section>
      <section className="home-card home-requests"><div className="home-card-heading"><h2>{t("درخواست‌های من")}</h2><Link to="/attendance" aria-label={t("مشاهده درخواست‌ها")}><ChevronLeft size={21}/></Link></div>{currentRequest ? <Link to="/attendance" className="home-request-row"><MoreVertical size={18}/><div><strong>{requestLabel}</strong><small>{t("{start} تا {end}", { start: formatDisplayDate(currentRequest.start_datetime).replaceAll("-", "/"), end: formatDisplayDate(currentRequest.end_datetime).replaceAll("-", "/") })}</small></div><span className={`home-status ${currentRequest.status === "approved" ? "done" : "review"}`}>{currentRequest.status === "pending" ? t("در انتظار تأیید") : currentRequest.status === "approved" ? t("تأیید شده") : t("رد شده")}</span><span className="home-request-icon"><CalendarDays size={24}/></span></Link> : <p className="home-empty">{t("درخواستی برای نمایش وجود ندارد")}</p>}</section></div>
    </div>
    <div className="home-bottom"><section className="home-card home-news"><div className="home-card-heading"><h2>{t("خبرهای تیم")}</h2><Link to="/notifications" aria-label={t("مشاهده اعلان‌ها")}><ChevronLeft size={21}/></Link></div>{news.data?.slice(0, 2).map((item, index) => { const formatted = formatNews(item.text); return <Link to={item.link?.startsWith("/") ? buildNotificationLink(item.link) : "/notifications"} className="home-news-row" key={item.id}><div className="home-news-author"><small>{formatRelativeTime(item.created_at)}</small><img className="home-avatar" src={user?.profile_image_url || user?.avatar_url || avatar(index + 1)} alt=""/></div><div className="home-news-text"><h3>{formatted.heading}</h3>{formatted.detail && <p>{formatted.detail}</p>}</div><span className={`home-news-icon ${index === 0 ? "gold" : "coral"}`}>{index === 0 ? <Hand size={27}/> : <Megaphone size={27}/>}</span></Link>; })}{!news.data?.length && <p className="home-empty">{news.isLoading ? t("در حال بارگذاری...") : t("خبری برای نمایش وجود ندارد")}</p>}</section>
    <section className="home-card home-projects"><div className="home-card-heading"><h2>{t("پروژه‌های من")}</h2><Link to="/projects" aria-label={t("مشاهده پروژه‌ها")}><ChevronLeft size={21}/></Link></div>{projects.map((project, index) => <Link to={`/projects/${project.id}`} className="home-project-row" key={project.id}><MoreVertical size={19}/><div className="home-avatar-stack">{(projectMembers.data?.[index] ?? []).filter((member: ProjectMember) => member.user).slice(0, 3).map((member: ProjectMember, avatarIndex: number) => <img key={member.id} className="home-avatar" src={member.user?.avatar || avatar(avatarIndex + 2)} alt={member.user?.full_name || member.user?.username || t("عضو تیم")}/>)}</div><div className="home-project-detail"><strong>{project.name}</strong><div className="home-project-meter"><span>{formatNumber(project.progress_percentage ?? 0)}{t("٪")}</span><progress max={100} value={project.progress_percentage ?? 0} aria-label={t("پیشرفت پروژه {title}", { title: project.name })}/></div></div><span className={`home-project-icon ${index === 0 ? "blue" : "gold"}`}>{index === 0 ? <Monitor size={24}/> : <BadgeCheck size={25}/>}</span></Link>)}{!projects.length && <p className="home-empty">{projectQuery.isLoading ? t("در حال بارگذاری...") : t("پروژه‌ای برای نمایش وجود ندارد")}</p>}</section></div>
  </div>;
};
export default UserDashboardPage;
