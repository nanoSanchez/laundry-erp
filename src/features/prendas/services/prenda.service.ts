import { supabase } from "@/infrastructure/supabase/client";

import type { CreatePrenda, Prenda, UpdatePrenda } from "../types/prenda";

const TABLE = "garment_types";

export async function getPrendas(): Promise<Prenda[]> {
  const { data, error } = await supabase.from(TABLE).select("*").order("name");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createPrenda(prenda: CreatePrenda): Promise<void> {
  const { error } = await supabase.from(TABLE).insert(prenda);

  if (error) {
    throw error;
  }
}

export async function updatePrenda(id: string, prenda: UpdatePrenda): Promise<void> {
  const { error } = await supabase.from(TABLE).update(prenda).eq("id", id);

  if (error) {
    throw error;
  }
}

export async function setPrendaStatus(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ active }).eq("id", id);

  if (error) {
    throw error;
  }
}
