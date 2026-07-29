import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "../lib/i18n";

export default function FormPageLayout({ children }) {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-black">
      <div className="fixed left-4 top-4 z-50">
        <Link
          to="/"
          className="glass floating-glass inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3.5 py-2 text-xs text-neutral-400 transition-colors duration-500 ease-out hover:border-white/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.back}
        </Link>
      </div>
      <div className="pt-24">{children}</div>
    </div>
  );
}
