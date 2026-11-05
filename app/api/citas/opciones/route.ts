import { NextRequest, NextResponse } from "next/server";
import { requireEmployeeRequest } from "@/lib/employee-api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const session = await requireEmployeeRequest(request);
  if ("error" in session) return session.error;
  const supabase = createSupabaseAdminClient();
  const [{ data: clientes, error: clientesError }, { data: servicios, error: serviciosError }, { data: empleados, error: empleadosError }] = await Promise.all([
    supabase.from("clientes").select("id, nombre, apellido, telefono").order("nombre"),
    supabase.from("servicios").select("id, nombre, precio, duracion").eq("estado", "activo").order("nombre"),
    supabase.from("empleados").select("id, nombre, apellido").order("nombre"),
  ]);

  const error = clientesError || serviciosError || empleadosError;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ clientes: clientes || [], servicios: servicios || [], empleados: empleados || [] });
}
