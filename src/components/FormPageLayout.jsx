import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function FormPageLayout({ children }) {
  return (
    <div className="min-h-screen">
      <nav className="px-6 py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-orange-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Zpět na hlavní stránku
        </Link>
      </nav>
      {children}
    </div>
  );
}
