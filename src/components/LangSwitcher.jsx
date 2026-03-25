import { useLang } from "../lib/i18n";

export default function LangSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === "cs" ? "en" : "cs")}
      className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3.5 py-2 text-xs text-neutral-400 transition-all duration-500 ease-out hover:border-white/15 hover:text-neutral-300 cursor-pointer md:right-5 md:top-5 md:px-3 md:py-1.5"
    >
      <span className="uppercase tracking-wider">{lang === "cs" ? "CZ" : "EN"}</span>
    </button>
  );
}
