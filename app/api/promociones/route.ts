import { NextRequest, NextResponse } from "next/server";
import { CATALOG_ADMIN, requireEmployeeRequest } from "@/lib/employee-api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isValidDateKey } from "@/lib/lima-time";
import { boundedNumber, optionalText, readJsonObject, requiredText } from "@/lib/api-input";

export async function GET(request: NextRequest) {
  const session = await requireEmployeeRequest(request);
  if ("error" in session) return session.error;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("promociones").select("id, nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const session = await requireEmployeeRequest(request, CATALOG_ADMIN);
  if ("error" in session) return session.error;

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });

  const nombre = requiredText(body.nombre, 120);
  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  const descuento = boundedNumber(body.descuento, 0, 100);
  if (descuento === null) return NextResponse.json({ error: "El descuento debe estar entre 0 y 100" }, { status: 400 });
  const fechaInicio = optionalText(body.fecha_inicio, 10);
  const fechaFin = optionalText(body.fecha_fin, 10);
  if ((fechaInicio && !isValidDateKey(fechaInicio)) || (fechaFin && !isValidDateKey(fechaFin))) {
    return NextResponse.json({ error: "Las fechas no son válidas" }, { status: 400 });
  }
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    return NextResponse.json({ error: "La fecha de inicio debe ser anterior a la de fin" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("promociones").insert([{
    nombre,
    descripcion: optionalText(body.descripcion, 500),
    descuento,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    activa: body.activa !== false,
  }]).select("id, nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
