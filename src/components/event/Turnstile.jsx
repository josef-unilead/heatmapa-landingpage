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
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

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
export default function Turnstile({ onToken, onExpire, resetKey }) {
  const holder = useRef(null);
  const widgetId = useRef(null);
  // Callbacky se drží v ref, aby jejich změna mezi rendery widget nerušila
  // a nevytvářela ho znovu. Zapisuje se do něj v efektu, ne během vykreslení.
  const handlers = useRef({ onToken, onExpire });

  useEffect(() => {
    handlers.current = { onToken, onExpire };
  }, [onToken, onExpire]);

  useEffect(() => {
    if (!SITE_KEY) {
      console.warn("Chybí VITE_TURNSTILE_SITE_KEY, ověření se nevykreslí.");
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
          "error-callback": () => handlers.current.onExpire?.(),
        });
      })
      .catch((err) => console.error(err));

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
