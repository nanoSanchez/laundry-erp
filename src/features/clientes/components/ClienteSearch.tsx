import { useEffect, useState, type KeyboardEvent } from "react";

import { useClienteByPhone } from "../hooks/useClienteByPhone";
import { useCreateCliente } from "../hooks/useClienteMutations";

import type { Cliente } from "../types/cliente";

interface Props {
  onSelect: (cliente: Cliente) => void;
}

export default function ClienteSearch({ onSelect }: Props) {
  const [phone, setPhone] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientObservations, setNewClientObservations] = useState("");
  const [createError, setCreateError] = useState("");

  const { data: cliente, isLoading, error } = useClienteByPhone(searchPhone);
  const createClienteMutation = useCreateCliente();
  const searched = searchPhone.length >= 5;

  useEffect(() => {
    if (cliente) {
      onSelect(cliente);
    }
  }, [cliente, onSelect]);

  useEffect(() => {
    if (searched && !isLoading && !error && !cliente) {
      setShowCreateForm(true);
    }
  }, [searched, isLoading, error, cliente]);

  function handleSearch() {
    const normalizedPhone = phone.trim();

    if (normalizedPhone.length < 5) {
      return;
    }

    setShowCreateForm(false);
    setCreateError("");
    setSearchPhone(normalizedPhone);
  }

  async function handleCreateClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newClientName.trim();
    const observations = newClientObservations.trim();
    if (name.length < 2) {
      setCreateError("Ingrese el nombre del cliente.");
      return;
    }

    try {
      const created = await createClienteMutation.mutateAsync({ phone: searchPhone, name, observations });
      onSelect(created);
      setShowCreateForm(false);
      setCreateError("");
      setNewClientName("");
      setNewClientObservations("");
    } catch (creationError) {
      console.error("No se pudo crear el cliente:", creationError);
      setCreateError("No se pudo crear el cliente. Verifique que el celular no esté registrado.");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="cliente-phone-search" className="mb-1 block text-sm font-medium">
          Celular del cliente
        </label>

        <div className="flex gap-2">
          <input
            id="cliente-phone-search"
            type="text"
            value={phone}
            onChange={(event) => { setPhone(event.target.value); setShowCreateForm(false); }}
            onKeyDown={handleKeyDown}
            placeholder="Ej. 71567287"
            className="flex-1 rounded-lg border p-3 outline-none focus:border-blue-500"
          />

          <button
            type="button"
            onClick={handleSearch}
            disabled={phone.trim().length < 5 || isLoading}
            className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
          No se pudo buscar el cliente. Intente nuevamente.
        </div>
      )}

      {searched && !isLoading && !error && !cliente && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="font-medium text-yellow-800">
            No existe un cliente registrado con este número de celular.
          </p>

          <p className="mt-1 text-sm text-yellow-700">Complete los siguientes datos para registrarlo y continuar con la orden.</p>
        </div>
      )}

      {searched && !isLoading && !error && !cliente && showCreateForm && (
        <form onSubmit={handleCreateClient} className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div>
            <p className="font-medium text-blue-900">Registrar nuevo cliente</p>
            <p className="text-sm text-blue-700">Celular: {searchPhone}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Nombre completo</label>
            <input value={newClientName} onChange={(event) => setNewClientName(event.target.value)} required minLength={2} autoFocus className="w-full rounded-lg border bg-white p-3" placeholder="Nombre del cliente" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Observación <span className="font-normal text-slate-400">(opcional)</span></label>
            <textarea value={newClientObservations} onChange={(event) => setNewClientObservations(event.target.value)} rows={2} className="w-full rounded-lg border bg-white p-3" placeholder="Ej. Cliente nuevo, preferencias o referencia" />
          </div>

          {createError && <p className="text-sm text-red-700">{createError}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={createClienteMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{createClienteMutation.isPending ? "Guardando..." : "Crear y seleccionar cliente"}</button>
            <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-white">Cancelar</button>
          </div>
        </form>
      )}

      {cliente && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">Cliente encontrado</p>

          <p className="mt-1 text-lg font-semibold text-green-900">{cliente.name}</p>

          <p className="text-sm text-green-700">{cliente.phone}</p>

          {cliente.observations && (
            <p className="mt-2 text-sm text-green-700">{cliente.observations}</p>
          )}

          {!cliente.active && (
            <p className="mt-2 text-sm font-medium text-red-600">Este cliente está inactivo.</p>
          )}
        </div>
      )}
    </div>
  );
}
