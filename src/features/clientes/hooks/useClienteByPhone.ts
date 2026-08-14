import { useQuery } from "@tanstack/react-query";

import { getClienteByPhone } from "../services/cliente.service";

export function useClienteByPhone(phone: string) {
  const normalizedPhone = phone.trim();

  return useQuery({
    queryKey: ["cliente-by-phone", normalizedPhone],
    queryFn: () => getClienteByPhone(normalizedPhone),
    enabled: normalizedPhone.length >= 5,
  });
}
