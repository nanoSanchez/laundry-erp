import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

export default function TopBar() {
  const navigate = useNavigate();

  const { user, signOut } = useAuth();

  const today = new Date().toLocaleDateString("es-BO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Laundry ERP</h1>

        <p className="text-sm text-slate-500 capitalize">{today}</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="font-medium">{user?.email}</p>

          <p className="text-sm text-slate-500">Administrador</p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
