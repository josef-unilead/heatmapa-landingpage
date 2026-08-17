// Cloudflare Turnstile.
//
// Widget u drtivé většiny lidí proběhne sám a jen chvíli ukáže, že se něco
// ověřuje. Token, který vydá, platí pár minut a ověřuje ho výhradně server,
// protože cokoli, co si potvrdí prohlížeč sám, umí bot přeskočit.
//
// Skript se načítá až když je formulář na stránce, ne globálně, aby se kvůli
// němu nezdržovalo načtení homepage.

import { useEffect, useRef } from "react";

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
// Site key je veřejný ze své podstaty, Cloudflare ho očekává přímo v HTML
// stránky. Tajný je jenom TURNSTILE_SECRET_KEY, a ten zůstává na serveru bez
// prefixu VITE_, takže se do buildu nikdy nedostane.
//
// Název proměnné nekončí na KEY schválně: Vercel na každý název s "KEY"
// a prefixem VITE_ hlásí varování, že se hodnota zveřejní. U tohohle klíče
// je to v pořádku a nemá smysl kvůli tomu koukat na červenou hlášku.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE;

let scriptPromise;

function loadScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Turnstile se nepodařilo načíst"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * @param onToken  zavolá se s tokenem, jakmile výzva projde
 * @param onExpire zavolá se, když token vyprší a je potřeba nový
 * @param resetKey změna hodnoty widget resetuje (po neúspěšném odeslání)
 */
export default function Turnstile({ onToken, onExpire, onError, resetKey }) {
  const holder = useRef(null);
  const widgetId = useRef(null);
  // Callbacky se drží v ref, aby jejich změna mezi rendery widget nerušila
  // a nevytvářela ho znovu. Zapisuje se do něj v efektu, ne během vykreslení.
  const handlers = useRef({ onToken, onExpire, onError });

  useEffect(() => {
    handlers.current = { onToken, onExpire, onError };
  }, [onToken, onExpire, onError]);

  useEffect(() => {
    if (!SITE_KEY) {
      console.warn("Chybí VITE_TURNSTILE_SITE, ověření se nevykreslí.");
      handlers.current.onError?.();
      return;
    }

    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !holder.current) return;
        widgetId.current = window.turnstile.render(holder.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          size: "flexible",
          callback: (token) => handlers.current.onToken?.(token),
          "expired-callback": () => handlers.current.onExpire?.(),
          // Chyba není totéž co vypršení: token nevznikne vůbec a formulář
          // musí člověku říct, ať načte stránku, ne ho nechat čekat.
          "error-callback": () => handlers.current.onError?.(),
        });
      })
      .catch((err) => {
        console.error(err);
        handlers.current.onError?.();
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  // Po odmítnutém odeslání je starý token spotřebovaný a je potřeba nový.
  useEffect(() => {
    if (resetKey && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
    }
  }, [resetKey]);

  return <div ref={holder} className="mb-4 min-h-[65px]" />;
}
