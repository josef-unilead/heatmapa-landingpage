import { useRef, useEffect } from "react";
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
  background: {
    color: "#F97316",
    maxOpacity: 0.08,
    flickerChance: 0.08,
    squareSize: 4,
    gridGap: 4,
  },
  logo: {
    color: "#FB923C",
    maxOpacity: 0.5,
    flickerChance: 0.12,
    squareSize: 2,
    gridGap: 4,
  },
};

function MarqueeRow({ children, reverse = false, duration = 30 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const keyframes = [
      { transform: reverse ? "translateX(-50%)" : "translateX(0%)" },
      { transform: reverse ? "translateX(0%)" : "translateX(-50%)" },
    ];
    const anim = el.animate(keyframes, {
      duration: duration * 1000,
      iterations: Infinity,
      easing: "linear",
    });
    return () => anim.cancel();
  }, [reverse, duration]);

  return (
    <div className="overflow-hidden">
      <div ref={ref} className="flex w-max whitespace-nowrap">
        {children}
        {children}
      </div>
    </div>
  );
}

export default function LogoSection() {
  const { t } = useLang();

  const words1 = [t.mq1, t.mq2, t.mq3, t.mq4, t.mq5];
  const words2 = [t.mq6, t.mq7, t.mq8, t.mq9, t.mq10];

  const separator = <span className="mx-3 text-orange-500/20 font-mono md:mx-5">//</span>;

  return (
    <section className="relative flex h-screen w-full snap-start snap-always flex-col items-center justify-center overflow-hidden">
      {/* Flickering background grid */}
      <FlickeringGrid
        className="absolute inset-0 z-0 blur-[3px] mask-[linear-gradient(to_bottom,transparent,white_40%)]"
        {...GRID_CONFIG.background}
      />

      {/* Logo mask with flickering fill */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div
          className="h-40 w-40 -translate-y-10 md:h-64 md:w-64 md:-translate-y-16 lg:h-96 lg:w-96"
          style={maskStyle}
        >
          <FlickeringGrid {...GRID_CONFIG.logo} />
        </div>
      </div>

      {/* Marquee overlay */}
      <div className="relative z-20 flex w-full flex-col gap-5">
        <MarqueeRow duration={30}>
          <div className="flex items-center">
            {words1.map((word, i) => (
              <span key={i} className="flex items-center">
                <span className="text-base font-mono font-light uppercase tracking-[0.15em] text-white/[0.07] md:text-xl lg:text-2xl">
                  {word}
                </span>
                {separator}
              </span>
            ))}
          </div>
        </MarqueeRow>

        <MarqueeRow duration={25} reverse>
          <div className="flex items-center">
            {words2.map((word, i) => (
              <span key={i} className="flex items-center">
                <span className="text-base font-mono font-light uppercase tracking-[0.15em] text-white/[0.07] md:text-xl lg:text-2xl">
                  {word}
                </span>
                {separator}
              </span>
            ))}
          </div>
        </MarqueeRow>

        <MarqueeRow duration={35}>
          <div className="flex items-center">
            {words1.slice().reverse().map((word, i) => (
              <span key={i} className="flex items-center">
                <span className="text-sm font-mono font-light uppercase tracking-[0.2em] text-orange-400/[0.04] md:text-lg lg:text-xl">
                  {word}
                </span>
                {separator}
              </span>
            ))}
          </div>
        </MarqueeRow>
      </div>

      {/* Footer content */}
      <div className="absolute bottom-8 z-20 flex flex-col items-center gap-3 md:bottom-12 md:gap-4">
        <img
          src="/heatmapa-wordmark.svg"
          alt="heatmapa"
          className="h-6 opacity-30 md:h-8"
        />
        <p className="text-xs tracking-wide text-neutral-600 md:text-sm">
          &copy; {new Date().getFullYear()} {t.footer}
        </p>
        <p className="text-xs tracking-wide text-neutral-700 md:text-sm">
          IČO: 244 19 010
        </p>
      </div>

    </section>
  );
}
