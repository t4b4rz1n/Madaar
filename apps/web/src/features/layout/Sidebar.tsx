import { useTranslation, getDirection } from "../../i18n/locale";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft2, Setting2, Add } from "iconsax-reactjs";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../auth/store/authStore";
import { usePermissions } from "../auth/hooks/usePermissions";
import { getVisibleDrawerItems } from "./DrawerItems";
import {
  useLayoutStore,
} from "./store/layoutStore";
import { getProjects } from "../projects/api/projectsApi";
import { useTaskStore } from "../tasks/store/useTaskStore";
import { Brand, BrandBeats } from "../../components/Brand";
import { motionTokens } from "../../core/config/designTokens";

const PROJECT_COLORS = ['#087F83', '#DF765B', '#F2BA49', '#006D73', '#A7D4CD', '#D7C8B3'];

const routePrefetchers: Record<string, () => void> = {
  dashboard: () => {
    import("../dashboard/pages/UserDashboardPage");
  },
  tasks: () => {
    import("../tasks/pages/TaskManagementPage");
  },
  projects: () => {
    import("../projects/pages/ProjectsPage");
  },
  standups: () => {
    import("../tasks/pages/StandupsPage");
  },
  attendance: () => {
    import("../attendance/pages/AttendancePage");
  },
  finance: () => {
    import("../finance/pages/UserFinanceDashboard");
  },
  users: () => {
    import("../users/pages/UsersListPage");
  },
  roles: () => {
    import("../roles/pages/RolesListPage");
  },
  teams: () => {
    import("../teams/pages/TeamsListPage");
  },
  discounts: () => {
    import("../discounts/pages/DiscountsListPage");
  },
  automations: () => {
    import("../automations/components/AutomationsPage");
  },
  tickets: () => {
    import("../tickets/pages/TicketsListPage");
  },
  notifications: () => {
    import("../notifications/pages/NotificationsPage");
  },
  profile: () => {
    import("../profile/pages/ProfilePage");
  },
  settings: () => {
    import("../../pages/SettingsPage");
  },
};

const sidebarVariants = {
  expanded: {
    width: "var(--heledone-sidebar-width)",
    transition: { duration: motionTokens.duration.slow },
  },
  collapsed: {
    width: "var(--heledone-sidebar-collapsed-width)",
    transition: { duration: motionTokens.duration.slow },
  },
};

const navItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 + i * 0.03 },
  }),
};

const textVariants = {
  collapsed: { opacity: 0, x: -10, transition: { duration: 0.15 } },
  expanded: { opacity: 1, x: 0, transition: { duration: 0.15, delay: 0.05 } },
};

export const Sidebar = () => {
  const t = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { hasAllPermissions, hasAnyPermission } = usePermissions();
  const { isCollapsed, setIsCollapsed, isSidebarOpen, setSidebarOpen } = useLayoutStore();
  const { activeProjectId, setActiveProject } = useTaskStore();


  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
    staleTime: 60_000,
  });

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  const primaryItems = getVisibleDrawerItems(user, hasAllPermissions, hasAnyPermission, true);

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-neutral/30 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        aria-label={t("ناوبری اصلی")}
        variants={sidebarVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        className={`heledone-sidebar fixed start-0 top-0 z-50 flex h-full flex-col bg-base-100 lg:relative ${
          isSidebarOpen ? "visible translate-x-0" : "invisible -translate-x-full rtl:translate-x-full"
        } transition-transform duration-300 ease-in-out lg:visible lg:translate-x-0`}
      >
        {/* Header Logo */}
        <div className="flex h-20 items-center justify-between border-b border-base-content/8 px-2">
          {isCollapsed && <Link to="/dashboard" aria-label={t("خانه هله‌دان")}><BrandBeats /></Link>}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Link to="/dashboard" aria-label={t("خانه هله‌دان")}><Brand /></Link>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="motion-interactive btn btn-ghost btn-sm btn-circle hidden text-heledone-ink-muted hover:bg-base-200 hover:text-primary lg:flex"
            aria-label={isCollapsed ? t("باز کردن منو") : t("جمع کردن منو")}
            title={isCollapsed ? t("باز کردن منو") : t("جمع کردن منو")}
          >
            <ArrowLeft2
              className={`transition-transform duration-300 ${
                (isCollapsed !== (getDirection() === "rtl")) ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        <div className="heledone-rhythm mx-4 mt-2 opacity-70" aria-hidden="true" />
        {/* Scrollable Navigation */}
        <nav
          aria-label={t("ناوبری اصلی")}
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 pt-2 scrollbar-thin scrollbar-thumb-base-300"
        >
          {/* Main Workspace items */}
          <ul className="space-y-1">
            <li className="px-3 pb-1 pt-2">
              <span
                className={
                  isCollapsed
                    ? "sr-only"
                    : "text-[0.65rem] font-bold uppercase  text-heledone-ink-muted"
                }
              >
                {t("فضای کار")}</span>
            </li>
            {primaryItems.map((item, index) => {
              const itemPath = item.link.startsWith("/") ? item.link : `/${item.link}`;
              const isActive =
                item.link === "dashboard"
                  ? location.pathname === "/" || location.pathname === "/dashboard"
                  : location.pathname === itemPath ||
                    location.pathname.startsWith(`${itemPath}/`);

              return (
                <motion.li
                  key={item.link}
                  variants={navItemVariants}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    to={itemPath}
                    onClick={() => setSidebarOpen(false)}
                    onMouseEnter={() => routePrefetchers[item.link]?.()}
                    className={`motion-interactive flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 ${
                      isActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-heledone-ink-muted hover:bg-base-200/80 hover:text-base-content font-medium"
                    }`}
                    title={isCollapsed ? item.title : ""}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                        isActive ? "text-primary" : "text-heledone-ink-muted"
                      }`}
                    >
                      {item.icon}
                    </div>

                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          variants={textVariants}
                          initial="collapsed"
                          animate="expanded"
                          exit="collapsed"
                          className="whitespace-nowrap text-sm"
                        >
                          {item.title}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.li>
              );
            })}
          </ul>

          {/* Pinned Projects Section */}
          <div className="mt-6 border-t border-base-content/8 pt-4">
            <div className="flex items-center justify-between px-3 pb-2">
              <span
                className={
                  isCollapsed
                    ? "sr-only"
                    : "text-[0.65rem] font-bold uppercase  text-heledone-ink-muted"
                }
              >
                {t("پروژه‌های من")}</span>
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => navigate("/projects")}
                  className="text-heledone-ink-muted hover:text-primary transition-colors"
                  title={t("ساخت پروژه")}
                >
                  <Add size="16" />
                </button>
              )}
            </div>

            <ul className="space-y-1">
              {projects?.slice(0, 5).map((project, idx) => {
                const color = PROJECT_COLORS[idx % PROJECT_COLORS.length];
                const isSelected = activeProjectId === project.id;

                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProject(String(project.id));
                        navigate("/tasks");
                        setSidebarOpen(false);
                      }}
                      className={`flex w-full h-10 items-center gap-3 rounded-xl px-3 text-start transition-colors ${
                        isSelected
                          ? "bg-base-200 text-base-content font-semibold"
                          : "text-heledone-ink-muted hover:bg-base-200/50 hover:text-base-content"
                      }`}
                      title={isCollapsed ? project.name : ""}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            variants={textVariants}
                            initial="collapsed"
                            animate="expanded"
                            exit="collapsed"
                            className="truncate text-xs"
                          >
                            {project.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </li>
                );
              })}

              {!isCollapsed && (!projects || projects.length === 0) && (
                <li className="px-3 text-xs text-heledone-ink-muted">{t("هنوز پروژه فعالی ندارید")}</li>
              )}
            </ul>
          </div>
        </nav>

        {/* Footer with Admin Settings button & Profile */}
        <div className="space-y-1 border-t border-base-content/8 p-2">
          {/* تنظیمات فضای کار Link */}
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={() => routePrefetchers.settings?.()}
            className={`motion-interactive flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${
              location.pathname === "/settings" || location.pathname.startsWith("/settings")
                ? "bg-primary/10 text-primary font-bold"
                : "text-base-content/70 hover:bg-base-200 hover:text-primary"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? t("تنظیمات فضای کار") : ""}
          >
            <Setting2 size="18" className="shrink-0 text-heledone-ink-muted" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  variants={textVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="whitespace-nowrap"
                >
                  {t("تنظیمات فضای کار")}</motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </motion.aside>
    </>
  );
};
