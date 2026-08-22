import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useBranch } from "@/hooks/useBranch";

export default function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const navigate = useNavigate();

  const { user, signOut } = useAuth();
  const { activeBranch, clearBranch } = useBranch();

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
    <header className="flex min-h-16 items-center justify-between gap-3 border-b bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onOpenMenu} className="rounded-lg p-2 text-xl text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Abrir menú">☰</button>
        <div className="min-w-0"><h1 className="truncate text-lg font-semibold text-slate-800 sm:text-xl">Laundry ERP</h1>
        <p className="truncate text-xs text-slate-500 capitalize sm:text-sm">{activeBranch?.name} <span className="hidden sm:inline">· {today}</span></p></div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button onClick={() => { clearBranch(); navigate("/seleccionar-sucursal", { replace: true }); }} className="text-xs font-medium text-blue-700 hover:underline sm:text-sm">Cambiar<span className="hidden sm:inline"> sucursal</span></button>
        <div className="hidden text-right md:block">
          <p className="font-medium">{user?.email}</p>

          <p className="text-sm text-slate-500">Administrador</p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition hover:bg-red-700 sm:px-4"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
