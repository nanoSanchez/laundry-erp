import { useMemo, useState } from "react";

import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";

import ServiceForm from "../components/ServiceForm";
import { useSetServiceStatus } from "../hooks/useServiceMutations";
import { useServices } from "../hooks/useServices";

import type { Service } from "../types/service";

export default function ServicesPage() {
  const { data, isLoading, error } = useServices();

  const setStatusMutation = useSetServiceStatus();

  const [search, setSearch] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const services = data ?? [];

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return services;
    }

    return services.filter((service) => {
      return (
        service.code.toLowerCase().includes(term) ||
        service.name.toLowerCase().includes(term) ||
        (service.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [services, search]);

  if (isLoading) {
    return (
      <Card>
        <p>Cargando servicios...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-100 text-red-700">
        <p>Error al cargar los servicios.</p>
      </Card>
    );
  }

  async function handleStatusChange(service: Service) {
    const action = service.active ? "desactivar" : "activar";

    const confirmed = window.confirm(`¿Desea ${action} el servicio "${service.name}"?`);

    if (!confirmed) {
      return;
    }

    await setStatusMutation.mutateAsync({
      id: service.id,
      active: !service.active,
    });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          title="Servicios"
          subtitle={`Mostrando ${filteredServices.length} de ${services.length} servicios`}
        />

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Nuevo servicio
        </button>
      </div>

      <Card>
        <div>
          <label htmlFor="service-search" className="mb-2 block text-sm font-medium">
            Buscar servicio
          </label>

          <input
            id="service-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código, nombre o descripción..."
            className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
          />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>

                <th className="px-4 py-3 text-left">Nombre</th>

                <th className="px-4 py-3 text-right">Precio</th>

                <th className="px-4 py-3 text-center">Estado</th>

                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    {search ? "No se encontraron servicios." : "No existen servicios registrados."}
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr key={service.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{service.code}</td>

                    <td className="px-4 py-3">
                      <div>
                        <p>{service.name}</p>

                        {service.description && (
                          <p className="text-sm text-slate-500">{service.description}</p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">Bs {service.price.toFixed(2)}</td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          service.active
                            ? "rounded-full bg-green-100 px-3 py-1 text-sm text-green-700"
                            : "rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
                        }
                      >
                        {service.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingService(service)}
                          className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={setStatusMutation.isPending}
                          onClick={() => handleStatusChange(service)}
                          className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                          {service.active ? "Desactivar" : "Activar"}
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

      <Modal open={showCreate} title="Nuevo servicio" onClose={() => setShowCreate(false)}>
        <ServiceForm onSuccess={() => setShowCreate(false)} />
      </Modal>

      <Modal
        open={Boolean(editingService)}
        title="Editar servicio"
        onClose={() => setEditingService(null)}
      >
        <ServiceForm service={editingService} onSuccess={() => setEditingService(null)} />
      </Modal>
    </section>
  );
}
