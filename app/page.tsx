import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PublicCatalog from "./public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Essence Spa | Servicios y promociones",
  description: "Descubre los servicios y promociones vigentes de Essence Spa.",
};

export interface PublicService {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number;
  duracion: number | null;
  imagen: string | null;
  estado: string | null;
}

export interface PublicPromotion {
  id: string;
  nombre: string;
  descripcion: string | null;
  descuento: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean;
}

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const [servicesResult, promotionsResult] = await Promise.all([
    supabase.from("servicios").select("id, nombre, descripcion, categoria, precio, duracion, imagen, estado").order("nombre"),
    supabase.from("promociones").select("id, nombre, descripcion, descuento, fecha_inicio, fecha_fin, activa").order("created_at", { ascending: false }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const services = ((servicesResult.data || []) as PublicService[])
    .filter((service) => service.estado !== "inactivo");
  const promotions = ((promotionsResult.data || []) as PublicPromotion[])
    .filter((promotion) => promotion.activa
      && (!promotion.fecha_inicio || promotion.fecha_inicio <= today)
      && (!promotion.fecha_fin || promotion.fecha_fin >= today));

  return <PublicCatalog
    services={services}
    promotions={promotions}
    dataUnavailable={Boolean(servicesResult.error || promotionsResult.error)}
  />;
}