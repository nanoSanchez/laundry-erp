import { useQuery } from "@tanstack/react-query";

import { getPrendas } from "../services/prenda.service";

export function usePrendas() {
  return useQuery({
    queryKey: ["prendas"],
    queryFn: getPrendas,
  });
}
