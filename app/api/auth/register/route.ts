import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    const { nombre, email, password, rol } = await request.json();
    if (typeof nombre !== "string" || typeof email !== "string" || typeof password !== "string" || !nombre.trim() || !email.trim() || password.length < 8) {
      return NextResponse.json({ error: "Nombre, email y una contraseña de al menos 8 caracteres son obligatorios" }, { status: 400 });
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: nombre, role: rol || "cliente" } },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: { user: data.user } });
  } catch {
    return NextResponse.json({ error: "Error al registrar usuario" }, { status: 500 });
  }
}
