import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import { UserRoute } from '../../../core/router/UserRoute';

const AttendancePage = lazy(() => import('../pages/AttendancePage'));

export const attendanceRoutes: RouteObject[] = [
  {
    path: 'attendance',
    element: (
      <UserRoute>
        <AttendancePage />
      </UserRoute>
    ),
  },
];

export default attendanceRoutes;
