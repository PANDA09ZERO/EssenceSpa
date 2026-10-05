import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminEmployeeRequest } from "@/lib/employee-api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const rolesPermitidos = new Set(["admin", "manicurista", "recepcionista"]);

function specialtiesFrom(value: unknown): string[] | null {
  const specialties = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string" ? value.split(",") : [];
  const cleaned = specialties.map((item) => item.trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await authorizeAdminEmployeeRequest(request);
  if (authError) return authError;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es válido" }, { status: 400 });
  }

  if (typeof body.nombre !== "string" || !body.nombre.trim() || typeof body.apellido !== "string" || !body.apellido.trim()) {
    return NextResponse.json({ error: "Nombre y apellido son obligatorios" }, { status: 400 });
  }
  if (typeof body.rol !== "string" || !rolesPermitidos.has(body.rol)) {
    return NextResponse.json({ error: "El rol seleccionado no es válido" }, { status: 400 });
  }
  if (body.password !== undefined && (typeof body.password !== "string" || (body.password && body.password.length < 8))) {
    return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo configurar el acceso" }, { status: 500 });
  }

  const { data: employee, error: employeeError } = await admin.from("empleados")
    .select("auth_user_id, email")
    .eq("id", id)
    .maybeSingle();
  if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
  if (!employee) return NextResponse.json({ error: "No se encontró el empleado" }, { status: 404 });

  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
  const password = typeof body.password === "string" ? body.password : "";
  const hasPassword = password.length > 0;
  let authUserId: string | null = employee.auth_user_id;
  let createdAuthUserId: string | null = null;

  if ((authUserId || hasPassword) && !email) {
    return NextResponse.json({ error: "El email es obligatorio para activar la cuenta de acceso" }, { status: 400 });
  }

  if (!authUserId && hasPassword) {
    const candidateEmails = new Set([email, employee.email?.trim().toLowerCase()].filter((value): value is string => Boolean(value)));
    let matchingUserId: string | null = null;
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const matchingUser = data.users.find((user) => user.email && candidateEmails.has(user.email.toLowerCase()));
      if (matchingUser) {
        matchingUserId = matchingUser.id;
        break;
      }
      if (data.users.length < 1000) break;
    }

    if (matchingUserId) {
      const { data: linkedEmployee, error: linkError } = await admin.from("empleados")
        .select("id")
        .eq("auth_user_id", matchingUserId)
        .neq("id", id)
        .maybeSingle();
      if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
      if (linkedEmployee) {
        return NextResponse.json({ error: "La cuenta de este email ya está vinculada a otro empleado" }, { status: 409 });
      }
      authUserId = matchingUserId;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: email!,
        password,
        email_confirm: true,
        user_metadata: { name: `${body.nombre.trim()} ${body.apellido.trim()}`, role: body.rol },
      });
      if (error || !data.user) {
        return NextResponse.json({ error: error?.message || "No se pudo crear la cuenta de acceso" }, { status: 400 });
      }
      authUserId = data.user.id;
      createdAuthUserId = data.user.id;
    }
  }

  const update: Record<string, unknown> = {
    nombre: body.nombre.trim(),
    apellido: body.apellido.trim(),
    email,
    telefono: typeof body.telefono === "string" && body.telefono.trim() ? body.telefono.trim() : null,
    cargo: typeof body.cargo === "string" && body.cargo.trim() ? body.cargo.trim() : null,
    rol: body.rol,
    especialidad: specialtiesFrom(body.especialidad),
  };

  if (authUserId) {
    update.auth_user_id = authUserId;
    if (!createdAuthUserId) {
      const authUpdates: {
        email?: string;
        email_confirm?: boolean;
        password?: string;
        user_metadata: { name: string; role: string };
      } = {
        user_metadata: { name: `${body.nombre.trim()} ${body.apellido.trim()}`, role: body.rol },
      };
      if (email !== employee.email?.trim().toLowerCase()) {
        authUpdates.email = email!;
        authUpdates.email_confirm = true;
      }
      if (hasPassword) authUpdates.password = password;

      const { error } = await admin.auth.admin.updateUserById(authUserId, authUpdates);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const { data, error } = await admin.from("empleados").update(update)
    .eq("id", id)
    .select("id, nombre, apellido, email, telefono, cargo, rol, especialidad")
    .single();

  if (error) {
    if (createdAuthUserId) await admin.auth.admin.deleteUser(createdAuthUserId);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await authorizeAdminEmployeeRequest(request);
  if (authError) return authError;

  const { id } = await params;
  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo configurar el acceso" }, { status: 500 });
  }

  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return NextResponse.json({ error: "Debes iniciar sesión como administrador" }, { status: 401 });
  const { data: authData, error: authErrorDetail } = await admin.auth.getUser(accessToken);
  if (authErrorDetail || !authData.user) return NextResponse.json({ error: "La sesión no es válida" }, { status: 401 });

  const { data: employee, error: employeeError } = await admin.from("empleados")
    .select("id, email, rol, auth_user_id")
    .eq("id", id)
    .maybeSingle();
  if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
  if (!employee) return NextResponse.json({ error: "No se encontró el empleado" }, { status: 404 });

  const sameEmail = employee.email && authData.user.email
    && employee.email.trim().toLowerCase() === authData.user.email.toLowerCase();
  if (employee.auth_user_id === authData.user.id || sameEmail) {
    return NextResponse.json({ error: "No puedes eliminar tu propio perfil de administrador." }, { status: 409 });
  }

  if (employee.rol === "admin") {
    const { count, error: adminsError } = await admin.from("empleados")
      .select("id", { count: "exact", head: true })
      .eq("rol", "admin");
    if (adminsError) return NextResponse.json({ error: adminsError.message }, { status: 500 });
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "No se puede eliminar al último administrador del equipo." }, { status: 409 });
    }
  }

  if (employee.auth_user_id) {
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(employee.auth_user_id);
    if (deleteAuthError) return NextResponse.json({ error: `No se pudo eliminar la cuenta de acceso: ${deleteAuthError.message}` }, { status: 400 });
  }

  const { error: deleteEmployeeError } = await admin.from("empleados").delete().eq("id", id);
  if (deleteEmployeeError) {
    const detail = employee.auth_user_id
      ? `Se eliminó la cuenta de acceso, pero no el perfil del empleado: ${deleteEmployeeError.message}`
      : deleteEmployeeError.message;
    return NextResponse.json({ error: detail }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}