import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "ustadz" | "student";

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  room: string | null;
  dormitory_id: string | null;
  qr_token: string;
  approval_status: "pending" | "approved" | "rejected";
  avatar_url: string | null;
  is_active: boolean;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

const ROLE_PRIORITY: AppRole[] = ["super_admin", "admin", "ustadz", "student"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(prof as ProfileRow | null);
    setRoles((roleRows ?? []).map((r) => r.role as AppRole));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => void loadUserData(s.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) void loadUserData(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (session?.user) await loadUserData(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const primaryRole = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null;

  return (
    <Ctx.Provider
      value={{ session, user: session?.user ?? null, profile, roles, primaryRole, loading, refresh, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
