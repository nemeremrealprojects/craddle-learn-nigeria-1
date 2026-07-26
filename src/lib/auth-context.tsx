import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "parent" | "teacher" | "admin";

interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRoles(userId: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadRoles(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        loadRoles(s.user.id);
      } else {
        setRoles([]);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refreshRoles() {
    if (session?.user) await loadRoles(session.user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setRoles([]);
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, roles, loading, refreshRoles, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export function primaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("teacher")) return "teacher";
  if (roles.includes("parent")) return "parent";
  return "student";
}
