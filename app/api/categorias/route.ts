import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// La tabla categorias tiene RLS habilitado sin política de lectura pública,
// por lo que se usa el cliente admin (service role) para poder listarlas y
// gestionarlas desde el dashboard.
export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("categorias").select("*").order("nombre");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdminClient();
  const body = await request.json();
  const { data, error } = await supabase.from("categorias").insert([{ nombre: body.nombre, descripcion: body.descripcion || null, icono: body.icono || null }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
