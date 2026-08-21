import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
import { useBranch } from "@/hooks/useBranch";
async function getModuleCodes() { const { data, error } = await supabase.rpc("my_module_permissions"); if (error) throw error; return new Set((data ?? []).map((item: { module_code: string }) => item.module_code)); }
export function useModuleAccess() { const { isGeneralAdmin } = useBranch(); const query = useQuery({ queryKey: ["module-permissions"], queryFn: getModuleCodes }); return { ...query, canAccess: (module: string) => isGeneralAdmin || Boolean(query.data?.has(module)) }; }
