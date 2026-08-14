import { supabase } from "@/infrastructure/supabase/client";

import type { Cliente, CreateCliente, UpdateCliente } from "../types/cliente";

const TABLE = "clients";

export async function getClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase.from(TABLE).select("*").order("name");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getClienteByPhone(phone: string): Promise<Cliente | null> {
  const normalizedPhone = phone.trim();

  if (!normalizedPhone) {
    return null;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createCliente(cliente: CreateCliente): Promise<void> {
  const { error } = await supabase.from(TABLE).insert(cliente);

  if (error) {
    throw error;
  }
}

export async function updateCliente(id: string, cliente: UpdateCliente): Promise<void> {
  const { error } = await supabase.from(TABLE).update(cliente).eq("id", id);

  if (error) {
    throw error;
  }
}

export async function setClienteStatus(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ active }).eq("id", id);

  if (error) {
    throw error;
  }
}
