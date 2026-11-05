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
  roleLoading: boolean;
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
  const [roleLoading, setRoleLoading] = useState(false);
  // Fuerza releer el rol desde la base al volver a la app.
  const [roleVersion, setRoleVersion] = useState(0);
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
          // user_metadata lo puede editar el propio usuario: nunca se usa como rol.
          // El rol real llega desde la tabla empleados (efecto de abajo).
          role: "cliente",
          name: sessionUser.user_metadata?.name || sessionUser.email?.split("@")[0] || "",
        });
      } else { setUser(null); }
      setLoading(false);
    });
    return () => { active = false; clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  // Si un administrador cambia el rol mientras la sesión sigue abierta, al
  // volver a la pestaña o a la app se vuelve a consultar el rol real.
  useEffect(() => {
    const refreshRole = () => setRoleVersion((version) => version + 1);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshRole();
    };
    window.addEventListener("focus", refreshRole);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshRole);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // El rol real vive en la tabla empleados. La política RLS solo deja leer
  // la fila del propio usuario; además se filtra explícitamente por el id
  // (o por el email literal en cuentas antiguas aún no vinculadas).
  useEffect(() => {
    const email = user?.email;
    const userId = user?.id;
    if (!email || !userId) { setRoleLoading(false); return; }
    let active = true;
    setRoleLoading(true);
    void (async () => {
      try {
        let { data } = await supabase.from("empleados").select("rol").eq("auth_user_id", userId).maybeSingle();
        if (!data) {
          const literalEmail = email.replace(/[\\%_]/g, (char) => `\\${char}`);
          ({ data } = await supabase.from("empleados").select("rol").is("auth_user_id", null).ilike("email", literalEmail).maybeSingle());
        }
        if (!active || !data?.rol) return;
        setUser(current => current && current.id === userId ? { ...current, role: data.rol } : current);
      } catch {
        // Si falla la consulta el usuario queda sin permisos de equipo.
      } finally {
        if (active) setRoleLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.email, user?.id, roleVersion]);

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
    <SupabaseContext.Provider value={{ supabase, user, loading, roleLoading, signOut }}>
      {children}
    </SupabaseContext.Provider>
  );
}
