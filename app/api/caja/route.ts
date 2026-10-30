import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET() {
  const [{ data: movimientos, error: movimientosError }, { data: citas, error: citasError }, { data: promociones, error: promocionesError }, { data: pagos, error: pagosError }] = await Promise.all([
    supabase.from("movimientos_caja").select("*").order("created_at", { ascending: false }),
    supabase.from("citas").select("id, id_cliente, id_servicio, fecha, hora_inicio, total, estado, clientes(nombre, apellido), servicios(nombre, precio)").in("estado", ["pendiente", "confirmada", "completada"]).order("fecha", { ascending: true }),
    supabase.from("promociones").select("*").eq("activa", true),
    supabase.from("pagos").select("id_cita").eq("estado", "pagado"),
  ]);
  const error = movimientosError || citasError || promocionesError || pagosError;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const pagoIds = [...new Set((movimientos || []).flatMap((movimiento) => movimiento.id_pago ? [movimiento.id_pago] : []))];
  const pagosDetalle = pagoIds.length
    ? await supabase.from("pagos").select("id, id_cita, subtotal, descuento, tipo_descuento, total, referencia, observaciones, estado, created_at, citas(fecha, hora_inicio, clientes(nombre, apellido), servicios(nombre))").in("id", pagoIds)
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
  const citasPagadas = new Set((pagos || []).map((pago) => pago.id_cita));
  const citasPendientesDePago = (citas || []).filter((cita) => !citasPagadas.has(cita.id));
  return NextResponse.json({ movimientos: movimientosConDetalle, citas: citasPendientesDePago, promociones: promociones || [] });
}

export async function POST(request: NextRequest) {
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
