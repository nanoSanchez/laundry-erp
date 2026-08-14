import { useQuery } from "@tanstack/react-query";

import { getServices } from "../services/service.service";

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });
}
