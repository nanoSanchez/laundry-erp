import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return Response.json({ error: "No autorizado." }, { status: 401, headers: corsHeaders });
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado." }, { status: 401, headers: corsHeaders });
  const { data: permission } = await client.rpc("my_branch_access_context");
  if (!permission?.[0]?.is_general_admin) return Response.json({ error: "Solo el administrador general puede crear usuarios." }, { status: 403, headers: corsHeaders });
  const payload = await request.json();
  const { action = "create", userId, email, password, firstName, lastName, username, phone, address, birthDate } = payload;
  if (action === "create" && (!email || !password || password.length < 8 || !username)) return Response.json({ error: "Correo, nombre de usuario y contraseña de al menos 8 caracteres son obligatorios." }, { status: 400, headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const user_metadata = { full_name: `${firstName ?? ""} ${lastName ?? ""}`.trim(), first_name: firstName ?? "", last_name: lastName ?? "", username: username ?? "", phone: phone ?? "", address: address ?? "", birth_date: birthDate ?? "" };
  if (action === "update") {
    if (!userId) return Response.json({ error: "Usuario no válido." }, { status: 400, headers: corsHeaders });
    const update: { email?: string; password?: string; user_metadata: typeof user_metadata } = { user_metadata };
    if (email) update.email = email;
    if (password) { if (password.length < 8) return Response.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400, headers: corsHeaders }); update.password = password; }
    const { error } = await admin.auth.admin.updateUserById(userId, update);
    if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
    return Response.json({ userId }, { headers: corsHeaders });
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata });
  if (error) return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  return Response.json({ userId: data.user.id }, { headers: corsHeaders });
});
