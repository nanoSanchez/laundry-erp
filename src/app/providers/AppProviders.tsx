import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { BranchProvider } from "@/contexts/BranchContext";

interface Props {
  children: ReactNode;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function AppProviders({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider><BranchProvider>{children}</BranchProvider></AuthProvider>
    </QueryClientProvider>
  );
}
