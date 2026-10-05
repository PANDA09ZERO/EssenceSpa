import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { conflictMessage, findEmpleadoConflict, toHHMM, toMinutes } from "@/lib/cita-conflicts";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const CITAS_SELECT = "id, id_cliente, id_empleado, id_servicio, fecha, hora_inicio, hora_fin, estado, notas, total, clientes(nombre, apellido), servicios(nombre, precio, duracion), empleados(nombre, apellido), cita_detalles(id_servicio, servicios(nombre, duracion))";

export async function GET() {
  const { data, error } = await supabase.from("citas").select(CITAS_SELECT).order("fecha", { ascending: true }).order("hora_inicio", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const serviceIds = Array.isArray(body.servicios)
    ? [...new Set(body.servicios.filter((id: unknown): id is string => typeof id === "string"))]
    : typeof body.id_servicio === "string" ? [body.id_servicio] : [];
  if (!body.id_cliente || !body.fecha || !body.hora_inicio || serviceIds.length === 0) {
    return NextResponse.json({ error: "Cliente, fecha, hora y al menos un servicio son obligatorios" }, { status: 400 });
  }

  const startMinutes = toMinutes(body.hora_inicio);
  if (startMinutes === null) return NextResponse.json({ error: "La hora de inicio no es válida" }, { status: 400 });

  const { data: services, error: servicesError } = await supabase.from("servicios").select("id, precio, duracion").in("id", serviceIds).eq("estado", "activo");
  if (servicesError) return NextResponse.json({ error: servicesError.message }, { status: 400 });
  if (!services || services.length !== serviceIds.length) return NextResponse.json({ error: "Uno de los servicios no está disponible" }, { status: 400 });

  const total = services.reduce((sum, service) => sum + Number(service.precio), 0);
  const duration = services.reduce((sum, service) => sum + Number(service.duracion || 0), 0);
  const horaFin = duration > 0 ? toHHMM(startMinutes + duration) : null;
  const finalHoraFin = horaFin || (typeof body.hora_fin === "string" && body.hora_fin ? body.hora_fin : null);

  // Valida que el trabajador no tenga otra cita en el mismo horario.
  const { error: conflictError, conflict } = await findEmpleadoConflict(supabase, {
    idEmpleado: body.id_empleado || null,
    fecha: body.fecha,
    horaInicio: body.hora_inicio,
    horaFin: finalHoraFin,
  });
  if (conflictError) return NextResponse.json({ error: conflictError }, { status: 400 });
  if (conflict) return NextResponse.json({ error: conflictMessage(conflict) }, { status: 409 });

  const { data, error } = await supabase.from("citas").insert([{
    id_cliente: body.id_cliente,
    id_empleado: body.id_empleado || null,
    id_servicio: serviceIds[0],
    fecha: body.fecha,
    hora_inicio: body.hora_inicio,
    hora_fin: finalHoraFin,
    estado: "pendiente",
    notas: body.notas || null,
    total,
  }]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { error: detailsError } = await supabase.from("cita_detalles").insert(services.map((service) => ({
    id_cita: data.id,
    id_servicio: service.id,
    cantidad: 1,
    precio_unitario: Number(service.precio),
    subtotal: Number(service.precio),
  })));
  if (detailsError) {
    await supabase.from("citas").delete().eq("id", data.id);
    return NextResponse.json({ error: detailsError.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}
