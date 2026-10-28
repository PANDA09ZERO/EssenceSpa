"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "./SupabaseProvider";

export default function DashboardAccess({ children }: { children: React.ReactNode }) {
  const { user, loading, supabase } = useSupabase();
  const router = useRouter();
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    if (loading) return;
    if (!userId) { router.replace("/login"); return; }
    let active = true;
    setError(false);
    const timeout = window.setTimeout(() => { if (active) setError(true); }, 12000);
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user || data.user.id !== userId) {
        setVerifiedId(null);
        router.replace("/login");
      } else { setError(false); setVerifiedId(data.user.id); }
    }).catch(() => { if (active) setError(true); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); };
  }, [loading, userId, supabase, router, attempt]);

  if (loading || !user || verifiedId !== user.id || error) return <div className="flex min-h-screen items-center justify-center bg-[#F5F3EE] p-6 text-center"><div><p role="status" className="text-sm text-stone-600">{error ? "No pudimos verificar tu sesión. Revisa tu conexión." : "Verificando acceso al sistema…"}</p>{error && <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-4 rounded-full bg-brand-green px-5 py-3 text-sm text-white">Reintentar</button>}</div></div>;
  return <>{children}</>;
}
