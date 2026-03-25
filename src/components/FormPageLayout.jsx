import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useLang } from "../lib/i18n";

export default function FormPageLayout({ children }) {
  const { t } = useLang();
  return (
    <div className="min-h-screen">
      <nav className="px-6 py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3 py-1.5 text-xs text-neutral-500 transition-all duration-500 ease-out hover:border-white/15 hover:text-neutral-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.back}
        </Link>
      </nav>
      {children}
    </div>
  );
}
