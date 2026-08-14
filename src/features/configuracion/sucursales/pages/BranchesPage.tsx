import { useState } from "react";

import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";

import BranchForm from "../components/BranchForm";
import { useSetBranchStatus } from "../hooks/useBranchMutations";
import { useBranches } from "../hooks/useBranches";
import { getBranchLogoUrl } from "../services/branch.service";
import type { Branch } from "../types/branch";

export default function BranchesPage() {
  const { data, isLoading, error } = useBranches();
  const setStatus = useSetBranchStatus();
  const [editing, setEditing] = useState<Branch | null>(null);
  const [creating, setCreating] = useState(false);
  const branches = data ?? [];

  async function changeStatus(branch: Branch) {
    const action = branch.is_active ? "desactivar" : "activar";
    if (!window.confirm(`¿Desea ${action} la sucursal "${branch.name}"?`)) return;
    await setStatus.mutateAsync({ id: branch.id, isActive: !branch.is_active });
  }

  if (isLoading) return <Card><p>Cargando sucursales...</p></Card>;
  if (error) return <Card className="bg-red-100 text-red-700"><p>No se pudieron cargar las sucursales. Verifica que el esquema <code>laundry</code> esté expuesto en Supabase y ejecuta las migraciones 005 y 006.</p></Card>;

  return <section className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <PageHeader title="Sucursales" subtitle={`${branches.length} sucursal${branches.length === 1 ? "" : "es"} registrada${branches.length === 1 ? "" : "s"}`} />
      <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700">+ Nueva sucursal</button>
    </div>
    <Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="min-w-full">
      <thead className="bg-slate-100"><tr><th className="px-4 py-3 text-left">Logo</th><th className="px-4 py-3 text-left">Sucursal</th><th className="px-4 py-3 text-left">Contacto</th><th className="px-4 py-3 text-center">Estado</th><th className="px-4 py-3 text-center">Acciones</th></tr></thead>
      <tbody>{branches.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No existen sucursales registradas.</td></tr> : branches.map((branch) => {
        const logoUrl = getBranchLogoUrl(branch.logo_path);
        return <tr key={branch.id} className="border-t">
          <td className="px-4 py-3">{logoUrl ? <img src={logoUrl} alt={`Logo de ${branch.name}`} className="h-10 w-10 rounded-lg border object-contain" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">Sin logo</div>}</td>
          <td className="px-4 py-3"><p className="font-medium">{branch.name}</p><p className="text-sm text-slate-500">{branch.company_name ?? "Empresa no registrada"}</p><p className="text-sm text-slate-500">{branch.code} · NIT: {branch.nit ?? "—"}</p></td>
          <td className="px-4 py-3 text-sm">{branch.phone && <p>{branch.phone}</p>}{branch.email && <p>{branch.email}</p>}{branch.address && <p className="text-slate-500">{branch.address}</p>}</td>
          <td className="px-4 py-3 text-center"><span className={branch.is_active ? "rounded-full bg-green-100 px-3 py-1 text-sm text-green-700" : "rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"}>{branch.is_active ? "Activa" : "Inactiva"}</span></td>
          <td className="px-4 py-3"><div className="flex justify-center gap-2"><button type="button" onClick={() => setEditing(branch)} className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50">Editar</button><button type="button" disabled={setStatus.isPending} onClick={() => changeStatus(branch)} className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50">{branch.is_active ? "Desactivar" : "Activar"}</button></div></td>
        </tr>;
      })}</tbody>
    </table></div></Card>
    <Modal open={creating} title="Nueva sucursal" onClose={() => setCreating(false)}><BranchForm onSuccess={() => setCreating(false)} /></Modal>
    <Modal open={Boolean(editing)} title="Editar sucursal" onClose={() => setEditing(null)}><BranchForm branch={editing} onSuccess={() => setEditing(null)} /></Modal>
  </section>;
}
