"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Check, Clock3, Facebook, Instagram, MapPin, Menu, MessageCircle, Plus, Search, ShoppingBag, Tag, X } from "lucide-react";
import type { PublicPromotion, PublicService } from "./page";
import { formatServiceName as displayName } from "@/lib/utils";
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

interface Props {
  services: PublicService[];
  promotions: PublicPromotion[];
  dataUnavailable: boolean;
}

function formatPrice(price: number) {
  const amount = Number(price);
  return `S/ ${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

const WHATSAPP_URL = "https://wa.me/51917650720";
const MAPS_URL = "https://maps.app.goo.gl/2uKCedfdADDGvCMc7";

function ServicePlaceholder({ size = 34 }: { size?: number }) {
  return (
    <span aria-hidden="true" className="flex h-full w-full items-center justify-center bg-[#EDEAE3]">
      <span className="font-display italic text-brand-gold" style={{ fontSize: size }}>Essence</span>
    </span>
  );
}

function formatDate(date: string | null) {
  if (!date) return null;
  const [year, month, day] = date.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function ServiceDetailModal({ service, isSelected, onToggle, onClose }: {
  service: PublicService;
  isSelected: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, []);

  const consultUrl = `${WHATSAPP_URL}?text=${encodeURIComponent(`Hola, Essence Spa. Quisiera consultar por el servicio ${displayName(service.nombre)}.`)}`;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-detail-title"
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white text-brand-text shadow-2xl sm:max-h-[88vh]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle del servicio"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-text shadow-md transition-colors hover:bg-white"
        >
          <X size={20} />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
          <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-brand-green/10 sm:aspect-[2/1]">
            {service.imagen ? (
              <Image
                src={service.imagen}
                alt={`Imagen de ${service.nombre}`}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                unoptimized
                className="object-cover"
              />
            ) : (
              <ServicePlaceholder size={48} />
            )}
            {service.categoria && (
              <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-brand-green">{service.categoria}</span>
            )}
          </div>

          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 id="service-detail-title" className="font-display text-3xl font-medium leading-tight sm:text-4xl">{displayName(service.nombre)}</h2>
              <p className="shrink-0 font-display text-2xl font-semibold text-brand-terracotta">{formatPrice(service.precio)}</p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-brand-text-light">
              {service.duracion ? <span className="flex items-center gap-2"><Clock3 size={16} />{service.duracion} min</span> : null}
              <span className="flex items-center gap-2"><Tag size={16} />{service.categoria || "Servicio"}</span>
            </div>

            <div className="mt-6 border-t border-brand-cream-dark pt-5">
              <h3 className="text-sm font-semibold text-brand-text">Qué incluye</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-brand-text">
                {service.descripcion?.trim() || "Escríbenos por WhatsApp y te contamos todos los detalles de este servicio."}
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onToggle}
                aria-pressed={isSelected}
                className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition-colors ${isSelected ? "border-brand-green bg-[#EFEDE6] text-brand-text" : "border-brand-green text-brand-green hover:bg-brand-green hover:text-white"}`}
              >
                {isSelected ? <X size={17} /> : <Plus size={17} />}
                {isSelected ? "Quitar de mi selección" : "Elegir servicio"}
              </button>
              <a
                href={consultUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
              >
                <MessageCircle size={18} /> Consultar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicCatalog({ services, promotions, dataUnavailable }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [detailService, setDetailService] = useState<PublicService | null>(null);
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
    "Hola, Essence Spa. Quisiera reservar:",
    ...selectedServices.map((service) => `- ${displayName(service.nombre)}: ${formatPrice(Number(service.precio))}`),
    selectedPromotion ? `Promoción elegida: ${displayName(selectedPromotion.nombre)} (${discount}% de descuento).` : "",
    selectedServices.length ? `Subtotal: ${formatPrice(subtotal)}${selectedPromotion ? `\nTotal estimado con promoción: ${formatPrice(total)}` : ""}` : "",
    "¿Me ayudan a coordinar?",
  ].filter(Boolean).join("\n");
  const whatsappUrl = `${WHATSAPP_URL}?text=${encodeURIComponent(whatsappMessage)}`;

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) => current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId]);
  }

  const showPromotions = promotions.length > 0 || dataUnavailable;
  const categoryCounts = useMemo(() => services.reduce<Record<string, number>>((counts, service) => {
    if (service.categoria) counts[service.categoria] = (counts[service.categoria] || 0) + 1;
    return counts;
  }, {}), [services]);
  const navLinks = [
    { href: "#servicios", label: "Servicios", external: false },
    ...(showPromotions ? [{ href: "#promociones", label: "Promociones", external: false }] : []),
    { href: MAPS_URL, label: "Cómo llegar", external: true },
  ];
  const externalProps = { target: "_blank", rel: "noreferrer" };

  return (
    <main className="public-catalog min-h-screen bg-brand-cream text-brand-text">
      <section className="relative isolate flex min-h-[540px] items-end overflow-hidden bg-brand-green-dark text-white sm:min-h-[600px]">
        <Image src={coverImage} alt="Sala de atención de Essence Spa" fill priority sizes="100vw" className="-z-20 object-cover object-center" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/30 sm:bg-gradient-to-r sm:from-black/80 sm:via-black/50 sm:to-black/10" />
        <header className="absolute inset-x-0 top-0 z-10 border-b border-white/15">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
            <a href="#inicio" className="flex min-h-11 items-center" aria-label="Essence Spa, inicio">
              <span className="font-display text-xl tracking-wide">Essence Spa</span>
            </a>
            <nav aria-label="Navegación principal" className="hidden items-center gap-7 text-sm text-white/85 md:flex">
              {navLinks.map((link) => <a key={link.href} className="transition-colors hover:text-white" href={link.href} {...(link.external ? externalProps : {})}>{link.label}</a>)}
              <a className="transition-colors hover:text-white" href="https://www.facebook.com/profile.php?id=61583364283486" {...externalProps} aria-label="Facebook de Essence Spa"><Facebook size={18} /></a>
              <a className="transition-colors hover:text-white" href="https://www.instagram.com/essence.spa_pcl" {...externalProps} aria-label="Instagram de Essence Spa"><Instagram size={18} /></a>
              <a className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/50 px-5 transition-colors hover:bg-white hover:text-brand-text" href={WHATSAPP_URL} {...externalProps}><MessageCircle size={17} /> Consultar</a>
            </nav>
            <button type="button" aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={mobileMenuOpen} aria-controls="catalog-mobile-nav" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 md:hidden">{mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
          {mobileMenuOpen && <nav id="catalog-mobile-nav" aria-label="Navegación móvil" className="header-mobile-menu flex flex-col border-t border-white/15 bg-brand-green px-5 pb-4 pt-2 md:hidden">
            {navLinks.map((link) => <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="flex min-h-12 items-center border-b border-white/10 text-base" {...(link.external ? externalProps : {})}>{link.label}</a>)}
            <div className="mt-3 flex items-center gap-2 text-white/85">
              <a href="https://www.instagram.com/essence.spa_pcl" {...externalProps} aria-label="Instagram de Essence Spa" className="flex h-11 w-11 items-center justify-center"><Instagram size={20} /></a>
              <a href="https://www.facebook.com/profile.php?id=61583364283486" {...externalProps} aria-label="Facebook de Essence Spa" className="flex h-11 w-11 items-center justify-center"><Facebook size={20} /></a>
            </div>
          </nav>}
        </header>

        <div id="inicio" className="mx-auto w-full max-w-7xl px-5 pb-14 pt-36 sm:px-8 sm:pb-24">
          <p className="mb-5 flex items-center gap-3 text-sm text-white/85"><span aria-hidden="true" className="h-px w-8 bg-brand-gold" />Uñas, cejas y pestañas</p>
          <h1 className="max-w-3xl font-display text-[3.25rem] font-normal leading-[1.02] sm:text-7xl lg:text-8xl">Un momento<br /><em className="font-normal">para ti.</em></h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/85 sm:text-lg">
            Elige tus servicios, mira precios y duración, y coordina tu cita por WhatsApp.
          </p>
          <div className="mt-9 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center">
            <a href="#servicios" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-brand-cream px-7 text-sm font-semibold text-brand-text transition-colors hover:bg-white">
              Ver servicios <ArrowDown size={17} />
            </a>
            <a href={WHATSAPP_URL} {...externalProps} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/50 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10">
              <MessageCircle size={18} /> Consultar por WhatsApp
            </a>
          </div>
          <a href={MAPS_URL} {...externalProps} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm text-white/80 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white">
            <MapPin size={16} /> Cómo llegar
          </a>
        </div>
      </section>

      <section id="servicios" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-4xl font-normal sm:text-5xl">Servicios</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-brand-text-light">Toca un servicio para ver qué incluye. Elige los que quieras y envíanos tu selección.</p>
          </div>
          <label className="flex min-h-12 w-full items-center gap-3 rounded-full border border-brand-green/20 bg-white px-5 focus-within:border-brand-green lg:max-w-xs">
            <Search size={18} className="shrink-0 text-brand-green-light" />
            <input type="search" aria-label="Buscar servicio" placeholder="Buscar servicio" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-brand-text-light" />
          </label>
        </div>

        <div className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar servicios por categoría">
          {categories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${category === item ? "border-brand-green bg-brand-green text-white" : "border-brand-green/20 bg-white text-brand-text hover:border-brand-green"}`}>
              {item}
              <span className={`text-xs ${category === item ? "text-white/70" : "text-brand-text-light"}`}>{item === "Todos" ? services.length : categoryCounts[item]}</span>
            </button>
          ))}
        </div>

        {dataUnavailable && <p role="status" className="mt-6 border-l-2 border-brand-terracotta pl-3 text-sm text-brand-text-light">Algunos datos no están disponibles por el momento.</p>}
        {filteredServices.length ? (
          <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {filteredServices.map((service, index) => {
              const isSelected = selectedServiceIds.includes(service.id);
              const name = displayName(service.nombre);
              return (
                <article key={service.id} className={`catalog-reveal flex gap-4 rounded-2xl border bg-white p-3 transition-[box-shadow,border-color] hover:shadow-bento sm:flex-col sm:gap-0 sm:overflow-hidden sm:p-0 ${isSelected ? "border-brand-green" : "border-brand-cream-dark"}`} style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}>
                  <button type="button" onClick={() => setDetailService(service)} aria-label={`Ver detalle de ${name}`} className="group/image relative aspect-square w-24 shrink-0 self-start overflow-hidden rounded-xl bg-[#EDEAE3] sm:aspect-[4/3] sm:w-full sm:rounded-none">
                    {service.imagen ? <Image src={service.imagen} alt="" fill sizes="(max-width: 640px) 96px, (max-width: 1024px) 50vw, 25vw" unoptimized className="object-cover transition-transform duration-500 group-hover/image:scale-[1.03]" /> : <ServicePlaceholder size={22} />}
                    {service.categoria && <span className="absolute left-3 top-3 hidden rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-brand-green sm:block">{service.categoria}</span>}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col sm:p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-lg leading-snug sm:text-xl">
                        <button type="button" onClick={() => setDetailService(service)} className="text-left decoration-brand-gold underline-offset-4 hover:underline">{name}</button>
                      </h3>
                      <span className="shrink-0 font-display text-lg text-brand-terracotta">{formatPrice(service.precio)}</span>
                    </div>
                    {service.descripcion && <p className="mt-1 line-clamp-2 text-sm leading-5 text-brand-text-light">{service.descripcion}</p>}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-3 sm:pt-5">
                      {service.duracion ? <p className="flex items-center gap-1.5 text-xs text-brand-text-light"><Clock3 size={14} />{service.duracion} min</p> : <span />}
                      <button type="button" aria-pressed={isSelected} aria-label={isSelected ? `Quitar ${name} de tu selección` : `Elegir ${name}`} onClick={() => toggleService(service.id)} className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${isSelected ? "border-brand-green bg-brand-green text-white" : "border-brand-green/25 text-brand-green hover:border-brand-green"}`}>
                        {isSelected ? <Check size={15} /> : <Plus size={15} />}
                        {isSelected ? "Elegido" : "Elegir"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div role="status" className="mt-8 rounded-2xl border border-brand-cream-dark bg-white p-8 text-center">
            <Search size={24} className="mx-auto mb-3" />
            <p className="text-sm text-brand-text-light">{services.length ? "No encontramos servicios con esos criterios." : dataUnavailable ? "El catálogo está temporalmente sin conexión. Te ayudamos a elegir por WhatsApp." : "Los servicios se publicarán aquí próximamente."}</p>
            {dataUnavailable && <a href={WHATSAPP_URL} {...externalProps} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-green px-5 py-3 text-sm text-white"><MessageCircle size={18} /> Consultar servicios</a>}
            {services.length > 0 && <button type="button" onClick={() => { setSearch(""); setCategory("Todos"); }} className="mt-4 min-h-11 rounded-full bg-brand-green px-5 py-2 text-sm text-white">Limpiar filtros</button>}
          </div>
        )}
      </section>

      {showPromotions && <section id="promociones" className="scroll-mt-8 border-y border-brand-cream-dark bg-[#EFEDE6]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
          <div className="mb-8">
            <h2 className="font-display text-3xl font-normal sm:text-4xl">Promociones vigentes</h2>
            <p className="mt-2 text-sm text-brand-text-light">Elige una y la sumamos a tu selección. Confirmamos las condiciones por WhatsApp.</p>
          </div>
          {promotions.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {promotions.map((promotion) => (
                <article key={promotion.id} className={`flex min-h-40 items-stretch overflow-hidden rounded-2xl border bg-white ${selectedPromotionId === promotion.id ? "border-brand-green" : "border-brand-cream-dark"}`}>
                  <div className="flex w-28 shrink-0 flex-col items-center justify-center bg-brand-green px-3 text-white sm:w-32">
                    <span className="font-display text-4xl">{Number(promotion.descuento)}%</span>
                    <span className="mt-1 text-xs text-white/75">de descuento</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center p-5">
                    <h3 className="font-display text-xl">{displayName(promotion.nombre)}</h3>
                    <p className="mt-1 text-sm leading-5 text-brand-text-light">{promotion.descripcion || "Aprovecha esta promoción en Essence Spa."}</p>
                    {(promotion.fecha_inicio || promotion.fecha_fin) && <p className="mt-3 text-xs text-brand-text-light">{promotion.fecha_fin ? `Válida hasta el ${formatDate(promotion.fecha_fin)}` : `Desde el ${formatDate(promotion.fecha_inicio)}`}</p>}
                    <button type="button" aria-pressed={selectedPromotionId === promotion.id} onClick={() => setSelectedPromotionId((current) => current === promotion.id ? null : promotion.id)} className={`mt-4 inline-flex min-h-10 w-fit items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${selectedPromotionId === promotion.id ? "border-brand-green bg-brand-green text-white" : "border-brand-green/25 text-brand-green hover:border-brand-green"}`}>
                      {selectedPromotionId === promotion.id ? <Check size={16} /> : <Tag size={16} />}
                      {selectedPromotionId === promotion.id ? "Promoción elegida" : "Elegir promoción"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-text-light">No pudimos consultar las promociones. Pregúntanos por WhatsApp por las ofertas disponibles.</p>
          )}
        </div>
      </section>}

      <section aria-labelledby="gallery-title" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <h2 id="gallery-title" className="font-display text-3xl font-normal sm:text-4xl">Nuestro espacio</h2>
              <p className="mt-2 text-sm leading-6 text-brand-text-light">Así es Essence por dentro.</p>
            </div>
            <a href={MAPS_URL} {...externalProps} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-brand-gold underline-offset-4"><MapPin size={16} /> Cómo llegar</a>
          </div>
          <div className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[240px] sm:grid-cols-3">
            {(showFullGallery ? galleryImages : galleryImages.slice(0, 3)).map((image, index) => (
              <div key={image.src} className={`relative overflow-hidden rounded-2xl bg-[#EDEAE3] ${index === 0 && !showFullGallery ? "col-span-2 sm:col-span-1" : ""}`}>
                <Image src={image} alt={`Interior de Essence Spa, foto ${index + 1}`} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" />
              </div>
            ))}
          </div>
          <button type="button" aria-expanded={showFullGallery} onClick={() => setShowFullGallery(!showFullGallery)} className="mt-6 min-h-11 rounded-full border border-brand-green/25 px-6 text-sm font-medium transition-colors hover:border-brand-green">{showFullGallery ? "Ver menos fotos" : `Ver las ${galleryImages.length} fotos`}</button>
        </div>
      </section>

      {selectedServices.length > 0 && (
        <div className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[1000] sm:left-auto sm:right-6 sm:w-[22rem]">
          {isOrderPanelOpen && (
            <section
              id="order-panel"
              role="dialog"
              aria-labelledby="order-title"
              className="header-mobile-menu mb-3 max-h-[min(65vh,32rem)] overflow-y-auto rounded-2xl border border-brand-cream-dark bg-white p-5 text-brand-text shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 id="order-title" className="font-display text-2xl">Tu selección</h2>
                <button type="button" onClick={() => setIsOrderPanelOpen(false)} aria-label="Cerrar tu selección" className="-m-2 flex h-11 w-11 items-center justify-center text-brand-text-light transition-colors hover:text-brand-text">
                  <X size={19} />
                </button>
              </div>
              <ul className="mt-3 divide-y divide-brand-cream-dark border-y border-brand-cream-dark">
                {selectedServices.map((service) => (
                  <li key={service.id} className="flex items-center justify-between gap-3 py-1 text-sm">
                    <span className="min-w-0 flex-1">{displayName(service.nombre)}</span>
                    <span className="shrink-0 text-brand-text-light">{formatPrice(Number(service.precio))}</span>
                    <button type="button" onClick={() => toggleService(service.id)} aria-label={`Quitar ${displayName(service.nombre)}`} className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center text-brand-text-light transition-colors hover:text-brand-text">
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
              {selectedPromotion && <p className="mt-3 flex justify-between text-sm text-brand-text-light"><span>Promoción {displayName(selectedPromotion.nombre)}</span><span>−{discount}%</span></p>}
              {selectedPromotion && <p className="mt-1 flex justify-between text-sm text-brand-text-light"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></p>}
              <p className="mt-3 flex items-baseline justify-between"><span className="text-sm">Total estimado</span><span className="font-display text-2xl">{formatPrice(total)}</span></p>
              <p className="mt-2 text-xs leading-5 text-brand-text-light">Confirmamos disponibilidad y total por WhatsApp.</p>
              <a href={whatsappUrl} {...externalProps} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-green px-5 text-sm font-semibold text-white transition-colors hover:bg-black">
                <MessageCircle size={18} /> Enviar por WhatsApp
              </a>
            </section>
          )}
          <button
            type="button"
            aria-expanded={isOrderPanelOpen}
            aria-controls={isOrderPanelOpen ? "order-panel" : undefined}
            onClick={() => setIsOrderPanelOpen((open) => !open)}
            className="flex min-h-14 w-full items-center gap-3 rounded-full bg-brand-green py-2 pl-5 pr-2 text-left text-white shadow-xl"
          >
            <ShoppingBag size={20} aria-hidden="true" strokeWidth={1.6} />
            <span className="min-w-0 flex-1 text-sm">
              {selectedServices.length} {selectedServices.length === 1 ? "servicio" : "servicios"}
              <span className="ml-2 font-display text-base text-white/80">{formatPrice(total)}</span>
            </span>
            <span className="rounded-full bg-brand-cream px-4 py-2 text-sm font-semibold text-brand-text">{isOrderPanelOpen ? "Ocultar" : "Ver selección"}</span>
          </button>
        </div>
      )}

      {detailService && (
        <ServiceDetailModal
          service={detailService}
          isSelected={selectedServiceIds.includes(detailService.id)}
          onToggle={() => toggleService(detailService.id)}
          onClose={() => setDetailService(null)}
        />
      )}

      <footer className="bg-brand-green-dark text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-8">
          <div>
            <p className="font-display text-2xl">Essence Spa</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-brand-text-light">Uñas, cejas y pestañas. Escríbenos y coordinamos tu cita.</p>
            <a href={WHATSAPP_URL} {...externalProps} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-cream px-5 text-sm font-semibold text-brand-text transition-colors hover:bg-white"><MessageCircle size={17} /> Escribir por WhatsApp</a>
          </div>
          <nav aria-label="Secciones" className="flex flex-col text-sm text-white/80">
            {navLinks.map((link) => <a key={link.href} href={link.href} className="flex min-h-10 items-center hover:text-white" {...(link.external ? externalProps : {})}>{link.label}</a>)}
          </nav>
          <nav aria-label="Redes sociales" className="flex flex-col text-sm text-white/80">
            <a href="https://www.instagram.com/essence.spa_pcl" {...externalProps} className="flex min-h-10 items-center gap-2 hover:text-white"><Instagram size={17} /> Instagram</a>
            <a href="https://www.facebook.com/profile.php?id=61583364283486" {...externalProps} className="flex min-h-10 items-center gap-2 hover:text-white"><Facebook size={17} /> Facebook</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
