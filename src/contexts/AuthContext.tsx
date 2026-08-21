import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/infrastructure/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;

  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(username: string, password: string) {
    const { data, error } = await supabase.functions.invoke("username-login", { body: { username, password } });
    if (error) throw error;
    if (data?.error || !data?.session) throw new Error(data?.error ?? "No se pudo iniciar sesión.");
    const { error: sessionError } = await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
    if (sessionError) throw sessionError;
  }

  async function signOut() {
    if (user) {
      sessionStorage.removeItem(`laundry-active-branch-${user.id}`);
    }
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  }

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signIn,
      signOut,
    }),
    [user, session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext debe utilizarse dentro de AuthProvider");
  }

  return context;
}
