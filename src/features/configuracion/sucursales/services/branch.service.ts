import { supabase } from "@/infrastructure/supabase/client";

import type { Branch, BranchInput } from "../types/branch";

const BRANCHES_SCHEMA = supabase.schema("laundry" as never);
const BUCKET = "branch-logos";

export async function getBranches(): Promise<Branch[]> {
  const { data, error } = await BRANCHES_SCHEMA.from("branches").select("*").order("name");

  if (error) throw error;
  return (data ?? []) as Branch[];
}

export async function createBranch(branch: BranchInput): Promise<Branch> {
  const { data, error } = await BRANCHES_SCHEMA.from("branches").insert(branch).select().single();
  if (error) throw error;
  return data as Branch;
}

export async function updateBranch(id: string, branch: BranchInput): Promise<void> {
  const { error } = await BRANCHES_SCHEMA.from("branches").update(branch).eq("id", id);
  if (error) throw error;
}

export async function setBranchStatus(id: string, is_active: boolean): Promise<void> {
  const { error } = await BRANCHES_SCHEMA.from("branches").update({ is_active }).eq("id", id);
  if (error) throw error;
}

export async function uploadBranchLogo(branchId: string, file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${branchId}/logo.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw error;

  const { error: updateError } = await BRANCHES_SCHEMA.from("branches").update({ logo_path: path }).eq("id", branchId);
  if (updateError) throw updateError;

  return path;
}

export function getBranchLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(logoPath).data.publicUrl;
}
