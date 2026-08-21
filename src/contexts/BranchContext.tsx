import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/infrastructure/supabase/client";

export interface ActiveBranch { id: string; code: string; name: string; is_active: boolean; }
interface BranchContextType {
  branches: ActiveBranch[];
  activeBranch: ActiveBranch | null;
  isGeneralAdmin: boolean;
  loading: boolean;
  error: string | null;
  selectBranch: (branch: ActiveBranch) => void;
  clearBranch: () => void;
}
const BranchContext = createContext<BranchContextType | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [branches, setBranches] = useState<ActiveBranch[]>([]);
  const [activeBranch, setActiveBranch] = useState<ActiveBranch | null>(null);
  const [isGeneralAdmin, setIsGeneralAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) { setBranches([]); setActiveBranch(null); setIsGeneralAdmin(false); setError(null); setLoading(false); return; }
      setLoading(true);
      const [{ data: allowed, error: branchError }, { data: access, error: accessError }] = await Promise.all([
        supabase.rpc("my_accessible_branches"), supabase.rpc("my_branch_access_context"),
      ]);
      if (branchError || accessError) {
        setBranches([]); setActiveBranch(null); setIsGeneralAdmin(false);
        setError(branchError?.message ?? accessError?.message ?? "No se pudo consultar el acceso a sucursales.");
        setLoading(false); return;
      }
      const nextBranches = (allowed ?? []) as ActiveBranch[];
      setError(null); setBranches(nextBranches); setIsGeneralAdmin(Boolean(access?.[0]?.is_general_admin));
      const storedId = sessionStorage.getItem(`laundry-active-branch-${user.id}`);
      setActiveBranch(nextBranches.find((branch) => branch.id === storedId) ?? null);
      setLoading(false);
    }
    void load();
  }, [user]);

  const value = useMemo(() => ({ branches, activeBranch, isGeneralAdmin, loading, error,
    selectBranch: (branch: ActiveBranch) => { setActiveBranch(branch); if (user) sessionStorage.setItem(`laundry-active-branch-${user.id}`, branch.id); },
    clearBranch: () => { setActiveBranch(null); if (user) sessionStorage.removeItem(`laundry-active-branch-${user.id}`); },
  }), [branches, activeBranch, isGeneralAdmin, loading, error, user]);
  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}
export function useBranchContext() { const context = useContext(BranchContext); if (!context) throw new Error("useBranchContext debe utilizarse dentro de BranchProvider"); return context; }
