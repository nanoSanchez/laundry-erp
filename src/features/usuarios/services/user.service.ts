import { supabase } from "@/infrastructure/supabase/client";

const schema = supabase.schema("laundry" as never);
export interface AppUser { user_id: string; full_name: string | null; first_name: string | null; last_name: string | null; username: string | null; email: string; phone: string | null; address: string | null; birth_date: string | null; is_active: boolean; is_general_admin: boolean; branch_ids: string[]; module_codes: string[]; }
export interface UserData { email: string; password: string; firstName: string; lastName: string; username?: string; phone: string; address: string; birthDate: string; isGeneralAdmin: boolean; branchIds: string[]; moduleCodes: string[]; }
export interface AppModule { code: string; name: string; description: string | null; sort_order: number; }

export async function getUsers(): Promise<AppUser[]> {
  const [{ data: profiles, error: profileError }, { data: permissions, error: permissionError }, { data: branches, error: branchError }, { data: modules, error: moduleError }] = await Promise.all([
    schema.from("user_profiles").select("*"), schema.from("user_permissions").select("user_id, is_general_admin"), schema.from("user_branch_access").select("user_id, branch_id"), schema.from("user_module_access").select("user_id, module_code"),
  ]);
  if (profileError || permissionError || branchError || moduleError) throw profileError ?? permissionError ?? branchError ?? moduleError;
  return (profiles ?? []).map((profile) => ({ user_id: profile.user_id, full_name: profile.full_name, first_name: profile.first_name, last_name: profile.last_name, username: profile.username, email: profile.email, phone: profile.phone, address: profile.address, birth_date: profile.birth_date, is_active: profile.is_active, is_general_admin: Boolean((permissions ?? []).find((item) => item.user_id === profile.user_id)?.is_general_admin), branch_ids: (branches ?? []).filter((item) => item.user_id === profile.user_id).map((item) => item.branch_id), module_codes: (modules ?? []).filter((item) => item.user_id === profile.user_id).map((item) => item.module_code) }));
}
export async function getModules(): Promise<AppModule[]> { const { data, error } = await schema.from("modules").select("*").order("sort_order"); if (error) throw error; return data as AppModule[]; }
export async function createUser(input: UserData) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "create", ...input } });
  if (error) throw error; if (data?.error) throw new Error(data.error);
  await saveUserAccess(data.userId, input);
}
export async function updateUser(userId: string, input: UserData) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "update", userId, ...input, username: undefined } });
  if (error) throw error; if (data?.error) throw new Error(data.error);
  const full_name = `${input.firstName} ${input.lastName}`.trim();
  const { error: profileError } = await schema.from("user_profiles").update({ full_name, email: input.email, first_name: input.firstName, last_name: input.lastName, phone: input.phone || null, address: input.address || null, birth_date: input.birthDate || null }).eq("user_id", userId);
  if (profileError) throw profileError;
  await saveUserAccess(userId, input);
}
export async function saveUserAccess(userId: string, input: { isGeneralAdmin: boolean; branchIds: string[]; moduleCodes: string[] }) {
  const { error: permissionError } = await schema.from("user_permissions").upsert({ user_id: userId, is_general_admin: input.isGeneralAdmin });
  if (permissionError) throw permissionError;
  const [{ error: clearBranches }, { error: clearModules }] = await Promise.all([schema.from("user_branch_access").delete().eq("user_id", userId), schema.from("user_module_access").delete().eq("user_id", userId)]);
  if (clearBranches || clearModules) throw clearBranches ?? clearModules;
  if (input.branchIds.length) { const { error } = await schema.from("user_branch_access").insert(input.branchIds.map((branch_id) => ({ user_id: userId, branch_id }))); if (error) throw error; }
  if (input.moduleCodes.length && !input.isGeneralAdmin) { const { error } = await schema.from("user_module_access").insert(input.moduleCodes.map((module_code) => ({ user_id: userId, module_code }))); if (error) throw error; }
}
export async function setUserStatus(userId: string, isActive: boolean) { const { error } = await schema.from("user_profiles").update({ is_active: isActive }).eq("user_id", userId); if (error) throw error; }
