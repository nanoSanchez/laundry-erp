import { createBrowserRouter } from "react-router-dom";

import MainLayout from "@/app/layouts/MainLayout";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

import LoginPage from "@/features/auth/pages/LoginPage";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
    ],
  },
]);

export default router;
