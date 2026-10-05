import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authorizeAdminEmployeeRequest } from "@/lib/employee-api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function specialtiesFrom(value: unknown): string[] | null {
  const specialties = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string" ? value.split(",") : [];
  const cleaned = specialties.map((item) => item.trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

export async function GET() {
  const { data, error } = await supabase.from("empleados").select("id, nombre, apellido, email, telefono, cargo, rol, especialidad, disponibilidad, created_at, updated_at").order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const authError = await authorizeAdminEmployeeRequest(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });
  }

  if (typeof body.nombre !== "string" || !body.nombre.trim() || typeof body.apellido !== "string" || !body.apellido.trim()) {
    return NextResponse.json({ error: "Nombre y apellido son obligatorios" }, { status: 400 });
  }
  if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return NextResponse.json({ error: "Se requiere un email válido para crear la cuenta de acceso" }, { status: 400 });
  }
  if (typeof body.password !== "string" || body.password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const nombre = body.nombre.trim();
  const apellido = body.apellido.trim();
  const rol = typeof body.rol === "string" ? body.rol : "manicurista";

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo configurar el acceso" }, { status: 500 });
  }

  const { data: existingEmployee, error: existingEmployeeError } = await admin.from("empleados")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existingEmployeeError) return NextResponse.json({ error: existingEmployeeError.message }, { status: 500 });
  if (existingEmployee) return NextResponse.json({ error: "Ya existe un empleado con este email" }, { status: 409 });

  const { data: authData, error: authCreateError } = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: { name: `${nombre} ${apellido}`, role: rol },
  });
  if (authCreateError || !authData.user) {
    return NextResponse.json({ error: authCreateError?.message || "No se pudo crear la cuenta de acceso" }, { status: 400 });
  }

  const { error } = await admin.from("empleados").insert([{
    auth_user_id: authData.user.id,
    nombre,
    apellido,
    email,
    telefono: typeof body.telefono === "string" && body.telefono.trim() ? body.telefono.trim() : null,
    cargo: typeof body.cargo === "string" && body.cargo.trim() ? body.cargo.trim() : null,
    rol,
    especialidad: specialtiesFrom(body.especialidad),
  }]);
  if (error) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true, userId: authData.user.id });
}
