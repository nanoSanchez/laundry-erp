import { createBrowserRouter } from "react-router-dom";

import MainLayout from "@/app/layouts/MainLayout";

import ProtectedRoute from "@/components/auth/ProtectedRoute";

import LoginPage from "@/features/auth/pages/LoginPage";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";

import ServicesPage from "@/features/configuracion/servicios/pages/ServicesPage";

import BranchesPage from "@/features/configuracion/sucursales/pages/BranchesPage";
import CashPage from "@/features/caja/pages/CashPage";
import ReportsPage from "@/features/reportes/pages/ReportsPage";

import PrendasPage from "@/features/prendas/pages/PrendasPage";

import ClientesPage from "@/features/clientes/pages/ClientesPage";

import ReceptionPage from "@/features/ordenes/pages/ReceptionPage";

import OrdersPage from "@/features/ordenes/pages/OrdersPage";

import OrderDetailPage from "@/features/ordenes/pages/OrderDetailPage";

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
      {
        path: "configuracion/servicios",
        element: <ServicesPage />,
      },
      {
        path: "configuracion/sucursales",
        element: <BranchesPage />,
      },
      {
        path: "caja",
        element: <CashPage />,
      },
      {
        path: "reportes",
        element: <ReportsPage />,
      },
      {
        path: "prendas",
        element: <PrendasPage />,
      },
      {
        path: "clientes",
        element: <ClientesPage />,
      },
      {
        path: "ordenes",
        element: <ReceptionPage />,
      },
      {
        path: "ordenes/listado",
        element: <OrdersPage />,
      },
      {
        path: "ordenes/:id",
        element: <OrderDetailPage />,
      },
    ],
  },
]);

export default router;
