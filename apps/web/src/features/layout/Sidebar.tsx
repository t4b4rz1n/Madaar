import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft2, Logout, Setting2, User, Add, Folder2 } from "iconsax-reactjs";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLogout } from "../auth/hooks/useAuth";
import { useAuthStore } from "../auth/store/authStore";
import { usePermissions } from "../auth/hooks/usePermissions";
import { getVisibleDrawerItems } from "./DrawerItems";
import { useLayoutStore } from "./store/layoutStore";
import { getProjects } from "../projects/api/projectsApi";
import { useTaskStore } from "../tasks/store/useTaskStore";
import logoUrl from "/images/base-logo1.png";
import { motionTokens } from "../../core/config/designTokens";

const PROJECT_COLORS = ['#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6'];

const sidebarVariants = {
  expanded: {
    width: "var(--madaar-sidebar-width)",
    transition: { duration: motionTokens.duration.slow },
  },
  collapsed: {
    width: "var(--madaar-sidebar-collapsed-width)",
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
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { hasAllPermissions } = usePermissions();
  const { isCollapsed, setIsCollapsed, isSidebarOpen, setSidebarOpen } = useLayoutStore();
  const { activeProjectId, setActiveProject } = useTaskStore();
  const logout = useLogout();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
    staleTime: 60_000,
  });

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  const primaryItems = getVisibleDrawerItems(user, hasAllPermissions, true);

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        aria-label="Primary navigation"
        variants={sidebarVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-base-content/8 bg-base-100/95 shadow-xl backdrop-blur-xl lg:relative ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0`}
      >
        {/* Header Logo */}
        <div className="flex h-[72px] items-center justify-between border-b border-base-content/8 px-4">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.img
                src={logoUrl}
                alt="Logo"
                className="h-8 object-contain cursor-pointer"
                onClick={() => navigate('/dashboard')}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.1 } }}
                exit={{ opacity: 0, x: -10 }}
              />
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="motion-interactive btn btn-ghost btn-sm btn-circle hidden text-base-content/55 hover:bg-base-200 hover:text-primary lg:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <ArrowLeft2
              className={`transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav
          aria-label="Primary navigation"
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 pt-2 scrollbar-thin scrollbar-thumb-base-300"
        >
          {/* Main Workspace items */}
          <ul className="space-y-1">
            <li className="px-3 pb-1 pt-2">
              <span
                className={
                  isCollapsed
                    ? "sr-only"
                    : "text-[0.65rem] font-bold uppercase tracking-[0.12em] text-base-content/40"
                }
              >
                Workspace
              </span>
            </li>
            {primaryItems.map((item, index) => {
              const isActive =
                item.link === "dashboard"
                  ? location.pathname === "/" || location.pathname === "/dashboard"
                  : location.pathname === `/${item.link}` ||
                    location.pathname.startsWith(`/${item.link}/`);

              return (
                <motion.li
                  key={item.link}
                  variants={navItemVariants}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    to={`/${item.link}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`motion-interactive flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 ${
                      isActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-base-content/65 hover:bg-base-200/80 hover:text-base-content font-medium"
                    }`}
                    title={isCollapsed ? item.title : ""}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                        isActive ? "text-primary" : "text-base-content/60"
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
                    : "text-[0.65rem] font-bold uppercase tracking-[0.12em] text-base-content/40"
                }
              >
                My Projects
              </span>
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => navigate("/projects")}
                  className="text-base-content/40 hover:text-primary transition-colors"
                  title="Create Project"
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
                        setActiveProject(project.id);
                        navigate("/tasks");
                        setSidebarOpen(false);
                      }}
                      className={`flex w-full h-10 items-center gap-3 rounded-xl px-3 text-start transition-colors ${
                        isSelected
                          ? "bg-base-200 text-base-content font-semibold"
                          : "text-base-content/60 hover:bg-base-200/50 hover:text-base-content"
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
                <li className="px-3 text-xs text-base-content/40">No active projects</li>
              )}
            </ul>
          </div>
        </nav>

        {/* Footer with Admin Settings button & Profile */}
        <div className="space-y-1 border-t border-base-content/8 p-2">
          {/* Workspace Settings Link */}
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={`motion-interactive flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${
              location.pathname === "/settings" || location.pathname.startsWith("/settings")
                ? "bg-primary/10 text-primary font-bold"
                : "text-base-content/70 hover:bg-base-200 hover:text-primary"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Workspace Settings" : ""}
          >
            <Setting2 size="18" className="shrink-0 text-base-content/60" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  variants={textVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="whitespace-nowrap"
                >
                  Workspace Settings
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {/* User Profile dropdown */}
          <div className="dropdown dropdown-top w-full">
            <motion.button
              type="button"
              className={`motion-interactive flex w-full cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent p-2 text-start hover:bg-base-200 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <div className="avatar">
                <div className="w-9 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1">
                  {user?.profile_image_url ? (
                    <img src={user.profile_image_url} alt="Profile" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/10">
                      <User size="18" className="text-primary" />
                    </div>
                  )}
                </div>
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    variants={textVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    className="flex-grow overflow-hidden text-start"
                  >
                    <p className="truncate text-xs font-bold text-base-content">
                      {user?.username || "User"}
                    </p>
                    <p className="truncate text-[0.65rem] text-base-content/55">
                      {user?.email || "No email"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <ul
              tabIndex={0}
              className="dropdown-content menu z-[1] mb-2 w-52 rounded-box border border-base-200 bg-base-100 p-2 shadow-xl"
            >
              <li className="menu-title px-4 py-2 text-xs font-semibold uppercase text-base-content/50">
                Account
              </li>
              <li>
                <Link to="profile" className="text-base-content/80">
                  <User className="h-4 w-4" /> My Profile
                </Link>
              </li>
              <div className="divider my-1"></div>
              <li>
                <button onClick={logout} className="text-error hover:bg-error/10">
                  <Logout className="h-4 w-4" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
