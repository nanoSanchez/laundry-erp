import { Navigate } from "react-router-dom";
import { useModuleAccess } from "@/hooks/useModuleAccess";
export default function ModuleRequired({ module, children }: { module: string; children: React.ReactNode }) { const { isLoading, canAccess } = useModuleAccess(); if (isLoading) return <div className="p-6 text-slate-500">Verificando permisos...</div>; return canAccess(module) ? <>{children}</> : <Navigate to="/" replace />; }
