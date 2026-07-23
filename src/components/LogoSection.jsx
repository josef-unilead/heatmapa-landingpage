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
          <a href="mailto:info@heatmapa.cz" className="transition-colors hover:text-orange-400">
            {t.footerEmail}
          </a>
        </p>
        <p className="mb-2">{t.footerCompanyId}: 244 19 010</p>
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a
            href={t.footerTermsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-orange-400"
          >
            {t.footerTerms}
          </a>
          <span aria-hidden="true" className="text-neutral-700">|</span>
          <a
            href={t.footerPrivacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-orange-400"
          >
            {t.footerPrivacy}
          </a>
        </p>
      </div>
    </section>
  );
}
