import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { username, password } = await request.json();
  const invalid = () => Response.json({ error: "Nombre de usuario o contraseña incorrectos." }, { status: 401, headers: corsHeaders });
  if (!username || !password) return invalid();

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: profiles } = await admin.rpc("login_username_lookup", { p_username: String(username) });
  const profile = profiles?.[0];
  if (!profile?.is_active) return invalid();

  const auth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await auth.auth.signInWithPassword({ email: profile.email, password });
  if (error || !data.session) return invalid();
  return Response.json({ session: data.session }, { headers: corsHeaders });
});
