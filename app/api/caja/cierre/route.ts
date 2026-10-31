import { NextRequest, NextResponse } from "next/server";
import { requireEmployeeRequest } from "@/lib/employee-api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { isValidDateKey, limaDayRangeUtc, limaTodayKey } from "@/lib/lima-time";

const CAJA_ROLES = ["admin", "recepcionista"];
const CAJA_DENIED = "Solo administración y recepción pueden gestionar la caja";
const MIGRATION_HINT = "Falta aplicar config/migration-cierre-caja.sql en Supabase para usar el cierre de caja";

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01"
    || error.code === "PGRST205"
    || /relation .* does not exist|could not find the table/i.test(error.message || "");
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export async function POST(request: NextRequest) {
  const session = await requireEmployeeRequest(request, { roles: CAJA_ROLES, message: CAJA_DENIED });
  if ("error" in session) return session.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });
  }

  const fecha = body.fecha;
  if (!isValidDateKey(fecha)) {
    return NextResponse.json({ error: "La fecha del cierre no es válida" }, { status: 400 });
  }
  if (fecha > limaTodayKey()) {
    return NextResponse.json({ error: "No puedes cerrar un día que todavía no termina" }, { status: 400 });
  }

  let efectivoContado: number | null = null;
  if (body.efectivo_contado !== null && body.efectivo_contado !== undefined && body.efectivo_contado !== "") {
    efectivoContado = Number(body.efectivo_contado);
    if (!Number.isFinite(efectivoContado) || efectivoContado < 0) {
      return NextResponse.json({ error: "El efectivo contado debe ser un monto válido" }, { status: 400 });
    }
    efectivoContado = round2(efectivoContado);
  }

  const observaciones = typeof body.observaciones === "string" && body.observaciones.trim()
    ? body.observaciones.trim().slice(0, 500)
    : null;

  const supabase = createSupabaseAdminClient();
  const { start, end } = limaDayRangeUtc(fecha, fecha);
  const { data: movimientos, error: movimientosError } = await supabase
    .from("movimientos_caja")
    .select("tipo, monto, metodo_pago")
    .gte("created_at", start)
    .lt("created_at", end);
  if (movimientosError) {
    return NextResponse.json({ error: movimientosError.message }, { status: 400 });
  }

  let totalIngresos = 0;
  let totalEgresos = 0;
  const totalesMetodo: Record<string, { ingresos: number; egresos: number }> = {};
  for (const movimiento of movimientos || []) {
    const monto = Number(movimiento.monto) || 0;
    const metodo = movimiento.metodo_pago || "efectivo";
    const total = totalesMetodo[metodo] || { ingresos: 0, egresos: 0 };
    if (movimiento.tipo === "ingreso") {
      totalIngresos += monto;
      total.ingresos += monto;
    } else {
      totalEgresos += monto;
      total.egresos += monto;
    }
    totalesMetodo[metodo] = total;
  }
  for (const metodo of Object.keys(totalesMetodo)) {
    totalesMetodo[metodo] = {
      ingresos: round2(totalesMetodo[metodo].ingresos),
      egresos: round2(totalesMetodo[metodo].egresos),
    };
  }

  const balance = round2(totalIngresos - totalEgresos);
  const efectivo = totalesMetodo.efectivo || { ingresos: 0, egresos: 0 };
  const efectivoEsperado = round2(efectivo.ingresos - efectivo.egresos);
  const diferencia = efectivoContado === null ? null : round2(efectivoContado - efectivoEsperado);
  const nombreCompleto = [session.employee.nombre, session.employee.apellido].filter(Boolean).join(" ").trim();

  const { data, error } = await supabase
    .from("cierres_caja")
    .upsert([{
      fecha,
      total_ingresos: round2(totalIngresos),
      total_egresos: round2(totalEgresos),
      balance,
      efectivo_esperado: efectivoEsperado,
      efectivo_contado: efectivoContado,
      diferencia,
      totales_metodo: totalesMetodo,
      observaciones,
      cerrado_por_email: session.employee.email,
      cerrado_por_nombre: nombreCompleto || null,
    }], { onConflict: "fecha" })
    .select()
    .single();

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const session = await requireEmployeeRequest(request, { roles: CAJA_ROLES, message: CAJA_DENIED });
  if ("error" in session) return session.error;

  const fecha = request.nextUrl.searchParams.get("fecha");
  if (!isValidDateKey(fecha)) {
    return NextResponse.json({ error: "La fecha del cierre no es válida" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("cierres_caja").delete().eq("fecha", fecha);
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: { fecha, reabierta: true } });
}
