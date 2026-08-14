import { useQuery } from "@tanstack/react-query";

import { getClientes } from "../services/cliente.service";

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: getClientes,
  });
}
