import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET() {
  const [{ data: clientes, error: clientesError }, { data: servicios, error: serviciosError }, { data: empleados, error: empleadosError }] = await Promise.all([
    supabase.from("clientes").select("id, nombre, apellido, telefono").order("nombre"),
    supabase.from("servicios").select("id, nombre, precio, duracion").eq("estado", "activo").order("nombre"),
    supabase.from("empleados").select("id, nombre, apellido").order("nombre"),
  ]);

  const error = clientesError || serviciosError || empleadosError;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ clientes: clientes || [], servicios: servicios || [], empleados: empleados || [] });
}
