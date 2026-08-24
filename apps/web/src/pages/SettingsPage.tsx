import React from "react";
import { Link } from "react-router-dom";
import { getAdminDrawerItems } from "../features/layout/DrawerItems";
import { useAuthStore } from "../features/auth/store/authStore";
import { usePermissions } from "../features/auth/hooks/usePermissions";

const SettingsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { hasAllPermissions } = usePermissions();
  const adminItems = getAdminDrawerItems(user, hasAllPermissions);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 py-2">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-base-content/8 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
          Settings &amp; Administration
        </h1>
        <p className="text-xs font-medium text-base-content/50">
          Manage organization settings, user roles, team structures, and system configurations.
        </p>
      </div>

      {/* Grid of Settings Modules */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {adminItems.map((item) => (
          <Link
            key={item.link}
            to={`/${item.link}`}
            className="group flex items-center gap-3.5 rounded-2xl border border-base-content/8 bg-base-100 p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-content">
              {item.icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-base-content group-hover:text-primary transition-colors">
                {item.title}
              </h2>
              <p className="mt-0.5 text-xs text-base-content/50 truncate">
                Manage {item.title.toLowerCase()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;
