import { useState } from "react";
import { NavLink } from "react-router-dom";

import { useModuleAccess } from "@/hooks/useModuleAccess";

interface MenuItem { name: string; path: string; module: string; }

const operationMenu: MenuItem[] = [
  { name: "Dashboard", path: "/", module: "dashboard" },
  { name: "Recepción", path: "/ordenes", module: "reception" },
  { name: "Órdenes", path: "/ordenes/listado", module: "orders" },
  { name: "Caja", path: "/caja", module: "cash" },
  { name: "Ingresos y egresos extra", path: "/ingresos-egresos-extra", module: "extra_income_expenses" },
  { name: "Reportes", path: "/reportes", module: "reports" },
];

const configurationMenu: MenuItem[] = [
  { name: "Clientes", path: "/clientes", module: "customers" },
  { name: "Prendas", path: "/prendas", module: "garments" },
  { name: "Servicios", path: "/configuracion/servicios", module: "services" },
  { name: "Sucursales", path: "/configuracion/sucursales", module: "branches" },
  { name: "Usuarios", path: "/configuracion/usuarios", module: "users" },
];

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { isLoading, canAccess } = useModuleAccess();
  const [configurationOpen, setConfigurationOpen] = useState(true);
  const allowedOperation = operationMenu.filter((item) => canAccess(item.module));
  const allowedConfiguration = configurationMenu.filter((item) => canAccess(item.module));

  return <>
    {mobileOpen && <button type="button" aria-label="Cerrar menú" onClick={onClose} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col bg-slate-900 text-white shadow-xl transition-transform lg:static lg:w-64 lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
    <div className="flex items-start justify-between border-b border-slate-700 p-6"><div><h2 className="text-2xl font-bold">Laundry ERP</h2><p className="text-sm text-slate-400">Versión 1.0</p></div><button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl hover:bg-slate-800 lg:hidden" aria-label="Cerrar menú">×</button></div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-4">
      {!isLoading && <>
        {allowedOperation.map((item) => <MenuLink key={item.path} item={item} onNavigate={onClose} />)}
        {allowedConfiguration.length > 0 && <div className="mt-4 border-t border-slate-700 pt-3"><button type="button" onClick={() => setConfigurationOpen((open) => !open)} className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left font-medium text-slate-200 hover:bg-slate-800"><span>Configuración</span><span aria-hidden="true">{configurationOpen ? "⌄" : "›"}</span></button>{configurationOpen && <div className="mt-1 space-y-1 border-l border-slate-700 pl-3">{allowedConfiguration.map((item) => <MenuLink key={item.path} item={item} nested onNavigate={onClose} />)}</div>}</div>}
      </>}
    </nav>
  </aside></>;
}

function MenuLink({ item, nested = false, onNavigate }: { item: MenuItem; nested?: boolean; onNavigate: () => void }) {
  return <NavLink to={item.path} onClick={onNavigate} end={item.path === "/"} className={({ isActive }) => `block rounded-lg ${nested ? "px-3 py-2 text-sm" : "px-4 py-3"} transition ${isActive ? "bg-blue-600 text-white" : "text-slate-100 hover:bg-slate-800"}`}>{item.name}</NavLink>;
}
