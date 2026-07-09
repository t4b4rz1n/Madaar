import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const FeedbacksListPage = lazy(() => import("../pages/FeedbacksListPage"));

const feedbacksRoutes: RouteObject[] = [
  {
    path: "/feedbacks",
    element: <FeedbacksListPage />,
  },
];

export default feedbacksRoutes;
