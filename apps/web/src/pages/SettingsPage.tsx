import React from "react";
import { Link } from "react-router-dom";
import { Setting2 } from "iconsax-reactjs";
import { getAdminDrawerItems } from "../features/layout/DrawerItems";
import { useAuthStore } from "../features/auth/store/authStore";
import { usePermissions } from "../features/auth/hooks/usePermissions";

const SettingsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { hasAllPermissions } = usePermissions();
  const adminItems = getAdminDrawerItems(user, hasAllPermissions);

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 py-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-base-content/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Setting2 size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-base-content sm:text-3xl">
              Workspace Settings & Administration
            </h1>
            <p className="mt-1 text-sm text-base-content/60">
              Manage organization settings, user roles, team structures, and system configurations.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Settings Modules */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminItems.map((item) => (
          <Link
            key={item.link}
            to={`/${item.link}`}
            className="group flex items-start gap-4 rounded-2xl border border-base-content/10 bg-base-100 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-content">
              {item.icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-base-content group-hover:text-primary">
                {item.title}
              </h2>
              <p className="mt-1 text-xs text-base-content/55">
                Manage and configure {item.title.toLowerCase()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;
