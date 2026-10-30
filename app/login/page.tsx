"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // End only this browser's previous session before switching accounts.
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw new Error("No se pudo cerrar la sesión anterior. Vuelve a intentarlo.");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Email o contraseña incorrectos");
        setLoading(false);
        return;
      }
      const { session, user } = result.data || {};
      const expectedEmail = email.trim().toLowerCase();
      if (!session?.access_token || !session?.refresh_token || !user?.id || user.email?.toLowerCase() !== expectedEmail) {
        throw new Error("No se pudo validar la cuenta. Inicia sesión nuevamente.");
      }
      const { data: saved, error: sessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
      });
      if (sessionError || !saved.user || saved.user.id !== user.id || saved.user.email?.toLowerCase() !== expectedEmail) {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error("No se pudo activar tu sesión. Vuelve a intentarlo.");
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-green mb-4">
            <i className="fas fa-spa text-white text-2xl" />
          </div>
          <h1 className="font-display text-3xl font-bold text-brand-green">Essence Spa</h1>
          <p className="text-brand-text mt-2">Sistema de Gestión</p>
        </div>

        <div className="bg-white rounded-2xl shadow-bento p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label-field">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@essencespa.pe"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="label-field">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Iniciando..." : "Iniciar Sesión"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
