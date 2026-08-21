import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
export interface CashReadiness { ready: boolean; message: string | null; cash_session_id: string | null; }
async function getCashReadiness(branchId: string): Promise<CashReadiness> {
  const { data, error } = await supabase.rpc("cash_readiness", { p_branch_id: branchId });
  if (error) throw error;
  return (data?.[0] ?? { ready: false, message: "No se pudo verificar la caja.", cash_session_id: null }) as CashReadiness;
}
export function useCashReadiness(branchId?: string) { return useQuery({ queryKey: ["cash-readiness", branchId], queryFn: () => getCashReadiness(branchId!), enabled: Boolean(branchId), refetchInterval: 30000 }); }
