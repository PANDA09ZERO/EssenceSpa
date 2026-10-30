import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return NextResponse.json({ error: "Email y contraseña son obligatorios" }, { status: 400 });
    }
    // Never share mutable Auth state between different incoming requests.
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error || !data.user || !data.session || data.user.email?.toLowerCase() !== normalizedEmail || data.session.user.id !== data.user.id) {
      return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ data: { user: data.user, session: data.session } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Error en el inicio de sesión" }, { status: 500 });
  }
}
