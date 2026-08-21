import { createBrowserRouter } from "react-router-dom";

import MainLayout from "@/app/layouts/MainLayout";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import BranchRequired from "@/components/auth/BranchRequired";
import ModuleRequired from "@/components/auth/ModuleRequired";

import LoginPage from "@/features/auth/pages/LoginPage";
import BranchSelectionPage from "@/features/auth/pages/BranchSelectionPage";

import DashboardPage from "@/features/dashboard/pages/DashboardPage";

import ServicesPage from "@/features/configuracion/servicios/pages/ServicesPage";

import BranchesPage from "@/features/configuracion/sucursales/pages/BranchesPage";
import CashPage from "@/features/caja/pages/CashPage";
import ExtraIncomeExpensesPage from "@/features/ingresos-egresos/pages/ExtraIncomeExpensesPage";
import ReportsPage from "@/features/reportes/pages/ReportsPage";

import PrendasPage from "@/features/prendas/pages/PrendasPage";

import ClientesPage from "@/features/clientes/pages/ClientesPage";

import ReceptionPage from "@/features/ordenes/pages/ReceptionPage";

import OrdersPage from "@/features/ordenes/pages/OrdersPage";

import OrderDetailPage from "@/features/ordenes/pages/OrderDetailPage";
import UsersPage from "@/features/usuarios/pages/UsersPage";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  { path: "/seleccionar-sucursal", element: <ProtectedRoute><BranchSelectionPage /></ProtectedRoute> },
  {
    path: "/",
    element: (
      <ProtectedRoute><BranchRequired><MainLayout /></BranchRequired></ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ModuleRequired module="dashboard"><DashboardPage /></ModuleRequired>,
      },
      {
        path: "configuracion/servicios",
        element: <ModuleRequired module="services"><ServicesPage /></ModuleRequired>,
      },
      {
        path: "configuracion/sucursales",
        element: <ModuleRequired module="branches"><BranchesPage /></ModuleRequired>,
      },
      {
        path: "caja",
        element: <ModuleRequired module="cash"><CashPage /></ModuleRequired>,
      },
      {
        path: "ingresos-egresos-extra",
        element: <ModuleRequired module="extra_income_expenses"><ExtraIncomeExpensesPage /></ModuleRequired>,
      },
      {
        path: "reportes",
        element: <ModuleRequired module="reports"><ReportsPage /></ModuleRequired>,
      },
      {
        path: "prendas",
        element: <ModuleRequired module="garments"><PrendasPage /></ModuleRequired>,
      },
      {
        path: "clientes",
        element: <ModuleRequired module="customers"><ClientesPage /></ModuleRequired>,
      },
      {
        path: "ordenes",
        element: <ModuleRequired module="reception"><ReceptionPage /></ModuleRequired>,
      },
      {
        path: "ordenes/listado",
        element: <ModuleRequired module="orders"><OrdersPage /></ModuleRequired>,
      },
      {
        path: "ordenes/:id",
        element: <ModuleRequired module="orders"><OrderDetailPage /></ModuleRequired>,
      },
      {
        path: "configuracion/usuarios",
        element: <ModuleRequired module="users"><UsersPage /></ModuleRequired>,
      },
    ],
  },
]);

export default router;
