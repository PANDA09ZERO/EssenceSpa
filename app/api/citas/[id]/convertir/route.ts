import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

/**
 * Convierte una cita de invitado en una cita con cliente registrado.
 * Crea el cliente con los datos enviados (o los del invitado) y enlaza la
 * cita. Si el enlace falla, elimina el cliente recién creado.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Sin cuerpo se usan los datos guardados en la cita.
  }

  const { data: cita, error: citaError } = await supabase
    .from("citas")
    .select("id, id_cliente, nombre_invitado, telefono_invitado")
    .eq("id", id)
    .maybeSingle();
  if (citaError) return NextResponse.json({ error: citaError.message }, { status: 400 });
  if (!cita) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  if (cita.id_cliente) return NextResponse.json({ error: "La cita ya tiene un cliente registrado" }, { status: 400 });

  const guestName = typeof cita.nombre_invitado === "string" ? cita.nombre_invitado.trim() : "";
  if (!guestName) return NextResponse.json({ error: "La cita no tiene datos de invitado" }, { status: 400 });

  const nombre = typeof body.nombre === "string" && body.nombre.trim() ? body.nombre.trim().slice(0, 120) : guestName.slice(0, 120);
  const apellido = typeof body.apellido === "string" ? body.apellido.trim().slice(0, 120) : "";
  const telefono = typeof body.telefono === "string" && body.telefono.trim()
    ? body.telefono.trim().slice(0, 40)
    : (cita.telefono_invitado || null);
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().slice(0, 160) : null;

  const { data: cliente, error: clienteError } = await supabase
    .from("clientes")
    .insert([{ nombre, apellido, telefono, email }])
    .select("id, nombre, apellido, telefono")
    .single();
  if (clienteError) return NextResponse.json({ error: clienteError.message }, { status: 400 });

  const { error: linkError } = await supabase
    .from("citas")
    .update({ id_cliente: cliente.id, nombre_invitado: null, telefono_invitado: null })
    .eq("id", id);
  if (linkError) {
    await supabase.from("clientes").delete().eq("id", cliente.id);
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  return NextResponse.json({ data: cliente });
}
