import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createBranch, setBranchStatus, updateBranch, uploadBranchLogo } from "../services/branch.service";

function useRefreshBranches() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["branches"] });
}

export function useCreateBranch() {
  const refresh = useRefreshBranches();
  return useMutation({ mutationFn: createBranch, onSuccess: refresh });
}

export function useUpdateBranch() {
  const refresh = useRefreshBranches();
  return useMutation({ mutationFn: ({ id, branch }: { id: string; branch: Parameters<typeof updateBranch>[1] }) => updateBranch(id, branch), onSuccess: refresh });
}

export function useSetBranchStatus() {
  const refresh = useRefreshBranches();
  return useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setBranchStatus(id, isActive), onSuccess: refresh });
}

export function useUploadBranchLogo() {
  const refresh = useRefreshBranches();
  return useMutation({ mutationFn: ({ branchId, file }: { branchId: string; file: File }) => uploadBranchLogo(branchId, file), onSuccess: refresh });
}
