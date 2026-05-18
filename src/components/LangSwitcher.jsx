import { useEffect, useRef } from "react";
import { useLang } from "../lib/i18n";

export default function LangSwitcher() {
  const { lang, setLang } = useLang();
  const ref = useRef(null);

  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      if (window.scrollY > 6) el.classList.add('scrolled'); else el.classList.remove('scrolled');
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      ref={ref}
      onClick={() => setLang(lang === "cs" ? "en" : "cs")}
      className="fixed right-4 top-4 z-50 flex items-center gap-2 glass floating-glass rounded-full px-3.5 py-2 text-xs text-neutral-400 transition-all duration-500 ease-out hover:scale-105 cursor-pointer md:right-5 md:top-5 md:px-3 md:py-1.5"
    >
      <span className="uppercase tracking-wider">{lang === "cs" ? "CZ" : "EN"}</span>
    </button>
  );
}
