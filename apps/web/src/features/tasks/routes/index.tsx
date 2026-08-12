import type { RouteObject } from 'react-router-dom';
import { TaskManagementPage } from '../pages/TaskManagementPage';

export const tasksRoutes: RouteObject[] = [
  {
    path: 'tasks',
    element: <TaskManagementPage />,
  },
];
