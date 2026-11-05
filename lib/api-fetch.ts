"use client";

import { supabase } from "@/lib/supabase";

/**
 * fetch para las rutas /api del panel: adjunta el token de la sesión actual
 * (Authorization: Bearer) para que el servidor valide quién hace la petición.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  return fetch(input, { ...init, headers });
}
