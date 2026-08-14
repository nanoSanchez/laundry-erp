import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/infrastructure/supabase/client";

export interface GarmentType {
  id: string;
  code: string;
  name: string;
  price: number;
  active: boolean;
}

async function fetchGarmentTypes(): Promise<GarmentType[]> {
  const { data, error } = await supabase
    .from("garment_types")
    .select("id, code, name, price, active")
    .eq("active", true)
    .order("name");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export function useGarmentTypes() {
  return useQuery({
    queryKey: ["garment_types"],
    queryFn: fetchGarmentTypes,
    staleTime: 1000 * 60 * 5,
  });
}
