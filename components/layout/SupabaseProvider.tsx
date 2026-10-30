"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type User = {
  id: string;
  email: string;
  role: string;
  name: string;
};

type SupabaseContextType = {
  supabase: typeof supabase;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error("useSupabase must be used within SupabaseProvider");
  return ctx;
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  // Distingue un cierre de sesión explícito de una sesión expirada, para que
  // el logout lleve al catálogo público y no a la pantalla de login.
  const signingOutRef = useRef(false);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      if (active) { setUser(null); setLoading(false); }
    }, 8000);
    // INITIAL_SESSION and subsequent auth events are the single source of truth.
    // A separate getSession promise can otherwise overwrite a newer SIGNED_IN.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      clearTimeout(timeout);
      const sessionUser = session?.user;
      if (sessionUser) {
        signingOutRef.current = false;
        setUser({
          id: sessionUser.id,
          email: sessionUser.email || "",
          role: sessionUser.user_metadata?.role || "cliente",
          name: sessionUser.user_metadata?.name || sessionUser.email?.split("@")[0] || "",
        });
      } else { setUser(null); }
      setLoading(false);
    });
    return () => { active = false; clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!loading && !user && !signingOutRef.current && pathname.startsWith("/dashboard")) {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  const signOut = async () => {
    signingOutRef.current = true;
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      // Al cerrar sesión se vuelve al catálogo público (página principal).
      router.replace("/");
    }
  };

  return (
    <SupabaseContext.Provider value={{ supabase, user, loading, signOut }}>
      {children}
    </SupabaseContext.Provider>
  );
}
