import { NextRequest, NextResponse } from "next/server";
import { isValidDateKey } from "@/lib/lima-time";
import { requireEmployeeRequest } from "@/lib/employee-api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { conflictMessage, findEmpleadoConflict, toHHMM, toMinutes } from "@/lib/cita-conflicts";

const CITAS_SELECT = "id, id_cliente, id_empleado, id_servicio, fecha, hora_inicio, hora_fin, estado, notas, total, nombre_invitado, telefono_invitado, clientes(nombre, apellido), servicios(nombre, precio, duracion), empleados(nombre, apellido), cita_detalles(id_servicio, servicios(nombre, duracion))";

export async function GET(request: NextRequest) {
  const session = await requireEmployeeRequest(request);
  if ("error" in session) return session.error;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("citas").select(CITAS_SELECT).order("fecha", { ascending: true }).order("hora_inicio", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const session = await requireEmployeeRequest(request);
  if ("error" in session) return session.error;
  const supabase = createSupabaseAdminClient();
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });
  const serviceIds = Array.isArray(body.servicios)
    ? [...new Set(body.servicios.filter((id: unknown): id is string => typeof id === "string"))]
    : typeof body.id_servicio === "string" ? [body.id_servicio] : [];
  const idCliente = typeof body.id_cliente === "string" && body.id_cliente ? body.id_cliente : null;
  const nombreInvitado = typeof body.nombre_invitado === "string" ? body.nombre_invitado.trim().slice(0, 120) : "";
  const telefonoInvitado = typeof body.telefono_invitado === "string" ? body.telefono_invitado.trim().slice(0, 40) : "";
  if ((!idCliente && !nombreInvitado) || !body.fecha || !body.hora_inicio || serviceIds.length === 0) {
    return NextResponse.json({ error: "Cliente o invitado, fecha, hora y al menos un servicio son obligatorios" }, { status: 400 });
  }

  if (!isValidDateKey(body.fecha)) return NextResponse.json({ error: "La fecha no es válida" }, { status: 400 });
  if (serviceIds.length > 20) return NextResponse.json({ error: "Demasiados servicios en una cita" }, { status: 400 });
  const startMinutes = toMinutes(body.hora_inicio);
  if (startMinutes === null) return NextResponse.json({ error: "La hora de inicio no es válida" }, { status: 400 });

  const { data: services, error: servicesError } = await supabase.from("servicios").select("id, precio, duracion").in("id", serviceIds).eq("estado", "activo");
  if (servicesError) return NextResponse.json({ error: servicesError.message }, { status: 400 });
  if (!services || services.length !== serviceIds.length) return NextResponse.json({ error: "Uno de los servicios no está disponible" }, { status: 400 });

  const total = services.reduce((sum, service) => sum + Number(service.precio), 0);
  const duration = services.reduce((sum, service) => sum + Number(service.duracion || 0), 0);
  const horaFin = duration > 0 ? toHHMM(startMinutes + duration) : null;
  const finalHoraFin = horaFin || (typeof body.hora_fin === "string" && toMinutes(body.hora_fin) !== null ? body.hora_fin : null);
  const idEmpleado = typeof body.id_empleado === "string" && body.id_empleado ? body.id_empleado : null;

  // Valida que el trabajador no tenga otra cita en el mismo horario.
  const { error: conflictError, conflict } = await findEmpleadoConflict(supabase, {
    idEmpleado,
    fecha: body.fecha,
    horaInicio: body.hora_inicio,
    horaFin: finalHoraFin,
  });
  if (conflictError) return NextResponse.json({ error: conflictError }, { status: 400 });
  if (conflict) return NextResponse.json({ error: conflictMessage(conflict) }, { status: 409 });

  const { data, error } = await supabase.from("citas").insert([{
    id_cliente: idCliente,
    id_empleado: idEmpleado,
    id_servicio: serviceIds[0],
    fecha: body.fecha,
    hora_inicio: body.hora_inicio,
    hora_fin: finalHoraFin,
    estado: "pendiente",
    notas: typeof body.notas === "string" && body.notas.trim() ? body.notas.trim().slice(0, 1000) : null,
    total,
    nombre_invitado: idCliente ? null : nombreInvitado || null,
    telefono_invitado: idCliente ? null : telefonoInvitado || null,
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
