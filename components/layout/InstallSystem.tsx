"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallSystem() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const syncDisplay = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    syncDisplay();
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const handlePrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const handleInstalled = () => { setInstalled(true); setPrompt(null); setInstructions(false); };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    standalone.addEventListener("change", syncDisplay);

    // Advertise installation only while the authenticated dashboard is mounted.
    const manifest = document.createElement("link");
    manifest.rel = "manifest"; manifest.href = "/dashboard/manifest.webmanifest";
    const icon = document.createElement("link");
    icon.rel = "apple-touch-icon"; icon.href = "/system-icons/apple-touch-icon.png";
    const tags = [
      ["apple-mobile-web-app-capable", "yes"],
      ["apple-mobile-web-app-title", "Essence Gestión"],
      ["apple-mobile-web-app-status-bar-style", "default"],
      ["theme-color", "#1A1A1A"],
    ].map(([name, content]) => { const meta = document.createElement("meta"); meta.name = name; meta.content = content; return meta; });
    document.head.append(manifest, icon, ...tags);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      standalone.removeEventListener("change", syncDisplay);
      manifest.remove(); icon.remove(); tags.forEach(tag => tag.remove());
    };
  }, []);

  async function install() {
    if (!prompt) { setInstructions(true); return; }
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch { setInstructions(true); }
    finally { setPrompt(null); setBusy(false); }
  }

  if (installed) return null;
  return <section aria-label="Instalación del sistema" className="mb-7 rounded-2xl border border-stone-200 bg-white p-4 sm:px-5">
    <div className="flex flex-wrap items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEE9E0]"><Smartphone size={20} strokeWidth={1.5} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Essence siempre a mano</p><p className="mt-1 text-xs leading-5 text-stone-600">Instala el panel en tu teléfono. El acceso requiere tu sesión.</p></div><button type="button" disabled={busy} onClick={() => void install()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold hover:bg-stone-50 disabled:opacity-50"><Download size={16} />{busy ? "Abriendo…" : "Instalar sistema"}</button></div>
    {instructions && <div id="system-install-help" className="mt-4 rounded-xl bg-[#F5F3EE] p-4"><div className="flex items-start justify-between gap-3"><h2 className="text-sm font-semibold">{ios ? "Instalar en iPhone o iPad" : "Añadir el sistema a tu dispositivo"}</h2><button type="button" aria-label="Cerrar instrucciones" onClick={() => setInstructions(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-stone-200"><X size={17} /></button></div><ol className="mt-2 list-decimal space-y-2 pl-5 text-xs leading-6 text-stone-600">{ios ? <><li>Abre este panel en Safari.</li><li>Toca Compartir y luego Añadir a pantalla de inicio.</li><li>Activa Abrir como app web si aparece y toca Añadir.</li></> : <><li>Abre este panel en Chrome o Edge.</li><li>En el menú del navegador, busca Instalar aplicación o Añadir a pantalla de inicio.</li><li>Confirma el nombre Essence Gestión y la instalación.</li></>}</ol><p className="mt-3 text-xs leading-5 text-stone-600">Si el navegador no ofrece la opción, abre el enlace en Chrome o Safari actualizado. El sistema necesita conexión a internet; al expirar tu sesión tendrás que iniciar sesión nuevamente.</p></div>}
  </section>;
}
