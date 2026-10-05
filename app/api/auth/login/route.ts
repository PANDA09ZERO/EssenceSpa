import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return NextResponse.json({ error: "Email y contraseña son obligatorios" }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (!error) return NextResponse.json({ data: { user: data.user, session: data.session } });

    const { data: employee, error: empError } = await supabase.from("empleados")
      .select("id, nombre, apellido, email, rol")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (!empError && employee) {
      const { data: newAuthData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { name: `${employee.nombre} ${employee.apellido}`, role: employee.rol } } as any,
      });
      if (!authError && newAuthData.user) {
        const { data: secondLogin, error: secondError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (!secondError) return NextResponse.json({ data: { user: secondLogin.user, session: secondLogin.session } });
      }
    }

    return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
  } catch (e) {
    console.error("Login catch:", e);
    return NextResponse.json({ error: "Error en el inicio de sesión" }, { status: 500 });
  }
}
