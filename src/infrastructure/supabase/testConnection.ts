import { supabase } from "./client";

export async function testSupabaseConnection() {
  const { data, error } = await supabase.from("test").select("*");

  if (error) {
    console.log("Supabase conectado correctamente, pero tabla test no existe:", error.message);

    return;
  }

  console.log(data);
}
