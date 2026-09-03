import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "../../components/ErrorFallback";
import { useAuthStore } from "../auth/store/authStore";
import { usePermissions } from "../auth/hooks/usePermissions";
import { getProfileRequest } from "../auth/api/authApi";
import { CommandMenu } from "./CommandMenu";
import { drawerItems, getVisibleDrawerItems } from "./DrawerItems";
import type { Breadcrumb } from "./Header";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useLayoutStore } from "./store/layoutStore";

export const MainLayout = () => {
  const { setSidebarOpen } = useLayoutStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { hasAllPermissions, hasAnyPermission } = usePermissions();
  const isStaff = user?.is_staff === true;
  const { pathname } = useLocation();
  const [isCommandMenuOpen, setCommandMenuOpen] = useState(false);

  const { data: latestProfile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: () => getProfileRequest(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (latestProfile) {
      updateUser(latestProfile);
    }
  }, [latestProfile, updateUser]);

  const commandItems = useMemo(
    () => getVisibleDrawerItems(user, hasAllPermissions, hasAnyPermission),
    [hasAllPermissions, hasAnyPermission, user],
  );

  const breadcrumbs = useMemo(() => {
    const pathSegments = pathname.split("/").filter((i) => i);
    const crumbs: Breadcrumb[] = [{ title: "Today", path: "/" }];

    if (pathSegments.length === 0 || pathSegments[0] === "dashboard") {
      return crumbs;
    }

    const firstSegment = pathSegments[0];
    const matchingItem = drawerItems.find((item) => item.link === firstSegment);

    // If visiting /settings or any admin sub-page, inject "Workspace Settings" into breadcrumbs
    if (firstSegment === "settings") {
      crumbs.push({ title: "Workspace Settings", path: "/settings" });
    } else if (matchingItem && !matchingItem.isPrimary) {
      crumbs.push({ title: "Workspace Settings", path: "/settings" });
      crumbs.push({ title: matchingItem.title, path: `/${firstSegment}` });
    } else if (matchingItem) {
      crumbs.push({ title: matchingItem.title, path: `/${firstSegment}` });
    } else {
      crumbs.push({ title: firstSegment, path: `/${firstSegment}` });
    }

    // Add remaining nested segments if any (e.g. details pages)
    if (pathSegments.length > 1) {
      crumbs.push({ title: "Details", path: pathname });
    }

    return crumbs;
  }, [pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-base-200 font-sans text-base-content">
      <a
        href="#main-content"
        className="fixed start-4 top-3 z-[200] -translate-y-24 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-content shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <Sidebar />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onCommandMenuClick={() => setCommandMenuOpen(true)}
          breadcrumbs={breadcrumbs}
        />

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-hidden overflow-y-auto bg-base-200 px-4 py-5 outline-none sm:px-8 sm:py-7">
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <CommandMenu
        isOpen={isCommandMenuOpen}
        onOpenChange={setCommandMenuOpen}
        items={commandItems}
        isStaff={isStaff}
      />
    </div>
  );
};
