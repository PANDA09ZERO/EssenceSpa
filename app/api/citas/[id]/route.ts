import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { conflictMessage, findEmpleadoConflict, toHHMM, toMinutes } from "@/lib/cita-conflicts";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const CITAS_SELECT = "id, id_cliente, id_empleado, id_servicio, fecha, hora_inicio, hora_fin, estado, notas, total, nombre_invitado, telefono_invitado, clientes(nombre, apellido), servicios(nombre, precio, duracion), empleados(nombre, apellido), cita_detalles(id_servicio, servicios(nombre, duracion))";
const ESTADOS_PERMITIDOS = new Set(["pendiente", "confirmada", "en_progreso", "completada", "cancelada"]);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase.from("citas").select(CITAS_SELECT).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });
  }

  const { data: existing, error: findError } = await supabase
    .from("citas")
    .select("id, id_cliente, id_empleado, id_servicio, fecha, hora_inicio, hora_fin, estado, notas, nombre_invitado, telefono_invitado")
    .eq("id", id)
    .maybeSingle();
  if (findError) return NextResponse.json({ error: findError.message }, { status: 400 });
  if (!existing) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });

  // Detalles actuales: se leen primero para resolver los servicios por
  // defecto (una cita puede tener varios servicios en cita_detalles).
  const { data: currentDetails, error: detailsReadError } = await supabase.from("cita_detalles").select("id_servicio").eq("id_cita", id);
  if (detailsReadError) return NextResponse.json({ error: detailsReadError.message }, { status: 400 });
  const currentIds = new Set((currentDetails || []).map((detail) => detail.id_servicio));

  // Servicios: se toman los enviados o, si no, los actuales de la cita.
  let serviceIds: string[];
  if (Array.isArray(body.servicios)) {
    serviceIds = [...new Set(body.servicios.filter((serviceId): serviceId is string => typeof serviceId === "string" && serviceId.length > 0))];
  } else if (typeof body.id_servicio === "string" && body.id_servicio) {
    serviceIds = [body.id_servicio];
  } else if (currentIds.size > 0) {
    serviceIds = [...currentIds];
  } else if (existing.id_servicio) {
    serviceIds = [existing.id_servicio];
  } else {
    serviceIds = [];
  }
  if (serviceIds.length === 0) return NextResponse.json({ error: "Debes indicar al menos un servicio" }, { status: 400 });

  const fecha = typeof body.fecha === "string" && body.fecha ? body.fecha : existing.fecha;
  const horaInicio = typeof body.hora_inicio === "string" && body.hora_inicio ? body.hora_inicio : existing.hora_inicio;
  const idCliente = Object.prototype.hasOwnProperty.call(body, "id_cliente")
    ? (typeof body.id_cliente === "string" && body.id_cliente ? body.id_cliente : null)
    : existing.id_cliente;
  const nombreInvitado = body.nombre_invitado === undefined
    ? existing.nombre_invitado
    : (typeof body.nombre_invitado === "string" && body.nombre_invitado.trim() ? body.nombre_invitado.trim().slice(0, 120) : null);
  const telefonoInvitado = body.telefono_invitado === undefined
    ? existing.telefono_invitado
    : (typeof body.telefono_invitado === "string" && body.telefono_invitado.trim() ? body.telefono_invitado.trim().slice(0, 40) : null);
  const finalNombreInvitado = idCliente ? null : nombreInvitado;
  const finalTelefonoInvitado = idCliente ? null : telefonoInvitado;
  const idEmpleado = body.id_empleado === undefined
    ? existing.id_empleado
    : (typeof body.id_empleado === "string" && body.id_empleado ? body.id_empleado : null);
  const estado = typeof body.estado === "string" && ESTADOS_PERMITIDOS.has(body.estado) ? body.estado : existing.estado;
  const notas = body.notas === undefined
    ? existing.notas
    : (typeof body.notas === "string" && body.notas.trim() ? body.notas.trim() : null);

  if (!fecha) return NextResponse.json({ error: "La fecha es obligatoria" }, { status: 400 });
  const startMinutes = toMinutes(horaInicio);
  if (startMinutes === null) return NextResponse.json({ error: "La hora de inicio no es válida" }, { status: 400 });
  if (!idCliente && !finalNombreInvitado) return NextResponse.json({ error: "El cliente o el nombre del invitado es obligatorio" }, { status: 400 });

  const { data: services, error: servicesError } = await supabase
    .from("servicios")
    .select("id, precio, duracion")
    .in("id", serviceIds);
  if (servicesError) return NextResponse.json({ error: servicesError.message }, { status: 400 });
  if (!services || services.length !== serviceIds.length) {
    return NextResponse.json({ error: "Uno de los servicios seleccionados ya no existe" }, { status: 400 });
  }

  const total = services.reduce((sum, service) => sum + Number(service.precio), 0);
  const duration = services.reduce((sum, service) => sum + Number(service.duracion || 0), 0);

  const nextIds = new Set(serviceIds);
  const servicesChanged = serviceIds.some((serviceId) => !currentIds.has(serviceId)) || [...currentIds].some((serviceId) => !nextIds.has(serviceId));

  const scheduleChanged = fecha !== existing.fecha
    || horaInicio !== existing.hora_inicio
    || idEmpleado !== (existing.id_empleado ?? null);
  const reactivated = existing.estado === "cancelada" && estado !== "cancelada";

  // Hora de finalización: se respeta la enviada; si cambió el horario se
  // calcula a partir de la duración total de los servicios.
  let horaFin = existing.hora_fin;
  if (typeof body.hora_fin === "string" && body.hora_fin) {
    const endMinutes = toMinutes(body.hora_fin);
    if (endMinutes === null || endMinutes <= startMinutes) {
      return NextResponse.json({ error: "La hora de finalización debe ser posterior a la hora de inicio" }, { status: 400 });
    }
    horaFin = body.hora_fin;
  } else if ((scheduleChanged || servicesChanged) && duration > 0) {
    horaFin = toHHMM(startMinutes + duration);
  }

  // Valida la disponibilidad del trabajador cuando se modifica el horario
  // o se reactiva una cita cancelada.
  if (scheduleChanged || reactivated) {
    const { error: conflictError, conflict } = await findEmpleadoConflict(supabase, {
      citaId: id,
      idEmpleado,
      fecha,
      horaInicio,
      horaFin,
    });
    if (conflictError) return NextResponse.json({ error: conflictError }, { status: 400 });
    if (conflict) return NextResponse.json({ error: conflictMessage(conflict) }, { status: 409 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("citas")
    .update({
      id_cliente: idCliente,
      id_empleado: idEmpleado,
      id_servicio: serviceIds[0],
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      estado,
      notas,
      total,
      nombre_invitado: finalNombreInvitado,
      telefono_invitado: finalTelefonoInvitado,
    })
    .eq("id", id)
    .select(CITAS_SELECT)
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  // Sincroniza los servicios de la cita (tabla cita_detalles).
  const removed = [...currentIds].filter((serviceId) => !nextIds.has(serviceId));
  const added = serviceIds.filter((serviceId) => !currentIds.has(serviceId));

  if (removed.length > 0) {
    const { error: removeError } = await supabase.from("cita_detalles").delete().eq("id_cita", id).in("id_servicio", removed);
    if (removeError) return NextResponse.json({ error: removeError.message, data: updated }, { status: 400 });
  }
  if (added.length > 0) {
    const { error: insertError } = await supabase.from("cita_detalles").insert(
      added.map((serviceId) => {
        const service = services.find((item) => item.id === serviceId)!;
        return { id_cita: id, id_servicio: serviceId, cantidad: 1, precio_unitario: Number(service.precio), subtotal: Number(service.precio) };
      }),
    );
    if (insertError) {
      // Revierte los detalles eliminados para no perder datos.
      const removedServices = services.filter((service) => removed.includes(service.id));
      if (removedServices.length > 0) {
        await supabase.from("cita_detalles").insert(
          removedServices.map((service) => ({ id_cita: id, id_servicio: service.id, cantidad: 1, precio_unitario: Number(service.precio), subtotal: Number(service.precio) })),
        );
      }
      return NextResponse.json({ error: insertError.message, data: updated }, { status: 400 });
    }
  }

  return NextResponse.json({ data: updated });
}

