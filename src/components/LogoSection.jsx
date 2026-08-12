import { Link } from "react-router-dom";
import { FlickeringGrid } from "./ui/flickering-grid";
import { useLang } from "../lib/i18n";

const maskStyle = {
  WebkitMaskImage: `url('/logo.svg')`,
  WebkitMaskSize: "contain",
  WebkitMaskPosition: "center",
  WebkitMaskRepeat: "no-repeat",
  maskImage: `url('/logo.svg')`,
  maskSize: "contain",
  maskPosition: "center",
  maskRepeat: "no-repeat",
};

const GRID_CONFIG = {
  logo: {
    color: "#FF7A18",
    maxOpacity: 0.6,
    flickerChance: 0.18,
    squareSize: 2,
    gridGap: 4,
  },
};

export default function LogoSection() {
  const { t } = useLang();
  return (
    <section className="relative flex min-h-[33svh] w-full flex-col items-center justify-center gap-6 bg-black px-4 pt-6 pb-6 md:gap-8 md:px-6 md:pt-8">
      <div
        className="h-28 w-28 opacity-90 md:h-40 md:w-40 lg:h-48 lg:w-48"
        style={maskStyle}
      >
        <FlickeringGrid {...GRID_CONFIG.logo} />
      </div>

      <div className="text-center text-xs tracking-wide text-neutral-500 md:text-sm">
        <p className="mb-2">
          © {t.footerYear} heatmapa s.r.o. {t.footerCopyright}
        </p>
        <p className="mb-2">
          <a href="mailto:info@heatmapa.com" className="transition-colors hover:text-orange-400">
            {t.footerEmail}
          </a>
        </p>
        <p className="mb-2">{t.footerCompanyId}: 244 19 010</p>
        <p className="mb-2">
          <Link to="/termsofuse" className="transition-colors hover:text-orange-400">
            {t.footerTerms}
          </Link>
        </p>
        <p className="mb-2">
          <Link to="/privacypolicy" className="transition-colors hover:text-orange-400">
            {t.footerPrivacy}
          </Link>
        </p>
        <p>
          <Link to="/support" className="transition-colors hover:text-orange-400">
            {t.footerSupport}
          </Link>
        </p>
      </div>
    </section>
  );
}
