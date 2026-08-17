import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft2, Logout, Setting2, User } from "iconsax-reactjs";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLogout } from "../auth/hooks/useAuth";
import { useAuthStore } from "../auth/store/authStore";
import { usePermissions } from "../auth/hooks/usePermissions"; // ایمپورت هوک پرمیشن‌ها
import { getVisibleDrawerItems } from "./DrawerItems";
import { useLayoutStore } from "./store/layoutStore";
import logoUrl from "/images/base-logo1.png";
import { motionTokens } from "../../core/config/designTokens";

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
    transition: { delay: 0.1 + i * 0.05 },
  }),
};

const textVariants = {
  collapsed: { opacity: 0, x: -10, transition: { duration: 0.2 } },
  expanded: { opacity: 1, x: 0, transition: { duration: 0.2, delay: 0.1 } },
};

export const Sidebar = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isStaff = user?.is_staff === true;
  const { hasAllPermissions } = usePermissions(); // دریافت تابع بررسی پرمیشن
  const { isCollapsed, setIsCollapsed, isSidebarOpen, setSidebarOpen } =
    useLayoutStore();
  const logout = useLogout();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  const renderNavItems = () => {
    const visibleItems = getVisibleDrawerItems(user, hasAllPermissions);

    const sections = [
      "Workspace",
      "Organization",
      "Administration",
      "Support",
      "Account",
    ] as const;

    return sections.flatMap((section) => {
      const sectionItems = visibleItems.filter((item) => item.section === section);
      if (sectionItems.length === 0) return [];

      return [
        <li key={`${section}-heading`} className="px-3 pb-1 pt-5 first:pt-1">
          <span className={isCollapsed ? "sr-only" : "text-[0.66rem] font-bold uppercase tracking-[0.12em] text-base-content/40"}>
            {section}
          </span>
        </li>,
        ...sectionItems.map((item, index) => {
        const isDashboardItem = item.link === "dashboard";
        const itemLink = isDashboardItem && isStaff ? "admin" : item.link;
        const itemTitle =
          isDashboardItem && isStaff ? "Admin Panel" : item.title;

        const isActive =
          itemLink === ""
            ? location.pathname === "/"
            : location.pathname === `/${itemLink}` ||
              location.pathname.startsWith(`/${itemLink}/`);

        return (
          <motion.li
            key={item.link}
            variants={navItemVariants}
            custom={index}
            initial="hidden"
            animate="visible"
          >
            <Link
              to={`/${itemLink}`}
              onClick={() => setSidebarOpen(false)}
              className={`motion-interactive flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-base-content/65 hover:bg-base-200/80 hover:text-base-content"
              }`}
              title={isCollapsed ? itemTitle : ""}
            >
              <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center ${isActive ? "text-primary" : "text-base-content/60"}`}>
                {item.icon}
              </div>

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    variants={textVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    className="whitespace-nowrap text-sm font-semibold"
                  >
                    {itemTitle}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </motion.li>
        );
        }),
      ];
    });
  };

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
        variants={sidebarVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-base-content/8 bg-base-100/95 shadow-xl backdrop-blur-xl lg:relative ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0`}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-base-content/8 px-4">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.img
                src={logoUrl}
                alt="Logo"
                className="h-8 object-contain"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }}
                exit={{ opacity: 0, x: -10 }}
              />
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="motion-interactive btn btn-ghost btn-sm btn-circle hidden text-base-content/55 hover:bg-base-200 hover:text-primary lg:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <ArrowLeft2
              className={`transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 scrollbar-thin scrollbar-thumb-base-300">
          <ul className="space-y-1">{renderNavItems()}</ul>
        </nav>

        <div className="border-t border-base-content/8 p-2">
          <div className="dropdown dropdown-top w-full">
            <motion.button
              type="button"
              className={`motion-interactive flex w-full cursor-pointer border-0 bg-transparent p-2 text-start items-center gap-3 rounded-xl hover:bg-base-200 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <div className="avatar">
                <div className="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1">
                  {user?.profile_image_url ? (
                    <img src={user.profile_image_url} alt="Profile" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <User size="20" className="text-primary" />
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
                    className="flex-grow text-left overflow-hidden"
                  >
                    <p className="font-semibold text-sm truncate text-base-content">
                      {user?.username || "User"}
                    </p>
                    <p className="text-xs text-base-content/60 truncate">
                      {user?.email || "No email"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow-xl bg-base-100 border border-base-200 rounded-box w-52 mb-2"
            >
              <li className="menu-title px-4 py-2 text-xs font-semibold text-base-content/50 uppercase">
                Account
              </li>
              <li>
                <Link to="profile" className="text-base-content/80">
                  <Setting2 className="w-4 h-4" /> Settings
                </Link>
              </li>
              <div className="divider my-1"></div>
              <li>
                <button
                  onClick={logout}
                  className="text-error hover:bg-error/10"
                >
                  <Logout className="w-4 h-4" />
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
