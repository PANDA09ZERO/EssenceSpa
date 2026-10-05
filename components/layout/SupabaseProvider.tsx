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
    const getSession = async () => {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Supabase tardó demasiado")), 8000)),
        ]);
        const session = result.data.session;
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            role: (session.user.user_metadata as any)?.role || "cliente",
            name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "",
          });
        }
      } catch (error) {
        console.error("No se pudo recuperar la sesión de Supabase", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        signingOutRef.current = false;
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          role: (session.user.user_metadata as any)?.role || "cliente",
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "",
        });
      } else {
        setUser(null);
        // Solo una sesión expirada (no un logout explícito) vuelve al login.
        if (!signingOutRef.current && pathname.startsWith("/dashboard")) router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

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
