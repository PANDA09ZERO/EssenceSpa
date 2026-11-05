import { NextRequest, NextResponse } from "next/server";
import { requireEmployeeRequest } from "@/lib/employee-api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { optionalText, readJsonObject, requiredText } from "@/lib/api-input";

export async function GET(request: NextRequest) {
  const session = await requireEmployeeRequest(request);
  if ("error" in session) return session.error;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("clientes").select("id, nombre, apellido, telefono, email").order("nombre", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const session = await requireEmployeeRequest(request);
  if ("error" in session) return session.error;

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });

  const nombre = requiredText(body.nombre, 120);
  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  const email = optionalText(body.email, 160)?.toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "El email no es válido" }, { status: 400 });
  }
  const fechaNacimiento = optionalText(body.fecha_nacimiento, 10);
  if (fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
    return NextResponse.json({ error: "La fecha de nacimiento no es válida" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("clientes").insert([{
    nombre,
    apellido: requiredText(body.apellido, 120),
    email,
    telefono: optionalText(body.telefono, 40),
    direccion: optionalText(body.direccion, 240),
    fecha_nacimiento: fechaNacimiento,
  }]).select("id, nombre, apellido, telefono, email").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
