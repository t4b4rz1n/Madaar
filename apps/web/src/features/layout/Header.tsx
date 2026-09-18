import { motion } from "framer-motion";
import { ArrowRight2, HamburgerMenu, SearchNormal1, User, Logout } from "iconsax-reactjs";
import { Link } from "react-router-dom";
import ThemeToggle from "../../components/ThemeToggle";
import { motionTokens } from "../../core/config/designTokens";
import { NotificationCenter } from "./NotificationCenter";
import { usePermissions } from "../auth/hooks/usePermissions";
import { useAuthStore } from "../auth/store/authStore";
import { useLogout } from "../auth/hooks/useAuth";

const headerVariants = {
  hidden: { y: -100, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: motionTokens.duration.slow },
  },
};

export interface Breadcrumb {
  title: string;
  path: string;
}

interface HeaderProps {
  onMenuClick: () => void;
  onCommandMenuClick: () => void;
  breadcrumbs: Breadcrumb[];
}

export const Header = ({
  onMenuClick,
  onCommandMenuClick,
  breadcrumbs,
}: HeaderProps) => {
  const { hasAnyPermission } = usePermissions();
  const closeDropdown = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const canViewNotifications = hasAnyPermission(["notification.view", "org.manage_settings"]);

  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate="visible"
      className="madaar-glass sticky top-0 z-30 flex min-h-14 items-center justify-between px-4 sm:px-8"
    >
      <div className="flex min-w-0 items-center gap-2">
        <motion.button
          type="button"
          onClick={onMenuClick}
          className="motion-interactive btn btn-ghost btn-circle text-base-content lg:hidden"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Open navigation"
        >
          <HamburgerMenu />
        </motion.button>

        <nav
          className="flex min-w-0 items-center overflow-hidden text-sm sm:text-base"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex shrink-0 items-center">
              {index < breadcrumbs.length - 1 ? (
                <Link
                  to={crumb.path}
                  className="motion-interactive font-semibold text-base-content/55 hover:text-primary"
                >
                  {crumb.title}
                </Link>
              ) : (
                <span className="font-bold text-base-content">
                  {crumb.title}
                </span>
              )}

              {index < breadcrumbs.length - 1 && (
                <ArrowRight2 size="16" className="mx-1 text-base-content/35 sm:mx-2" />
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCommandMenuClick}
          className="motion-interactive inline-flex h-10 w-10 items-center justify-center gap-2 rounded-xl border border-base-content/10 bg-base-100/70 text-sm text-base-content/50 shadow-sm hover:border-primary/35 hover:bg-base-100 hover:text-primary sm:h-11 sm:w-auto sm:px-3"
          aria-label="Open command menu"
        >
          <SearchNormal1 size={18} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded-md border border-base-content/10 bg-base-200 px-1.5 py-0.5 text-[0.65rem] sm:inline">⌘K</kbd>
        </button>
        {canViewNotifications && <NotificationCenter />}
        <ThemeToggle />

        {/* User Profile dropdown */}
        <div className="dropdown dropdown-end dropdown-bottom">
          <button
            type="button"
            className="motion-interactive flex cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent hover:bg-base-200"
          >
            <div className="avatar">
              <div className="w-9 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1">
                {user?.profile_image_url ? (
                  <img src={user?.profile_image_url} alt="Profile" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/10">
                    <User size="18" className="text-primary" />
                  </div>
                )}
              </div>
            </div>
          </button>

          <ul
            tabIndex={0}
            className="dropdown-content menu z-[100] mt-3 w-52 rounded-box border border-base-200 bg-base-100 p-2 shadow-xl"
          >
            <li className="menu-title px-4 py-2 text-xs font-semibold uppercase text-base-content/50">
              Account
            </li>
            <li>
              <Link to="/profile" className="text-base-content/80" onClick={closeDropdown}>
                <User className="h-4 w-4" /> My Profile
              </Link>
            </li>
            <div className="divider my-1"></div>
            <li>
              <button onClick={() => { closeDropdown(); logout(); }} className="text-error hover:bg-error/10">
                <Logout className="h-4 w-4" />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </motion.header>
  );
};
