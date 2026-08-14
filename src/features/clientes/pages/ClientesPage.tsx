import { useMemo, useState } from "react";

import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";

import ClienteForm from "../components/ClienteForm";

import { useClientes } from "../hooks/useClientes";
import { useSetClienteStatus } from "../hooks/useClienteMutations";

import type { Cliente } from "../types/cliente";

export default function ClientesPage() {
  const { data, isLoading, error } = useClientes();

  const setStatusMutation = useSetClienteStatus();

  const [search, setSearch] = useState("");

  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  const clientes = data ?? [];

  const filteredClientes = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return clientes;
    }

    return clientes.filter(
      (cliente) =>
        cliente.name.toLowerCase().includes(term) || cliente.phone.toLowerCase().includes(term),
    );
  }, [clientes, search]);

  if (isLoading) {
    return (
      <Card>
        <p>Cargando clientes...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-100 text-red-700">
        <p>Error al cargar los clientes.</p>
      </Card>
    );
  }

  async function handleStatusChange(cliente: Cliente) {
    const action = cliente.active ? "desactivar" : "activar";

    const confirmed = window.confirm(`¿Desea ${action} al cliente "${cliente.name}"?`);

    if (!confirmed) {
      return;
    }

    await setStatusMutation.mutateAsync({
      id: cliente.id,
      active: !cliente.active,
    });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          title="Clientes"
          subtitle={`Mostrando ${filteredClientes.length} de ${clientes.length} clientes`}
        />

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Nuevo cliente
        </button>
      </div>

      <Card>
        <label htmlFor="cliente-search" className="mb-2 block text-sm font-medium">
          Buscar cliente
        </label>

        <input
          id="cliente-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o celular..."
          className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
        />
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Celular</th>

                <th className="px-4 py-3 text-left">Cliente</th>

                <th className="px-4 py-3 text-left">Observaciones</th>

                <th className="px-4 py-3 text-center">Estado</th>

                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    {search ? "No se encontraron clientes." : "No existen clientes registrados."}
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{cliente.phone}</td>

                    <td className="px-4 py-3">{cliente.name}</td>

                    <td className="px-4 py-3 text-sm text-slate-500">
                      {cliente.observations || "—"}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          cliente.active
                            ? "rounded-full bg-green-100 px-3 py-1 text-sm text-green-700"
                            : "rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
                        }
                      >
                        {cliente.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingCliente(cliente)}
                          className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={setStatusMutation.isPending}
                          onClick={() => handleStatusChange(cliente)}
                          className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                          {cliente.active ? "Desactivar" : "Activar"}
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

      <Modal open={showCreate} title="Nuevo cliente" onClose={() => setShowCreate(false)}>
        <ClienteForm onSuccess={() => setShowCreate(false)} />
      </Modal>

      <Modal
        open={Boolean(editingCliente)}
        title="Editar cliente"
        onClose={() => setEditingCliente(null)}
      >
        <ClienteForm cliente={editingCliente} onSuccess={() => setEditingCliente(null)} />
      </Modal>
    </section>
  );
}
