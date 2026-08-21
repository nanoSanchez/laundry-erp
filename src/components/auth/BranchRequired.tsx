import { Navigate } from "react-router-dom";
import { useBranch } from "@/hooks/useBranch";
export default function BranchRequired({ children }: { children: React.ReactNode }) {
  const { loading, activeBranch } = useBranch();
  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Cargando sucursales...</div>;
  if (!activeBranch) return <Navigate to="/seleccionar-sucursal" replace />;
  return <>{children}</>;
}
