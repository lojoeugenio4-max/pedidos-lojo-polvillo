"use client";

import { useEffect } from "react";

const VERSION_KEY = "lojo-app-version";
const RELOAD_KEY = "lojo-version-reload";

async function removeStaleWorkersAndCaches() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }
}

export default function AppVersionGuard() {
  useEffect(() => {
    let cancelled = false;

    async function checkVersion() {
      try {
        const response = await fetch(`/api/version?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!response.ok || cancelled) return;

        const data = (await response.json()) as { version?: string };
        const currentVersion = data.version;

        if (!currentVersion || currentVersion === "development") return;

        const savedVersion = localStorage.getItem(VERSION_KEY);

        if (!savedVersion) {
          localStorage.setItem(VERSION_KEY, currentVersion);
          return;
        }

        if (savedVersion === currentVersion) {
          sessionStorage.removeItem(RELOAD_KEY);
          return;
        }

        // Guardamos la versión antes de recargar para impedir un bucle infinito.
        localStorage.setItem(VERSION_KEY, currentVersion);

        if (sessionStorage.getItem(RELOAD_KEY) === currentVersion) return;
        sessionStorage.setItem(RELOAD_KEY, currentVersion);

        await removeStaleWorkersAndCaches();

        const url = new URL(window.location.href);
        url.searchParams.set("app_version", currentVersion.slice(0, 12));
        window.location.replace(url.toString());
      } catch (error) {
        // La comprobación nunca debe bloquear el uso de la aplicación.
        console.warn("No se pudo comprobar la versión de la aplicación", error);
      }
    }

    void checkVersion();

    const onVisible = () => {
      if (document.visibilityState === "visible") void checkVersion();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
