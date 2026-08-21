import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBranch } from "@/hooks/useBranch";

export default function BranchSelectionPage() {
  const navigate = useNavigate(); const { user, signOut } = useAuth(); const { branches, activeBranch, loading, error, selectBranch } = useBranch();
  if (!user) return <Navigate to="/login" replace />;
  if (activeBranch) return <Navigate to="/" replace />;
  if (loading) return <div className="flex min-h-screen items-center justify-center">Cargando sucursales...</div>;
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4"><section className="w-full max-w-lg rounded-xl bg-white p-8 shadow-lg"><h1 className="text-3xl font-bold">Selecciona una sucursal</h1><p className="mt-2 text-slate-500">Elige la sucursal con la que trabajarás en esta sesión.</p>
    {error ? <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-800"><p className="font-semibold">No se pudo verificar el acceso a sucursales.</p><p className="mt-1 text-sm">{error}</p></div> : branches.length === 0 ? <div className="mt-6 rounded-lg bg-amber-50 p-4 text-amber-800">No tienes sucursales asignadas. Solicita acceso a un administrador general.</div> : <div className="mt-6 space-y-3">{branches.map((branch) => <button key={branch.id} onClick={() => { selectBranch(branch); navigate("/", { replace: true }); }} className="w-full rounded-lg border p-4 text-left hover:border-blue-500 hover:bg-blue-50"><p className="font-semibold">{branch.name}</p><p className="text-sm text-slate-500">Código: {branch.code}</p></button>)}</div>}
    <button onClick={() => void signOut()} className="mt-6 text-sm text-slate-600 underline">Cerrar sesión</button>
  </section></main>;
}
