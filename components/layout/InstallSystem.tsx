"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, RefreshCw, Smartphone, X } from "lucide-react";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const INSTALLED_STORAGE_KEY = "essence-system-installed";

function isMobileDevice() {
  return MOBILE_USER_AGENT.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function readInstalledFlag() {
  try { return window.localStorage.getItem(INSTALLED_STORAGE_KEY) === "1"; } catch { return false; }
}

function saveInstalledFlag() {
  try { window.localStorage.setItem(INSTALLED_STORAGE_KEY, "1"); } catch { /* almacenamiento no disponible */ }
}

function clearInstalledFlag() {
  try { window.localStorage.removeItem(INSTALLED_STORAGE_KEY); } catch { /* almacenamiento no disponible */ }
}

export default function InstallSystem() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ready, setReady] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const versionRef = useRef(APP_VERSION);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
    let active = true;
    let finishTimer: number | undefined;

    const syncDisplay = () => {
      const standaloneNow = isStandalone();
      // En iPhone no existe getInstalledRelatedApps: al abrir la app instalada
      // guardamos la marca para no volver a pedir la instalación desde Safari.
      if (standaloneNow) saveInstalledFlag();
      setInstalled(standaloneNow || readInstalledFlag());
    };
    const finish = () => {
      if (!active) return;
      setReady(true);
      if (finishTimer !== undefined) {
        window.clearTimeout(finishTimer);
        finishTimer = undefined;
      }
    };

    syncDisplay();
    setMobile(isMobileDevice());
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    if (nav.getInstalledRelatedApps) {
      // Si la app ya está instalada, esperamos la detección antes de mostrar el aviso.
      finishTimer = window.setTimeout(finish, 800);
      try {
        void nav.getInstalledRelatedApps().then((apps) => {
          if (!active) return;
          if (apps.length > 0) { saveInstalledFlag(); setInstalled(true); }
          else if (!isStandalone()) { clearInstalledFlag(); setInstalled(false); }
        }).catch(() => {}).finally(finish);
      } catch {
        finish();
      }
    } else {
      finish();
    }

    const handlePrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const handleInstalled = () => { saveInstalledFlag(); setInstalled(true); setPrompt(null); setInstructions(false); };
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
      active = false;
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      standalone.removeEventListener("change", syncDisplay);
      manifest.remove(); icon.remove(); tags.forEach(tag => tag.remove());
    };
  }, []);

  const checkVersion = useCallback(async () => {
    try {
      const response = await fetch("/api/version", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { version?: unknown };
      const version = typeof data.version === "string" ? data.version : "";
      if (version && version !== versionRef.current) setUpdateAvailable(true);
    } catch {
      // Sin conexión: se vuelve a comprobar al regresar a la app.
    }
  }, []);

  useEffect(() => {
    if (!ready || !mobile || !installed) return;
    let cancelled = false;
    const check = () => { if (!cancelled) void checkVersion(); };
    check();
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const timer = window.setInterval(check, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(timer);
    };
  }, [checkVersion, installed, mobile, ready]);

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

  // Solo en teléfonos: nunca en escritorio.
  if (!ready || !mobile) return null;

  // Instalado y sin actualizaciones pendientes: no hay nada que avisar.
  if (installed && !updateAvailable) return null;

  if (installed) {
    return <section aria-label="Actualización del sistema" className="mb-7 rounded-2xl border border-stone-200 bg-white p-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEE9E0]"><RefreshCw size={20} strokeWidth={1.5} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Actualización disponible</p><p className="mt-1 text-xs leading-5 text-stone-600">Hay una versión nueva del panel. Actualiza para seguir usando Essence Gestión.</p></div><button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold hover:bg-stone-50"><RefreshCw size={16} /> Actualizar</button></div>
    </section>;
  }

  return <section aria-label="Instalación del sistema" className="mb-7 rounded-2xl border border-stone-200 bg-white p-4 sm:px-5">
    <div className="flex flex-wrap items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEE9E0]"><Smartphone size={20} strokeWidth={1.5} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Essence siempre a mano</p><p className="mt-1 text-xs leading-5 text-stone-600">Instala el panel en tu teléfono. El acceso requiere tu sesión.</p></div><button type="button" disabled={busy} onClick={() => void install()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold hover:bg-stone-50 disabled:opacity-50"><Download size={16} />{busy ? "Abriendo…" : "Instalar sistema"}</button></div>
    {instructions && <div id="system-install-help" className="mt-4 rounded-xl bg-[#F5F3EE] p-4"><div className="flex items-start justify-between gap-3"><h2 className="text-sm font-semibold">{ios ? "Instalar en iPhone o iPad" : "Añadir el sistema a tu dispositivo"}</h2><button type="button" aria-label="Cerrar instrucciones" onClick={() => setInstructions(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-stone-200"><X size={17} /></button></div><ol className="mt-2 list-decimal space-y-2 pl-5 text-xs leading-6 text-stone-600">{ios ? <><li>Abre este panel en Safari.</li><li>Toca Compartir y luego Añadir a pantalla de inicio.</li><li>Activa Abrir como app web si aparece y toca Añadir.</li></> : <><li>Abre este panel en Chrome o Edge.</li><li>En el menú del navegador, busca Instalar aplicación o Añadir a pantalla de inicio.</li><li>Confirma el nombre Essence Gestión y la instalación.</li></>}</ol><p className="mt-3 text-xs leading-5 text-stone-600">Si el navegador no ofrece la opción, abre el enlace en Chrome o Safari actualizado. El sistema necesita conexión a internet; al expirar tu sesión tendrás que iniciar sesión nuevamente.</p></div>}
  </section>;
}
