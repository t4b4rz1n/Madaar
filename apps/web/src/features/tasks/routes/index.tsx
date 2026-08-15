import type { RouteObject } from 'react-router-dom';
import { TaskManagementPage } from '../pages/TaskManagementPage';

import { StandupsPage } from '../pages/StandupsPage';

export const tasksRoutes: RouteObject[] = [
  {
    path: 'tasks',
    element: <TaskManagementPage />,
  },
  {
    path: 'standups',
    element: <StandupsPage />,
  },
];
