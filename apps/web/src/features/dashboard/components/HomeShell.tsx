import { useEffect, useState, type ComponentType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, FolderOpen, Clock3, Users, ChartNoAxesColumnIncreasing, Wallet, BookOpen, Settings, Menu, Search, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "../../../components/Brand";
import { useTranslation } from "../../../i18n/locale";
import { getErrorMessage } from "../../../core/utils/errorHandler";
import ApiService from "../../../core/api/apiService";
import { getProjects } from "../../projects/api/projectsApi";
import { getBoards } from "../../tasks/api/tasksApi";
import { useLayoutStore } from "../../layout/store/layoutStore";
import { NotificationCenter } from "../../layout/NotificationCenter";
import { useAuthStore } from "../../auth/store/authStore";
import { usePermissions } from "../../auth/hooks/usePermissions";
import "../home.css";

const assets = "/images/heledone-assets/";

export function HomeSidebar() {
  const t = useTranslation();
  const location = useLocation();
  const { isSidebarOpen, setSidebarOpen } = useLayoutStore();
  const user = useAuthStore((s) => s.user);
  const { hasAnyPermission } = usePermissions();
  const canViewTeam = hasAnyPermission(["user.view", "org.manage_members"]);
  const projectsActive = location.pathname.startsWith("/projects") || location.pathname.startsWith("/tasks");
  const items: { label: string; path?: string; Icon: ComponentType<{ size?: number; fill?: string }>; active?: boolean; unavailable?: boolean }[] = [
    { label: "خانه", path: "/dashboard", Icon: Home, active: location.pathname === "/dashboard" },
    { label: "کار و پروژه", path: "/projects", Icon: FolderOpen, active: projectsActive },
    { label: "زمان و درخواست‌ها", path: "/attendance", Icon: Clock3, active: location.pathname.startsWith("/attendance") },
    { label: "تیم", path: "/teams", Icon: Users, active: location.pathname.startsWith("/teams"), unavailable: !canViewTeam },
    { label: "رشد و قدردانی", Icon: ChartNoAxesColumnIncreasing, unavailable: true },
    { label: "حقوق و هزینه‌ها", path: "/finance/my-reports", Icon: Wallet, active: location.pathname.startsWith("/finance") },
    { label: "دانشنامه", Icon: BookOpen, unavailable: true },
  ] as const;
  useEffect(() => { setSidebarOpen(false); }, [location.pathname, setSidebarOpen]);
  return <>
    {isSidebarOpen && <button className="home-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label={t("بستن منو")} />}
    <aside aria-label={t("منوی اصلی")} className={`home-sidebar ${isSidebarOpen ? "is-open" : ""}`}>
      <Link to="/dashboard" className="home-logo"><Brand /></Link>
      <button className="home-mobile-close" onClick={() => setSidebarOpen(false)} aria-label={t("بستن منو")}><X size={20}/></button>
      <nav aria-label={t("منوی اصلی")}>{items.map(({ label, path, Icon, active, unavailable }) =>
        unavailable ? <span key={label} className="home-nav-unavailable" aria-disabled="true" title={t(label === "تیم" ? "دسترسی ندارید" : "به‌زودی")}><Icon size={23}/><span>{t(label)}</span><small>{t(label === "تیم" ? "دسترسی ندارید" : "به‌زودی")}</small></span> :
        <div key={label}><Link to={path!} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => setSidebarOpen(false)}><Icon size={23} fill={label === "خانه" && active ? "currentColor" : "none"}/><span>{t(label)}</span></Link>
          {label === "کار و پروژه" && projectsActive && <div className="home-subnav"><Link to="/projects" aria-current={location.pathname.startsWith("/projects") ? "page" : undefined}>{t("پروژه‌ها")}</Link><Link to="/tasks" aria-current={location.pathname.startsWith("/tasks") ? "page" : undefined}>{t("تسک‌ها و کانبان")}</Link></div>}
        </div>
      )}</nav>
      <div className="home-sidebar-bottom">
        <div className="home-seascape" aria-hidden="true"><img className="home-coast-art" src={assets + "home-sidebar-coast.png"} alt=""/></div>
        <Link to="/profile" className="home-user"><img src={user?.profile_image_url || user?.avatar_url || assets + "avatar-04.png"} alt=""/><span><strong>{[user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username}<small>{t("حساب من")}</small></strong></span></Link>
        <Link className={`home-settings ${location.pathname === "/settings" ? "active" : ""}`} to="/settings"><Settings size={24}/>{t("تنظیمات")}</Link>
        <p className="home-motto">{t("ریتم مشترک تیم")}</p>
      </div>
    </aside>

  </>;
}

export function HomeHeader({ onSearch }: { onSearch: () => void }) {
  const t = useTranslation();
  const [newTask, setNewTask] = useState(false);
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen);
  const { hasAnyPermission } = usePermissions();
  const canCreateTask = hasAnyPermission(["task.create", "task.manage_all"]);
  return <><header className="home-topbar">
    <button className="home-menu" aria-label={t("باز کردن منو")} onClick={() => setSidebarOpen(true)}><Menu/></button>
    <button className="home-search" onClick={onSearch}><span>{t("جستجو در هله‌دان")}</span><Search size={22}/></button>
    <div className="home-notifications"><NotificationCenter/></div>
    {canCreateTask && <button className="home-create" onClick={() => setNewTask(true)}><Plus size={22}/>{t("تسک جدید")}</button>}
  </header><NewTaskDialog open={newTask} onClose={() => setNewTask(false)} /></>;
}

function NewTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslation(); const navigate = useNavigate(); const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [projectId, setProjectId] = useState(""); const [title, setTitle] = useState("");
  const projects = useQuery({ queryKey: ["home-create-projects"], queryFn: () => getProjects(), enabled: open });
  const selectedProject = projectId || String(projects.data?.find((project) => project.status === "active")?.id ?? projects.data?.[0]?.id ?? "");
  const boards = useQuery({ queryKey: ["home-create-boards", selectedProject], queryFn: () => getBoards(selectedProject), enabled: open && !!selectedProject });
  const status = boards.data?.flatMap((board) => board.statuses).find((status) => status.code === "todo") ?? boards.data?.[0]?.statuses[0];
  const selectedBoardId = boards.data?.find((board) => board.statuses.some((item) => item.id === status?.id))?.id;
  const create = useMutation({ mutationFn: async () => {
    const result = await ApiService.post<{ id: string }>("/tasks/", { project: selectedProject, title: title.trim(), status: status!.id, assignee: user?.id, priority: "medium" });
    return result.data;
  }, onSuccess: async (task) => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["home-dashboard"] }), queryClient.invalidateQueries({ queryKey: ["home-projects"] }), queryClient.invalidateQueries({ queryKey: ["projects"] })]); onClose(); setTitle(""); toast.success(t("تسک با موفقیت ساخته شد")); navigate(`/tasks?project=${encodeURIComponent(selectedProject)}&board=${encodeURIComponent(selectedBoardId ?? "")}&task=${encodeURIComponent(task.id)}`); }, onError: (error) => toast.error(getErrorMessage(error)) });
  useEffect(() => { if (!open) return; const handle = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", handle); return () => window.removeEventListener("keydown", handle); }, [open, onClose]);
  if (!open) return null;
  return <div className="home-dialog-backdrop" onClick={onClose}><section role="dialog" aria-modal="true" aria-labelledby="home-new-task-title" className="home-dialog" onClick={(event) => event.stopPropagation()}><button className="home-dialog-close" onClick={onClose} aria-label={t("بستن")}><X size={22}/></button><h2 id="home-new-task-title">{t("تسک جدید")}</h2><form onSubmit={(event) => { event.preventDefault(); if (title.trim() && selectedProject && status) create.mutate(); }}><label htmlFor="home-task-project">{t("پروژه")}</label><select id="home-task-project" value={selectedProject} onChange={(event) => setProjectId(event.target.value)} disabled={projects.isLoading}>{projects.data?.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><label htmlFor="home-task-name">{t("عنوان تسک")}</label><input id="home-task-name" autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("عنوان تسک")}/>{!selectedProject || !status ? <p>{t("برای ساخت تسک ابتدا یک پروژه و کانبان آماده کنید.")}</p> : null}<button className="home-create" type="submit" disabled={!selectedProject || !status || create.isPending}><Plus size={20}/>{t("افزودن تسک")}</button></form></section></div>;
}
