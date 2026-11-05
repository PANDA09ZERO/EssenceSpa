import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { CATALOG_ADMIN, requireEmployeeRequest } from "@/lib/employee-api-auth";
import { optionalText, readJsonObject, requiredText } from "@/lib/api-input";

// categorias no tiene políticas RLS: solo el servidor (service role) accede,
// siempre después de validar la sesión del empleado.
export async function GET(request: NextRequest) {
  const session = await requireEmployeeRequest(request);
  if ("error" in session) return session.error;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("categorias").select("id, nombre, descripcion, icono").order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const session = await requireEmployeeRequest(request, CATALOG_ADMIN);
  if ("error" in session) return session.error;

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });
  const nombre = requiredText(body.nombre, 120);
  if (!nombre) return NextResponse.json({ error: "El nombre de la categoría es obligatorio." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("categorias").insert([{ nombre, descripcion: optionalText(body.descripcion, 500), icono: optionalText(body.icono, 16) }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
