import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface EmployeeRoleOptions {
  roles?: string[];
  message?: string;
}

export interface EmployeeSession {
  id: string;
  email: string;
  rol: string;
  nombre: string | null;
  apellido: string | null;
}

type EmployeeResult = { employee: EmployeeSession } | { error: NextResponse };

async function resolveEmployee(request: NextRequest): Promise<EmployeeResult> {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return { error: NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 }) };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !user?.email) {
    return { error: NextResponse.json({ error: "La sesión no es válida" }, { status: 401 }) };
  }

  const { data: employee, error: employeeError } = await supabase
    .from("empleados")
    .select("id, email, rol, nombre, apellido")
    .ilike("email", user.email)
    .maybeSingle();
  if (employeeError) {
    return { error: NextResponse.json({ error: "No se pudo validar el permiso" }, { status: 500 }) };
  }
  if (!employee) {
    return { error: NextResponse.json({ error: "Solo el equipo puede acceder" }, { status: 403 }) };
  }

  return { employee: employee as EmployeeSession };
}

/**
 * Valida el token de la sesión y comprueba que el correo pertenezca a un
 * empleado. Si se indican roles, también exige que el empleado tenga uno de
 * ellos. Devuelve null cuando el acceso está permitido.
 */
export async function authorizeEmployeeRequest(
  request: NextRequest,
  options: EmployeeRoleOptions = {},
) {
  const result = await resolveEmployee(request);
  if ("error" in result) return result.error;
  if (options.roles && !options.roles.includes(result.employee.rol)) {
    return NextResponse.json(
      { error: options.message || "No tienes permiso para esta acción" },
      { status: 403 },
    );
  }

  return null;
}

/**
 * Igual que authorizeEmployeeRequest, pero además devuelve los datos del
 * empleado autenticado (útil para registrar quién hizo la acción).
 */
export async function requireEmployeeRequest(
  request: NextRequest,
  options: EmployeeRoleOptions = {},
): Promise<EmployeeResult> {
  const result = await resolveEmployee(request);
  if ("error" in result) return result;
  if (options.roles && !options.roles.includes(result.employee.rol)) {
    return {
      error: NextResponse.json(
        { error: options.message || "No tienes permiso para esta acción" },
        { status: 403 },
      ),
    };
  }

  return result;
}

export async function authorizeAdminEmployeeRequest(request: NextRequest) {
  return authorizeEmployeeRequest(request, {
    roles: ["admin"],
    message: "Solo un administrador puede gestionar empleados",
  });
}
