import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft2, Logout, Setting2, User } from "iconsax-reactjs";
import { Link, useLocation } from "react-router-dom";
import { useLogout } from "../auth/hooks/useAuth";
import { useAuthStore } from "../auth/store/authStore";
import { drawerItems } from "./DrawerItems";
import { useLayoutStore } from "./store/layoutStore";
import logoUrl from "/images/base-logo.svg";

const sidebarVariants = {
  expanded: {
    width: "16rem",
    transition: { duration: 0.3 },
  },
  collapsed: {
    width: "4rem",
    transition: { duration: 0.3 },
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
  const { isCollapsed, setIsCollapsed, isSidebarOpen, setSidebarOpen } =
    useLayoutStore();
  const logout = useLogout();

  const renderNavItems = () =>
    drawerItems.filter((item) => !item.staffOnly || isStaff).map((item, index) => {
      const isActive =
        item.link === ""
          ? location.pathname === "/"
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
            className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-200 h-12 overflow-hidden ${
              isActive
                ? "bg-primary text-primary-content shadow-md shadow-primary/20"
                : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
            }`}
            title={isCollapsed ? item.title : ""}
          >
            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
              {item.icon}
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  variants={textVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="font-medium whitespace-nowrap"
                >
                  {item.title}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </motion.li>
      );
    });

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        variants={sidebarVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        className={`fixed lg:relative top-0 left-0 h-full bg-base-100 shadow-xl z-50 flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-300 ease-in-out border-r border-base-content/10`}
      >
        <div className="flex items-center justify-between p-4 h-[63px] border-b border-base-content/10">
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
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex btn btn-ghost btn-sm btn-circle text-base-content/60 hover:text-primary"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <ArrowLeft2
              className={`transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-base-300">
          <ul className="space-y-1">{renderNavItems()}</ul>
        </nav>

        <div className="p-2 border-t border-base-content/10">
          <div className="dropdown dropdown-top w-full">
            <motion.div
              tabIndex={0}
              role="button"
              className={`w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors ${
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
            </motion.div>

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
