import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { consumeAuthRedirect, getSession, requestMagicLink, signOut, type Session } from "@/lib/supabaseRest";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    consumeAuthRedirect()
      .then((next) => { if (active) setSession(next); })
      .catch(() => { if (active) setSession(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    signInWithEmail: async (email) => { await requestMagicLink(email); },
    signOut: async () => { await signOut(); setSession(null); },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
