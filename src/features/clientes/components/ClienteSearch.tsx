import { useEffect, useState, type KeyboardEvent } from "react";

import { useClienteByPhone } from "../hooks/useClienteByPhone";

import type { Cliente } from "../types/cliente";

interface Props {
  onSelect: (cliente: Cliente) => void;
  onCreateNew?: (phone: string) => void;
}

export default function ClienteSearch({ onSelect, onCreateNew }: Props) {
  const [phone, setPhone] = useState("");
  const [searchPhone, setSearchPhone] = useState("");

  const { data: cliente, isLoading, error } = useClienteByPhone(searchPhone);

  useEffect(() => {
    if (cliente) {
      onSelect(cliente);
    }
  }, [cliente, onSelect]);

  function handleSearch() {
    const normalizedPhone = phone.trim();

    if (normalizedPhone.length < 5) {
      return;
    }

    setSearchPhone(normalizedPhone);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  }

  const searched = searchPhone.length >= 5;

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
            onChange={(event) => setPhone(event.target.value)}
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

          {onCreateNew && (
            <button
              type="button"
              onClick={() => onCreateNew(searchPhone)}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Crear nuevo cliente
            </button>
          )}
        </div>
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
