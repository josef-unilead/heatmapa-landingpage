import { useRef, useEffect } from "react";
import { useLang } from "../lib/i18n";

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

export default function AboutMarquee() {
  const { t } = useLang();

  const words1 = [t.mq1, t.mq2, t.mq3, t.mq4, t.mq5];
  const words2 = [t.mq6, t.mq7, t.mq8, t.mq9, t.mq10];

  const separator = (
    <span className="mx-6 text-orange-400/30">·</span>
  );

  return (
    <section className="relative border-t border-white/5 py-20 overflow-hidden">
      {/* Top fade */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-neutral-950 to-transparent z-10" />
      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-neutral-950 to-transparent z-10" />

      {/* About text */}
      <div className="mx-auto max-w-2xl px-6 text-center mb-14">
        <h2 className="mb-3 text-xl font-light tracking-wide text-neutral-500 md:text-2xl">
          {t.aboutUsTitle1}{" "}
          <span className="font-medium bg-gradient-to-r from-orange-400/80 to-amber-400/80 bg-clip-text text-transparent">
            {t.aboutUsHighlight}
          </span>
        </h2>
        <p className="text-sm leading-relaxed text-neutral-600">
          {t.aboutUsText}
        </p>
      </div>

      {/* Marquee rows */}
      <div className="flex flex-col gap-4">
        <MarqueeRow duration={35}>
          <div className="flex items-center">
            {words1.map((word, i) => (
              <span key={i} className="flex items-center">
                <span className="text-2xl font-light tracking-wide text-neutral-700/50 md:text-3xl">
                  {word}
                </span>
                {separator}
              </span>
            ))}
          </div>
        </MarqueeRow>

        <MarqueeRow duration={40} reverse>
          <div className="flex items-center">
            {words2.map((word, i) => (
              <span key={i} className="flex items-center">
                <span className="text-2xl font-light tracking-wide text-neutral-700/50 md:text-3xl">
                  {word}
                </span>
                {separator}
              </span>
            ))}
          </div>
        </MarqueeRow>
      </div>
    </section>
  );
}
