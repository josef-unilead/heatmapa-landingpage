// Service worker jen pro stránku vstupenky.
//
// Proč vůbec: v klubu často nechytá signál a člověk potřebuje ukázat QR.
// Bez service workeru skončí otevření adresy bez sítě chybovou stránkou
// prohlížeče, ať je v cache cokoli. Tohle je jediný způsob, jak stránku
// zobrazit i offline.
//
// Registruje se se scope /t/, takže na zbytek webu nesahá a nemůže se stát,
// že by lidem zůstala viset stará verze homepage.
//
// Nic se nepředcachovává dopředu. Při první návštěvě online se uloží skořápka
// aplikace a její soubory, od té chvíle vstupenka funguje bez sítě. Proto je
// v e-mailu věta, ať si ji člověk otevře hned, ne až u vchodu.

const CACHE = "heatmapa-ticket-v1";
const SHELL_KEY = "/t/__shell__";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Úklid po starších verzích, ať se cache nekupí.
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith("heatmapa-ticket-") && name !== CACHE)
             .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

async function networkFirstShell(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    // Skořápka je pro všechny vstupenky stejná, ukládá se pod jedním klíčem.
    // Kdyby se ukládala podle adresy, fungovala by offline jen ta vstupenka,
    // kterou si člověk předtím otevřel.
    if (response.ok) cache.put(SHELL_KEY, response.clone());
    return response;
  } catch {
    const cached = await cache.match(SHELL_KEY);
    if (cached) return cached;
    return new Response(
      "<!doctype html><meta charset=utf-8><body style=\"background:#000;color:#fff;font-family:sans-serif;padding:2rem\">" +
      "<p>Vstupenka není uložená pro offline. Připoj se k internetu a otevři ji znovu.</p>",
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 },
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) {
    // Na pozadí se zkusí novější verze, ale na odpověď se nečeká.
    fetch(request).then((response) => {
      if (response.ok) cache.put(request, response.clone());
    }).catch(() => {});
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate" && url.pathname.startsWith("/t/")) {
    event.respondWith(networkFirstShell(event.request));
    return;
  }

  // Soubory aplikace mají v názvu otisk obsahu, takže se nikdy nemění pod
  // rukama a dají se držet v cache natrvalo.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(event.request));
  }
});
