"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, Clock3, Facebook, Instagram, MapPin, MessageCircle, Plus, Search, ShoppingBag, Sparkles, Tag, X } from "lucide-react";
import type { PublicPromotion, PublicService } from "./page";
import coverImage from "../imagenes/WhatsApp Image 2026-09-26 at 10.11.45 PM.jpeg";
import detailImageOne from "../imagenes/WhatsApp Image 2026-09-26 at 10.11.46 PM (1).jpeg";
import detailImageTwo from "../imagenes/WhatsApp Image 2026-09-26 at 10.11.46 PM.jpeg";
import detailImageThree from "../imagenes/WhatsApp Image 2026-09-26 at 10.11.47 PM.jpeg";
import detailImageFour from "../imagenes/WhatsApp Image 2026-09-26 at 10.11.48 PM.jpeg";
import detailImageFive from "../imagenes/WhatsApp Image 2026-09-26 at 10.11.49 PM.jpeg";
import detailImageSix from "../imagenes/WhatsApp Image 2026-09-26 at 10.11.53 PM.jpeg";
import detailImageSeven from "../imagenes/WhatsApp Image 2026-09-26 at 10.11.55 PM (1).jpeg";
import detailImageEight from "../imagenes/WhatsApp Image 2026-09-26 at 10.11.55 PM.jpeg";

const galleryImages = [
  detailImageOne,
  detailImageTwo,
  detailImageThree,
  detailImageFour,
  detailImageFive,
  detailImageSix,
  detailImageSeven,
  detailImageEight,
];
const galleryLayout = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-2",
  "col-span-1",
  "col-span-1",
  "col-span-1",
  "col-span-1",
  "col-span-2",
  "col-span-1 row-span-2",
];

interface Props {
  services: PublicService[];
  promotions: PublicPromotion[];
  dataUnavailable: boolean;
}

function formatPrice(price: number) {
  const amount = Number(price);
  return `S/ ${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

function formatDate(date: string | null) {
  if (!date) return null;
  const [year, month, day] = date.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export default function PublicCatalog({ services, promotions, dataUnavailable }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
  const categories = useMemo(() => ["Todos", ...Array.from(new Set(services.map((service) => service.categoria).filter((item): item is string => Boolean(item))))], [services]);
  const filteredServices = useMemo(() => services.filter((service) => {
    const matchesCategory = category === "Todos" || service.categoria === category;
    const matchesSearch = `${service.nombre} ${service.descripcion || ""}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  }), [services, category, search]);
  const selectedServices = services.filter((service) => selectedServiceIds.includes(service.id));
  const subtotal = selectedServices.reduce((total, service) => total + Number(service.precio), 0);
  const selectedPromotion = promotions.find((promotion) => promotion.id === selectedPromotionId) || null;
  const discount = selectedPromotion ? Math.min(100, Math.max(0, Number(selectedPromotion.descuento))) : 0;
  const total = subtotal * (1 - discount / 100);
  const whatsappMessage = [
    "Hola, Essence Spa. Quisiera hacer un pedido:",
    ...selectedServices.map((service) => `- ${service.nombre}: ${formatPrice(Number(service.precio))}`),
    selectedPromotion ? `Promoción elegida: ${selectedPromotion.nombre} (${discount}% de descuento).` : "",
    selectedServices.length ? `Subtotal: ${formatPrice(subtotal)}${selectedPromotion ? `\nTotal estimado con promoción: ${formatPrice(total)}` : ""}` : "",
    "¿Me ayudan a coordinar?",
  ].filter(Boolean).join("\n");
  const whatsappUrl = `https://wa.me/51917650720?text=${encodeURIComponent(whatsappMessage)}`;

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) => current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId]);
  }

  return (
    <main className="min-h-screen bg-brand-screen text-brand-text">
      <section className="relative isolate flex min-h-[680px] items-end overflow-hidden bg-brand-green-dark text-white sm:min-h-[740px]">
        <Image src={coverImage} alt="Ambiente de Essence Spa" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/40" />
        <header className="absolute inset-x-0 top-0 z-10 border-b border-white/20">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
            <a href="#inicio" className="flex items-center gap-3" aria-label="Essence Spa, inicio">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70"><Sparkles size={18} /></span>
              <span className="font-display text-lg font-semibold">Essence Spa</span>
            </a>
            <nav aria-label="Navegación principal" className="hidden items-center gap-8 text-sm text-white/90 md:flex">
              <a className="transition-colors hover:text-white" href="#servicios">Servicios</a>
              <a className="transition-colors hover:text-white" href="#promociones">Promociones</a>
              <a className="transition-colors hover:text-white" href="https://maps.app.goo.gl/2uKCedfdADDGvCMc7" target="_blank" rel="noreferrer">Cómo llegar</a>
              <a className="transition-colors hover:text-white" href="https://www.facebook.com/profile.php?id=61583364283486" target="_blank" rel="noreferrer" aria-label="Facebook de Essence Spa"><Facebook size={18} /></a>
              <a className="transition-colors hover:text-white" href="https://www.instagram.com/essence.spa_pcl" target="_blank" rel="noreferrer" aria-label="Instagram de Essence Spa"><Instagram size={18} /></a>
              <a className="transition-colors hover:text-white" href="https://wa.me/51917650720" target="_blank" rel="noreferrer" aria-label="WhatsApp de Essence Spa"><MessageCircle size={18} /></a>
            </nav>
          </div>
        </header>

        <div id="inicio" className="mx-auto w-full max-w-7xl px-5 pb-20 pt-36 sm:px-8 sm:pb-24">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold-light">Belleza, cuidado y pausa</p>
          <h1 className="max-w-3xl font-display text-5xl font-medium leading-[1.04] sm:text-7xl">Essence Spa</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
            Un espacio para renovar tu estilo y regalarte un momento para ti.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <a href="#servicios" className="inline-flex items-center gap-3 border border-brand-cream-light bg-brand-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark">
              Explorar servicios <ArrowDown size={17} />
            </a>
            <a href="#promociones" className="text-sm font-medium text-white underline decoration-white/60 underline-offset-4 transition-colors hover:text-brand-gold-light">
              Ver promociones
            </a>
            <a href="https://maps.app.goo.gl/2uKCedfdADDGvCMc7" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-white underline decoration-white/60 underline-offset-4 transition-colors hover:text-brand-gold-light">
              Cómo llegar <MapPin size={17} />
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="gallery-title" className="border-b border-brand-cream-dark bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-8 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-terracotta">Un vistazo a Essence</p>
            <h2 id="gallery-title" className="mt-2 font-display text-3xl font-medium sm:text-4xl">Un espacio para sentirte bien</h2>
            <p className="mt-3 text-sm leading-6 text-brand-text-light">Detalles, cuidado y momentos para dedicarte tiempo.</p>
          </div>
          <div className="grid auto-rows-[130px] grid-cols-2 gap-2 sm:auto-rows-[170px] sm:gap-3 lg:auto-rows-[190px] lg:grid-cols-4">
            {galleryImages.map((image, index) => (
              <div key={image.src} className={`group relative overflow-hidden bg-brand-green/10 ${galleryLayout[index]}`}>
                <Image src={image} alt={`Essence Spa, detalle ${index + 1}`} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="promociones" className="scroll-mt-8 border-b border-brand-cream-dark bg-brand-green/10">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-terracotta">Por tiempo limitado</p>
              <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">Promociones vigentes</h2>
            </div>
            <span className="text-sm text-brand-text-light">{promotions.length} {promotions.length === 1 ? "promoción" : "promociones"}</span>
          </div>
          {promotions.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {promotions.map((promotion) => (
                <article key={promotion.id} className="flex min-h-40 items-stretch border border-brand-cream-dark bg-white">
                  <div className="flex w-28 shrink-0 flex-col items-center justify-center bg-brand-terracotta px-3 text-white sm:w-36">
                    <Tag size={19} />
                    <span className="mt-2 font-display text-3xl font-semibold">{Number(promotion.descuento)}%</span>
                    <span className="text-[10px] uppercase tracking-wider">de descuento</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center p-5">
                    <h3 className="font-display text-xl font-semibold">{promotion.nombre}</h3>
                    <p className="mt-1 text-sm leading-5 text-brand-text-light">{promotion.descripcion || "Aprovecha esta promoción en Essence Spa."}</p>
                    {(promotion.fecha_inicio || promotion.fecha_fin) && <p className="mt-3 text-xs text-brand-text-light">{formatDate(promotion.fecha_inicio) || "Desde hoy"} · {formatDate(promotion.fecha_fin) || "Sin fecha límite"}</p>}
                    <button type="button" aria-pressed={selectedPromotionId === promotion.id} onClick={() => setSelectedPromotionId((current) => current === promotion.id ? null : promotion.id)} className={`mt-4 inline-flex w-fit items-center gap-2 border px-3 py-2 text-sm font-medium transition-colors ${selectedPromotionId === promotion.id ? "border-brand-green bg-brand-green text-white" : "border-brand-cream-dark text-brand-green hover:border-brand-green"}`}>
                      {selectedPromotionId === promotion.id ? <Check size={16} /> : <Tag size={16} />}
                      {selectedPromotionId === promotion.id ? "Promo elegida" : "Elegir esta promo"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="border-t border-brand-cream-dark py-7 text-sm text-brand-text-light">No hay promociones vigentes en este momento. Vuelve pronto.</p>
          )}
        </div>
      </section>

      <section id="servicios" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green-light">Nuestro menú</p>
            <h2 className="mt-2 font-display text-4xl font-medium sm:text-5xl">Servicios</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-brand-text-light">Encuentra el cuidado que buscas y consulta precios y duración.</p>
          </div>
          <label className="flex w-full items-center gap-3 border-b border-brand-green-light py-3 lg:max-w-xs">
            <Search size={18} className="shrink-0 text-brand-green-light" />
            <input type="search" aria-label="Buscar servicio" placeholder="Buscar servicio" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-brand-text-light" />
          </label>
        </div>

        <div className="mt-7 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filtrar servicios por categoría">
          {categories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`shrink-0 border px-4 py-2 text-sm transition-colors ${category === item ? "border-brand-green bg-brand-green text-white" : "border-brand-green-light bg-transparent text-brand-green-light hover:border-brand-green hover:text-brand-green"}`}>
              {item}
            </button>
          ))}
        </div>

        {dataUnavailable && <p role="status" className="mt-6 border-l-2 border-brand-terracotta pl-3 text-sm text-brand-text-light">Algunos datos no están disponibles por el momento.</p>}
        {filteredServices.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredServices.map((service, index) => {
              return (
                <article key={service.id} className="catalog-reveal group overflow-hidden border border-brand-cream-dark bg-white" style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}>
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-brand-green/10">
                    {service.imagen ? <Image src={service.imagen} alt={`Imagen de ${service.nombre}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" unoptimized className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <Sparkles aria-hidden="true" size={34} strokeWidth={1.2} className="text-brand-green-light/60" />}
                    {service.categoria && <span className="absolute left-3 top-3 bg-white/95 px-3 py-1 text-xs font-medium text-brand-green">{service.categoria}</span>}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-xl font-semibold leading-6">{service.nombre}</h3>
                      <span className="shrink-0 text-sm font-semibold text-brand-terracotta">{formatPrice(service.precio)}</span>
                    </div>
                    {service.descripcion && <p className="mt-2 line-clamp-2 text-sm leading-5 text-brand-text-light">{service.descripcion}</p>}
                    {service.duracion && <p className="mt-4 flex items-center gap-2 text-xs text-brand-text-light"><Clock3 size={14} />{service.duracion} min</p>}
                    <button type="button" aria-pressed={selectedServiceIds.includes(service.id)} onClick={() => toggleService(service.id)} className={`mt-4 inline-flex w-full items-center justify-center gap-2 border px-3 py-2 text-sm font-medium transition-colors ${selectedServiceIds.includes(service.id) ? "border-brand-green bg-brand-green text-white" : "border-brand-cream-dark text-brand-green hover:border-brand-green"}`}>
                      {selectedServiceIds.includes(service.id) ? <Check size={16} /> : <Plus size={16} />}
                      {selectedServiceIds.includes(service.id) ? "Agregado al pedido" : "Agregar al pedido"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-8 border-t border-brand-cream-dark py-8 text-sm text-brand-text-light">{services.length ? "No encontramos servicios con esos criterios." : "Los servicios se publicarán aquí próximamente."}</p>
        )}
      </section>

      {selectedServices.length > 0 && (
        <div className="fixed bottom-5 left-1/2 z-[1000] w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 sm:left-auto sm:right-5 sm:w-auto sm:translate-x-0">
          {isOrderPanelOpen && (
            <section
              id="order-panel"
              role="dialog"
              aria-labelledby="order-title"
              className="absolute bottom-full right-0 mb-3 max-h-[min(70vh,32rem)] w-full overflow-y-auto border border-brand-cream-dark bg-white p-5 text-brand-text shadow-2xl sm:w-[22rem]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-green-light"><ShoppingBag size={15} /> Tu pedido</p>
                  <h2 id="order-title" className="mt-2 font-display text-2xl font-medium">{selectedServices.length} {selectedServices.length === 1 ? "servicio" : "servicios"}</h2>
                </div>
                <button type="button" onClick={() => setIsOrderPanelOpen(false)} aria-label="Cerrar detalle del pedido" className="p-1 text-brand-text-light transition-colors hover:text-brand-text">
                  <X size={19} />
                </button>
              </div>
              <ul className="mt-4 divide-y divide-brand-cream-dark border-y border-brand-cream-dark">
                {selectedServices.map((service) => (
                  <li key={service.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0">{service.nombre} <span className="text-brand-text-light">· {formatPrice(Number(service.precio))}</span></span>
                    <button type="button" onClick={() => toggleService(service.id)} aria-label={`Quitar ${service.nombre} del pedido`} className="shrink-0 p-1 text-brand-terracotta transition-colors hover:text-brand-green">
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
              {selectedPromotion && <p className="mt-3 text-sm text-brand-text-light">Promo: {selectedPromotion.nombre} ({discount}%).</p>}
              {selectedPromotion && <p className="mt-4 text-right text-xs text-brand-text-light">Subtotal {formatPrice(subtotal)}</p>}
              <p className="mt-1 text-right text-lg font-semibold text-brand-terracotta">Total estimado: {formatPrice(total)}</p>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-brand-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark">
                <MessageCircle size={18} /> Pedir por WhatsApp <ArrowUpRight size={16} />
              </a>
            </section>
          )}
          <button
            type="button"
            aria-expanded={isOrderPanelOpen}
            aria-controls={isOrderPanelOpen ? "order-panel" : undefined}
            onClick={() => setIsOrderPanelOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-4 border border-brand-cream-light bg-brand-green px-4 py-3 text-left text-white shadow-xl transition-colors hover:bg-brand-green-dark sm:min-w-72"
          >
            <span className="flex min-w-0 items-center gap-3">
              <ShoppingBag size={20} className="shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Ver pedido</span>
                <span className="block truncate text-xs text-white/80">{selectedServices.length} {selectedServices.length === 1 ? "servicio" : "servicios"}</span>
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold">{formatPrice(total)}</span>
          </button>
        </div>
      )}

      <footer className="border-t border-brand-cream-dark bg-brand-green-dark text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-display text-xl">Essence Spa</p>
            <p className="mt-1 text-xs text-brand-text-light">Belleza y cuidado, a tu manera.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/80">
            <a href="#servicios" className="hover:text-white">Servicios</a>
            <a href="#promociones" className="hover:text-white">Promociones</a>
            <a href="https://maps.app.goo.gl/2uKCedfdADDGvCMc7" target="_blank" rel="noreferrer" className="hover:text-white">Cómo llegar</a>
          </div>
          <div className="flex items-center gap-4 text-white/80">
            <a href="https://www.facebook.com/profile.php?id=61583364283486" target="_blank" rel="noreferrer" aria-label="Facebook de Essence Spa" className="transition-colors hover:text-white"><Facebook size={19} /></a>
            <a href="https://www.instagram.com/essence.spa_pcl" target="_blank" rel="noreferrer" aria-label="Instagram de Essence Spa" className="transition-colors hover:text-white"><Instagram size={19} /></a>
            <a href="https://wa.me/51917650720" target="_blank" rel="noreferrer" aria-label="WhatsApp de Essence Spa" className="transition-colors hover:text-white"><MessageCircle size={19} /></a>
          </div>
        </div>
      </footer>
    </main>
  );
}