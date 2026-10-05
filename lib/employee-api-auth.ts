import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function authorizeAdminEmployeeRequest(request: NextRequest) {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return NextResponse.json({ error: "Debes iniciar sesión como administrador" }, { status: 401 });
  }

  const payload = decodeJWT(accessToken);
  const email = payload?.email as string | undefined;
  if (!email) {
    return NextResponse.json({ error: "La sesión no es válida" }, { status: 401 });
  }

  const { data: employee, error: empError } = await supabase.from("empleados")
    .select("id, email, rol, nombre, apellido")
    .ilike("email", email)
    .maybeSingle();
  console.log("Employee check:", { email, employee, empError });
  if (empError) {
    return NextResponse.json({ error: "No se pudo validar el permiso de administrador" }, { status: 500 });
  }
  if (!employee || employee.rol !== "admin") {
    return NextResponse.json({ error: "Solo un administrador puede gestionar empleados" }, { status: 403 });
  }

  return null;
}
