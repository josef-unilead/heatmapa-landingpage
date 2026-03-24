import { useLang } from "../lib/i18n";

export default function LangSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === "cs" ? "en" : "cs")}
      className="fixed right-5 top-5 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3 py-1.5 text-xs text-neutral-400 transition-all hover:border-white/20 hover:text-neutral-300 cursor-pointer"
    >
      <span className="uppercase tracking-wider">{lang === "cs" ? "CZ" : "EN"}</span>
    </button>
  );
}
