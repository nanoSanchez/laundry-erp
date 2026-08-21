import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/infrastructure/supabase/client";

export interface GarmentType {
  id: string;
  code: string;
  name: string;
  price: number;
  active: boolean;
  service_id: string | null;
  service: { id: string; name: string } | null;
}

async function fetchGarmentTypes(): Promise<GarmentType[]> {
  const { data, error } = await supabase
    .from("garment_types")
    .select("id, code, name, price, active, service_id, service:services(id, name)")
    .eq("active", true)
    .not("service_id", "is", null)
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? []).map((garment) => ({
    ...garment,
    // PostgREST puede tipar una relación muchos-a-uno como arreglo;
    // la aplicación usa un único servicio por prenda.
    service: Array.isArray(garment.service) ? garment.service[0] ?? null : garment.service,
  })) as GarmentType[];
}

export function useGarmentTypes() {
  return useQuery({
    queryKey: ["garment_types"],
    queryFn: fetchGarmentTypes,
    staleTime: 1000 * 60 * 5,
  });
}
