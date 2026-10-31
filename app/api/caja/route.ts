import { NextRequest, NextResponse } from "next/server";
import { authorizeEmployeeRequest } from "@/lib/employee-api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  addDaysKey,
  daysBetweenKeys,
  isValidDateKey,
  limaDayRangeUtc,
  limaTodayKey,
} from "@/lib/lima-time";

const CAJA_ROLES = ["admin", "recepcionista"];
const CAJA_DENIED = "Solo administración y recepción pueden gestionar la caja";
const MAX_RANGE_DAYS = 366;

function isMissingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01"
    || error.code === "PGRST205"
    || /relation .* does not exist|could not find the table/i.test(error.message || "");
}

export async function GET(request: NextRequest) {
  const denied = await authorizeEmployeeRequest(request, { roles: CAJA_ROLES, message: CAJA_DENIED });
  if (denied) return denied;

  const hoy = limaTodayKey();
  const search = request.nextUrl.searchParams;
  const desdeParam = search.get("desde");
  const hastaParam = search.get("hasta");
  let desde = isValidDateKey(desdeParam) ? desdeParam : hoy;
  let hasta = isValidDateKey(hastaParam) ? hastaParam : desde;
  if (desde > hasta) [desde, hasta] = [hasta, desde];

  const totalDias = daysBetweenKeys(desde, hasta) + 1;
  if (totalDias > MAX_RANGE_DAYS) {
    return NextResponse.json({ error: "El rango de fechas es demasiado largo" }, { status: 400 });
  }

  const { start, end } = limaDayRangeUtc(desde, hasta);
  const anteriorHasta = addDaysKey(desde, -1);
  const anteriorDesde = addDaysKey(anteriorHasta, -(totalDias - 1));
  const anteriorRango = limaDayRangeUtc(anteriorDesde, anteriorHasta);

  const supabase = createSupabaseAdminClient();
  const [
    { data: movimientos, error: movimientosError },
    { data: citas, error: citasError },
    { data: promociones, error: promocionesError },
    { data: pagos, error: pagosError },
    { data: movimientosAnteriores, error: anterioresError },
    { data: cierres, error: cierresError },
  ] = await Promise.all([
    supabase.from("movimientos_caja").select("*").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false }),
    supabase.from("citas").select("id, id_cliente, id_servicio, fecha, hora_inicio, total, estado, nombre_invitado, telefono_invitado, clientes(nombre, apellido), servicios(nombre, precio)").in("estado", ["pendiente", "confirmada", "completada"]).order("fecha", { ascending: true }),
    supabase.from("promociones").select("*").eq("activa", true),
    supabase.from("pagos").select("id_cita").eq("estado", "pagado"),
    supabase.from("movimientos_caja").select("tipo, monto").gte("created_at", anteriorRango.start).lt("created_at", anteriorRango.end),
    supabase.from("cierres_caja").select("*").gte("fecha", desde).lte("fecha", hasta).order("fecha", { ascending: false }),
  ]);

  const error = movimientosError || citasError || promocionesError || pagosError || anterioresError;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Si la migración de cierre todavía no se aplicó, la caja debe seguir funcionando.
  const cierresDisponibles = !isMissingTable(cierresError);
  if (cierresError && cierresDisponibles) {
    return NextResponse.json({ error: cierresError.message }, { status: 400 });
  }

  const pagoIds = [...new Set((movimientos || []).flatMap((movimiento) => movimiento.id_pago ? [movimiento.id_pago] : []))];
  const pagosDetalle = pagoIds.length
    ? await supabase.from("pagos").select("id, id_cita, subtotal, descuento, tipo_descuento, total, referencia, observaciones, estado, created_at, citas(fecha, hora_inicio, clientes(nombre, apellido), nombre_invitado, telefono_invitado, servicios(nombre))").in("id", pagoIds)
    : { data: [], error: null };
  if (pagosDetalle.error) return NextResponse.json({ error: pagosDetalle.error.message }, { status: 400 });
  const { data: adicionales, error: adicionalesError } = pagoIds.length
    ? await supabase.from("pago_adicionales").select("id_pago, concepto, monto").in("id_pago", pagoIds)
    : { data: [], error: null };
  if (adicionalesError) return NextResponse.json({ error: adicionalesError.message }, { status: 400 });
  const adicionalesPorPago = new Map<string, { concepto: string; monto: number }[]>();
  for (const adicional of adicionales || []) {
    const items = adicionalesPorPago.get(adicional.id_pago) || [];
    items.push({ concepto: adicional.concepto, monto: Number(adicional.monto) });
    adicionalesPorPago.set(adicional.id_pago, items);
  }
  const pagoPorId = new Map((pagosDetalle.data || []).map((pago) => {
    const { citas, ...datosPago } = pago;
    return [pago.id, {
      ...datosPago,
      cita: citas ?? null,
      adicionales: adicionalesPorPago.get(pago.id) || [],
    }];
  }));
  const movimientosConDetalle = (movimientos || []).map((movimiento) => ({
    ...movimiento,
    pago: movimiento.id_pago ? pagoPorId.get(movimiento.id_pago) || null : null,
  }));

  let anterioresIngresos = 0;
  let anterioresEgresos = 0;
  for (const movimiento of movimientosAnteriores || []) {
    const monto = Number(movimiento.monto) || 0;
    if (movimiento.tipo === "ingreso") anterioresIngresos += monto;
    else anterioresEgresos += monto;
  }

  const citasPagadas = new Set((pagos || []).map((pago) => pago.id_cita));
  const citasPendientesDePago = (citas || []).filter((cita) => !citasPagadas.has(cita.id));
  return NextResponse.json({
    movimientos: movimientosConDetalle,
    citas: citasPendientesDePago,
    promociones: promociones || [],
    cierres: cierresDisponibles ? cierres || [] : [],
    cierresDisponibles,
    hoy,
    periodo: { desde, hasta, anteriorDesde, anteriorHasta },
    resumenAnterior: {
      ingresos: anterioresIngresos,
      egresos: anterioresEgresos,
      balance: anterioresIngresos - anterioresEgresos,
      movimientos: (movimientosAnteriores || []).length,
    },
  });
}

export async function POST(request: NextRequest) {
  const denied = await authorizeEmployeeRequest(request, { roles: CAJA_ROLES, message: CAJA_DENIED });
  if (denied) return denied;
  const supabase = createSupabaseAdminClient();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });
  }
  if (body.tipo === "egreso") {
    const monto = Number(body.monto);
    if (typeof body.concepto !== "string" || !body.concepto.trim() || !Number.isFinite(monto) || monto <= 0) return NextResponse.json({ error: "Concepto y monto válido son obligatorios" }, { status: 400 });
    const { data, error } = await supabase.from("movimientos_caja").insert([{ tipo: "egreso", concepto: body.concepto.trim(), monto, metodo_pago: typeof body.metodo_pago === "string" ? body.metodo_pago : "efectivo", referencia: typeof body.referencia === "string" ? body.referencia : null, observaciones: typeof body.observaciones === "string" ? body.observaciones : null }]).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  if (typeof body.id_cita !== "string" || !body.id_cita) return NextResponse.json({ error: "La cita es obligatoria" }, { status: 400 });
  if (body.adicionales !== undefined && !Array.isArray(body.adicionales)) return NextResponse.json({ error: "Los adicionales no son válidos" }, { status: 400 });
  const adicionales = (Array.isArray(body.adicionales) ? body.adicionales : []).map((item) => {
    if (!item || typeof item !== "object") return null;
    const adicional = item as Record<string, unknown>;
    const concepto = typeof adicional.concepto === "string" ? adicional.concepto.trim() : "";
    const monto = Number(adicional.monto);
    if (!concepto || concepto.length > 120 || !Number.isFinite(monto) || monto <= 0 || monto > 99999999.99) return null;
    return { concepto, monto };
  });
  if (adicionales.length > 20 || adicionales.some((item) => item === null)) return NextResponse.json({ error: "Cada adicional debe tener un concepto y un monto válido (máximo 20 adicionales)" }, { status: 400 });

  // Una cita cancelada no se puede cobrar.
  const { data: cita, error: citaError } = await supabase.from("citas").select("id, estado").eq("id", body.id_cita).maybeSingle();
  if (citaError) return NextResponse.json({ error: citaError.message }, { status: 400 });
  if (!cita) return NextResponse.json({ error: "La cita no existe" }, { status: 404 });
  if (cita.estado === "cancelada") return NextResponse.json({ error: "No se puede cobrar una cita cancelada" }, { status: 400 });

  const descuentoManual = Number(body.descuento_manual || 0);
  if (!Number.isFinite(descuentoManual) || descuentoManual < 0) return NextResponse.json({ error: "El descuento no es válido" }, { status: 400 });
  const { data, error } = await supabase.rpc("cobrar_cita", {
    p_id_cita: body.id_cita,
    p_metodo_pago: typeof body.metodo_pago === "string" ? body.metodo_pago : "efectivo",
    p_descuento_manual: descuentoManual,
    p_tipo_descuento: body.tipo_descuento === "porcentaje" ? "porcentaje" : "monto_fijo",
    p_id_promocion: typeof body.id_promocion === "string" && body.id_promocion ? body.id_promocion : null,
    p_observaciones: typeof body.observaciones === "string" ? body.observaciones : null,
    p_adicionales: adicionales,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
