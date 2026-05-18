import { FlickeringGrid } from "./ui/flickering-grid";

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
  return (
    <section className="relative flex min-h-[33vh] w-full items-center justify-center bg-black px-4 py-8">
      <div className="absolute inset-0 z-10 flex items-center justify-center opacity-90">
        <div
          className="h-32 w-32 -translate-y-10 md:h-48 md:w-48 md:-translate-y-16 lg:h-56 lg:w-56"
          style={maskStyle}
        >
          <FlickeringGrid {...GRID_CONFIG.logo} />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-6 z-20 text-center text-xs tracking-wide text-neutral-500 md:bottom-8 md:text-sm">
        <p className="mb-2">
          © 2026 heatmapa s.r.o. Všechna práva vyhrazena.
        </p>
        <p>IČO: 244 19 010</p>
      </div>
    </section>
  );
}
