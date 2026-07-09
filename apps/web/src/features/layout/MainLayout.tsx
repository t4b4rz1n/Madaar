import { useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../auth/store/authStore";
import { drawerItems } from "./DrawerItems";
import type { Breadcrumb } from "./Header";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useLayoutStore } from "./store/layoutStore";

export const MainLayout = () => {
  const { setSidebarOpen } = useLayoutStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { pathname } = useLocation();

  const breadcrumbs = useMemo(() => {
    const pathSegments = pathname.split("/").filter((i) => i);
    const crumbs: Breadcrumb[] = [{ title: "Dashboard", path: "/" }];

    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const matchingItem = drawerItems.find((item) => item.link === segment);

      if (matchingItem) {
        crumbs.push({
          title: matchingItem.title,
          path: `/${matchingItem.link}`,
        });
      } else if (index === pathSegments.length - 1) {
        const parentItem = drawerItems.find(
          (item) => pathSegments[0] === item.link
        );
        if (parentItem) {
          crumbs.push({ title: "Details", path: currentPath });
        }
      }
    });

    return crumbs;
  }, [pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-base-200 font-sans text-base-content">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          breadcrumbs={breadcrumbs}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 bg-base-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
