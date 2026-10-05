import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });
  }

  const descuento = Number(body.descuento);
  if (typeof body.nombre !== "string" || !body.nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }
  if (!Number.isFinite(descuento) || descuento < 0 || descuento > 100) {
    return NextResponse.json({ error: "El descuento debe estar entre 0 y 100" }, { status: 400 });
  }

  const { data, error } = await supabase.from("promociones").update({
    nombre: body.nombre.trim(),
    descripcion: typeof body.descripcion === "string" && body.descripcion.trim() ? body.descripcion.trim() : null,
    descuento,
    fecha_inicio: typeof body.fecha_inicio === "string" && body.fecha_inicio ? body.fecha_inicio : null,
    fecha_fin: typeof body.fecha_fin === "string" && body.fecha_fin ? body.fecha_fin : null,
    activa: body.activa === true,
  }).eq("id", id).select("id, nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}