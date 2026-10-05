import { useTranslation } from "../../i18n/locale";
import { motion } from "motion/react";
import { ArrowRight2, HamburgerMenu, SearchNormal1 } from "iconsax-reactjs";
import { Link } from "react-router-dom";
import ThemeToggle from "../../components/ThemeToggle";
import { motionTokens } from "../../core/config/designTokens";
import { NotificationCenter } from "./NotificationCenter";
import { usePermissions } from "../auth/hooks/usePermissions";
import { UserMenu } from "./UserMenu";

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
  const t = useTranslation();
  const { hasAnyPermission } = usePermissions();
  const canViewNotifications = hasAnyPermission(["notification.view", "org.manage_settings"]);

  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate="visible"
      className="heledone-topbar sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <motion.button
          type="button"
          onClick={onMenuClick}
          className="motion-interactive btn btn-ghost btn-circle text-base-content lg:hidden"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={t("باز کردن منو")}
        >
          <HamburgerMenu />
        </motion.button>

        <nav
          className="hidden min-w-0 items-center overflow-hidden text-sm xl:flex"
          aria-label={t("مسیر صفحه")}
        >
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className={index === breadcrumbs.length - 1 ? "flex min-w-0 items-center" : "hidden shrink-0 items-center sm:flex"}>
              {index < breadcrumbs.length - 1 ? (
                <Link
                  to={crumb.path}
                  className="motion-interactive font-semibold text-heledone-ink-muted hover:text-primary"
                >
                  {crumb.title}
                </Link>
              ) : (
                <span className="truncate font-bold text-base-content">
                  {crumb.title}
                </span>
              )}

              {index < breadcrumbs.length - 1 && (
                <ArrowRight2 size="16" className="rtl:rotate-180 mx-1 text-heledone-ink-muted sm:mx-2" />
              )}
            </div>
          ))}
        </nav>
        <button type="button" onClick={onCommandMenuClick} className="heledone-global-search flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-start text-sm text-heledone-ink-muted" aria-label={t("جست‌وجو در فضای کار")}>
          <span className="truncate">{t("جست‌وجو در فضای کار")}</span>
          <SearchNormal1 size={20} className="shrink-0" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canViewNotifications && <NotificationCenter />}
        <ThemeToggle />

        <UserMenu />
      </div>
    </motion.header>
  );
};
