import { Suspense } from "react";
import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { PermissionGuard } from '../../auth/components/PermissionGuard';
import { UserRoute } from '../../../core/router/UserRoute';
import PageLoader from '../../../components/PageLoader';
import { TaskManagementPage } from '../pages/TaskManagementPage';
import { StandupsPage } from '../pages/StandupsPage';

export const tasksRoutes: RouteObject[] = [
  {
    // بورد تسک‌ها: نیاز به پرمیشن دیدن تسک یا بورد
    path: 'tasks',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PermissionGuard
          permissions={['task.view', 'board.view', 'task.create', 'task.manage_all']}
          fallback={<Navigate to="/dashboard" replace />}
        >
          <TaskManagementPage />
        </PermissionGuard>
      </Suspense>
    ),
  },
  {
    // صفحه Standups: همه اعضای سازمان
    path: 'standups',
    element: (
      <UserRoute>
        <Suspense fallback={<PageLoader />}>
          <StandupsPage />
        </Suspense>
      </UserRoute>
    ),
  },
];
