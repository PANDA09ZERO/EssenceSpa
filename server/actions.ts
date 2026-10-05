"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function login(email: string, password: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore if called outside request context
          }
        },
      },
    }
  );
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { data };
}

export async function logout() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore if called outside request context
          }
        },
      },
    }
  );
  const { error } = await supabase.auth.signOut();
  if (error) return { error: error.message };
  revalidatePath("/login");
  return { success: true };
}

export async function createCita(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore if called outside request context
          }
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const cita = {
    id_cliente: Number(formData.get("id_cliente")),
    id_empleado: Number(formData.get("id_empleado") || "0"),
    fecha: formData.get("fecha") as string,
    hora_inicio: formData.get("hora") as string,
    estado: "pendiente",
    notas: formData.get("notas") as string || null,
  };
  const { data, error } = await supabase.from("citas").insert([cita]).select().single();
  if (error) return { error: error.message };
  revalidatePath("/dashboard/citas");
  return { data };
}

export async function createCliente(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore if called outside request context
          }
        },
      },
    }
  );
  const cliente = {
    nombre: formData.get("nombre") as string,
    apellido: formData.get("apellido") as string,
    email: (formData.get("email") as string) || null,
    telefono: formData.get("telefono") as string,
    direccion: (formData.get("direccion") as string) || null,
    fecha_nacimiento: (formData.get("fecha_nacimiento") as string) || null,
  };
  const { data, error } = await supabase.from("clientes").insert([cliente]).select().single();
  if (error) return { error: error.message };
  revalidatePath("/dashboard/clientes");
  return { data };
}

export async function createServicio(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore if called outside request context
          }
        },
      },
    }
  );
  const servicio = {
    nombre: formData.get("nombre") as string,
    descripcion: (formData.get("descripcion") as string) || null,
    categoria: formData.get("categoria") as string,
    precio: Number(formData.get("precio")),
    duracion: Number(formData.get("duracion")),
    estado: "activo",
  };
  const { data, error } = await supabase.from("servicios").insert([servicio]).select().single();
  if (error) return { error: error.message };
  revalidatePath("/dashboard/servicios");
  return { data };
}

export async function getCitas() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore if called outside request context
          }
        },
      },
    }
  );
  const { data, error } = await supabase.from("citas").select("*").order("fecha", { ascending: true });
  if (error) return { error: error.message };
  return { data };
}

export async function getClientes() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore if called outside request context
          }
        },
      },
    }
  );
  const { data, error } = await supabase.from("clientes").select("*").order("nombre", { ascending: true });
  if (error) return { error: error.message };
  return { data };
}

export async function getServicios() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore if called outside request context
          }
        },
      },
    }
  );
  const { data, error } = await supabase.from("servicios").select("*").order("nombre", { ascending: true });
  if (error) return { error: error.message };
  return { data };
}

export async function getConfiguracion() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore if called outside request context
          }
        },
      },
    }
  );
  const { data, error } = await supabase.from("configuracion").select("*");
  if (error) return { error: error.message };
  return { data };
}
