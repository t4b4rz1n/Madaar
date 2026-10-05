import { useEffect, type ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FolderOpen, Clock3, Users, ChartNoAxesColumnIncreasing, Wallet, BookOpen, Settings, Menu, Search, X } from "lucide-react";
import { Brand } from "../../../components/Brand";
import ThemeToggle from "../../../components/ThemeToggle";
import { useTranslation } from "../../../i18n/locale";
import { useLayoutStore } from "../../layout/store/layoutStore";
import { NotificationCenter } from "../../layout/NotificationCenter";
import { UserMenu } from "../../layout/UserMenu";
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
  const setSidebarOpen = useLayoutStore((s) => s.setSidebarOpen);
  return <header className="home-topbar">
    <button className="home-menu" aria-label={t("باز کردن منو")} onClick={() => setSidebarOpen(true)}><Menu/></button>
    <button className="home-search" onClick={onSearch}><span>{t("جستجو در هله‌دان")}</span><Search size={22}/></button>
    <div className="home-header-actions">
      <div className="home-notifications"><NotificationCenter/></div>
      <ThemeToggle />
      <UserMenu />
    </div>
  </header>;
}
