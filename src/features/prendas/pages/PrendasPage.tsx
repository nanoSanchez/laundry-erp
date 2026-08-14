import { useMemo, useState } from "react";

import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";

import PrendaForm from "../components/PrendaForm";
import { usePrendas } from "../hooks/usePrendas";

import { useSetPrendaStatus } from "../hooks/usePrendaMutations";

import type { Prenda } from "../types/prenda";

export default function PrendasPage() {
  const { data, isLoading, error } = usePrendas();

  const setStatusMutation = useSetPrendaStatus();

  const [search, setSearch] = useState("");

  const [editingPrenda, setEditingPrenda] = useState<Prenda | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  const prendas = data ?? [];

  const filteredPrendas = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return prendas;
    }

    return prendas.filter(
      (prenda) =>
        prenda.code.toLowerCase().includes(term) ||
        prenda.name.toLowerCase().includes(term) ||
        (prenda.description ?? "").toLowerCase().includes(term),
    );
  }, [prendas, search]);

  if (isLoading) {
    return (
      <Card>
        <p>Cargando prendas...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-100 text-red-700">
        <p>Error al cargar las prendas.</p>
      </Card>
    );
  }

  async function handleStatusChange(prenda: Prenda) {
    const action = prenda.active ? "desactivar" : "activar";

    const confirmed = window.confirm(`¿Desea ${action} la prenda "${prenda.name}"?`);

    if (!confirmed) {
      return;
    }

    await setStatusMutation.mutateAsync({
      id: prenda.id,
      active: !prenda.active,
    });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          title="Prendas"
          subtitle={`Mostrando ${filteredPrendas.length} de ${prendas.length} prendas`}
        />

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Nueva prenda
        </button>
      </div>

      <Card>
        <label htmlFor="prenda-search" className="mb-2 block text-sm font-medium">
          Buscar prenda
        </label>

        <input
          id="prenda-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por código, nombre o descripción..."
          className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
        />
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>

                <th className="px-4 py-3 text-left">Prenda</th>

                <th className="px-4 py-3 text-right">Precio</th>

                <th className="px-4 py-3 text-center">Estado</th>

                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredPrendas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    {search ? "No se encontraron prendas." : "No existen prendas registradas."}
                  </td>
                </tr>
              ) : (
                filteredPrendas.map((prenda) => (
                  <tr key={prenda.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{prenda.code}</td>

                    <td className="px-4 py-3">
                      <p>{prenda.name}</p>

                      {prenda.description && (
                        <p className="text-sm text-slate-500">{prenda.description}</p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">Bs {prenda.price.toFixed(2)}</td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          prenda.active
                            ? "rounded-full bg-green-100 px-3 py-1 text-sm text-green-700"
                            : "rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
                        }
                      >
                        {prenda.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPrenda(prenda)}
                          className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={setStatusMutation.isPending}
                          onClick={() => handleStatusChange(prenda)}
                          className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                          {prenda.active ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showCreate} title="Nueva prenda" onClose={() => setShowCreate(false)}>
        <PrendaForm onSuccess={() => setShowCreate(false)} />
      </Modal>

      <Modal
        open={Boolean(editingPrenda)}
        title="Editar prenda"
        onClose={() => setEditingPrenda(null)}
      >
        <PrendaForm prenda={editingPrenda} onSuccess={() => setEditingPrenda(null)} />
      </Modal>
    </section>
  );
}
