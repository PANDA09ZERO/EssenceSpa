import { NextRequest, NextResponse } from "next/server";
import { CATALOG_ADMIN, requireEmployeeRequest } from "@/lib/employee-api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { readJsonObject } from "@/lib/api-input";
import { servicioFromBody } from "../servicio-input";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireEmployeeRequest(request, CATALOG_ADMIN);
  if ("error" in session) return session.error;

  const { id } = await params;
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });
  const servicio = servicioFromBody(body);
  if ("error" in servicio) return NextResponse.json({ error: servicio.error }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("servicios").update(servicio.value).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireEmployeeRequest(request, CATALOG_ADMIN);
  if ("error" in session) return session.error;

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("servicios").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
