import { supabase } from "@/infrastructure/supabase/client";

import type { CreateService, Service, UpdateService } from "../types/service";

const TABLE = "services";

export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabase.from(TABLE).select("*").order("name");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getServiceById(id: string): Promise<Service> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createService(service: CreateService): Promise<void> {
  console.log("Intentando crear servicio:", service);

  const { data, error } = await supabase.from(TABLE).insert(service).select().single();

  console.log("Respuesta Supabase:", {
    data,
    error,
  });

  if (error) {
    throw error;
  }
}

export async function updateService(id: string, service: UpdateService): Promise<void> {
  const { error } = await supabase.from(TABLE).update(service).eq("id", id);

  if (error) {
    throw error;
  }
}

export async function setServiceStatus(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ active }).eq("id", id);

  if (error) {
    throw error;
  }
}
