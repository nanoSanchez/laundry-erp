import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const menu = [
    { name: "Dashboard", path: "/" },
    { name: "Clientes", path: "/clientes" },
    { name: "Recepción", path: "/ordenes" },
    { name: "Pagos", path: "/pagos" },
    { name: "Caja", path: "/caja" },
    { name: "Reportes", path: "/reportes" },
    { name: "Configuración", path: "/configuracion" },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-700 p-6">
        <h2 className="text-2xl font-bold">Laundry ERP</h2>

        <p className="text-sm text-slate-400">Versión 1.0</p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block rounded-lg px-4 py-3 transition ${
                isActive ? "bg-blue-600" : "hover:bg-slate-800"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
