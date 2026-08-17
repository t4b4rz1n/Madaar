import { useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "../../components/ErrorFallback";
import { useAuthStore } from "../auth/store/authStore";
import { usePermissions } from "../auth/hooks/usePermissions";
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
  const { hasAllPermissions } = usePermissions();
  const isStaff = user?.is_staff === true;
  const { pathname } = useLocation();
  const [isCommandMenuOpen, setCommandMenuOpen] = useState(false);

  const commandItems = useMemo(
    () => getVisibleDrawerItems(user, hasAllPermissions),
    [hasAllPermissions, user],
  );

  const breadcrumbs = useMemo(() => {
    const pathSegments = pathname.split("/").filter((i) => i);
    const rootTitle = isStaff ? "Admin panel" : "Dashboard";
    const crumbs: Breadcrumb[] = [{ title: rootTitle, path: "/" }];

    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      const matchingItem = drawerItems.find((item) => {
        if (segment === "admin" && item.link === "dashboard" && isStaff) {
          return true;
        }

        return item.link === segment;
      });

      if (matchingItem) {
        const itemTitle =
          segment === "admin" && matchingItem.link === "dashboard" && isStaff
            ? "Admin panel"
            : matchingItem.title;

        crumbs.push({
          title: itemTitle,
          path: currentPath,
        });
      } else if (index === pathSegments.length - 1) {
        const parentItem = drawerItems.find(
          (item) =>
            pathSegments[0] === item.link ||
            (pathSegments[0] === "admin" &&
              item.link === "dashboard" &&
              isStaff),
        );

        if (parentItem) {
          crumbs.push({ title: "Details", path: currentPath });
        }
      }
    });

    return crumbs;
  }, [pathname, isStaff]);

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
