import { motion } from "framer-motion";
import { ArrowRight2, HamburgerMenu } from "iconsax-reactjs";
import { Link } from "react-router-dom";

const headerVariants = {
  hidden: { y: -100, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
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
      className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-[19.5px] bg-base-100/80 backdrop-blur-lg border-b border-base-content/10"
    >
      <div className="flex items-center gap-2">
        <motion.button
          onClick={onMenuClick}
          className="lg:hidden btn btn-ghost btn-circle text-base-content"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Open Menu"
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
                  className="font-semibold text-base-content/60 hover:text-primary transition-colors"
                >
                  {crumb.title}
                </Link>
              ) : (
                <span className="font-bold text-base-content">
                  {crumb.title}
                </span>
              )}

              {index < breadcrumbs.length - 1 && (
                <ArrowRight2
                  size="16"
                  className="text-base-content/40 mx-1 sm:mx-2"
                />
              )}
            </div>
          ))}
        </nav>
      </div>
    </motion.header>
  );
};
