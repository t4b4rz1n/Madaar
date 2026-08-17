import { motion } from "framer-motion";
import { ArrowRight2, HamburgerMenu } from "iconsax-reactjs";
import { Link } from "react-router-dom";
import ThemeToggle from "../../components/ThemeToggle";
import { motionTokens } from "../../core/config/designTokens";

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
  breadcrumbs: Breadcrumb[];
}

export const Header = ({ onMenuClick, breadcrumbs }: HeaderProps) => {
  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate="visible"
      className="madaar-glass sticky top-0 z-30 flex min-h-[72px] items-center justify-between px-4 sm:px-8"
    >
      <div className="flex items-center gap-2">
        <motion.button
          onClick={onMenuClick}
          className="motion-interactive btn btn-ghost btn-circle text-base-content lg:hidden"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Open navigation"
        >
          <HamburgerMenu />
        </motion.button>

        <nav
          className="flex items-center text-sm sm:text-base"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
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

      <ThemeToggle />
    </motion.header>
  );
};
