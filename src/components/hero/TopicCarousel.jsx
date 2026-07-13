import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "../../lib/i18n";

// Carousel témat. Každé téma je samostatná celá kartička — při změně tématu
// jedna celá kartička přijede z jedné strany a druhá celá odjede na druhou.
// Každé téma přehraje svá dvě videa po sobě, pak se posune dál (ve smyčce).
// Přepínat lze i šipkami (na obrazovce + klávesnicí).
//
// variant="mockup" — menší verze do telefonu v hero sekci (desktop)
// variant="card"   — větší samostatná kartička (mobil)

const STYLES = {
  mockup: {
    pad: "px-4", // boční odsazení kartičky uvnitř posuvné vrstvy (okno je přes celou šířku)
    card: "rounded-2xl border border-white/15 bg-black/55 p-2.5 backdrop-blur-xl",
    media: "mb-2.5 rounded-xl",
    title: "text-base",
    subtitle: "mt-1 truncate text-xs",
    cta: "mt-3 px-3 py-2 text-xs",
    arrow: "h-7 w-7",
    arrowIcon: "h-4 w-4",
  },
  card: {
    pad: "",
    card: "glass glass-card rounded-[28px] border border-white/10 bg-black/20 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-4",
    media: "mb-3 rounded-2xl sm:mb-4",
    title: "text-base sm:text-lg",
    subtitle: "mt-0.5 truncate text-xs sm:mt-1 sm:text-sm",
    cta: "mt-3 px-4 py-2 text-xs sm:mt-4 sm:py-2.5 sm:text-sm",
    arrow: "h-9 w-9",
    arrowIcon: "h-5 w-5",
  },
};

function Overlays() {
  return (
    <>
      {/* Brand filtr (lehká oranžová) + jemný grain */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-orange-600/30 via-orange-500/10 to-amber-300/10 mix-blend-overlay" />
      <div className="video-grain pointer-events-none absolute inset-0" />
    </>
  );
}

function Texts({ s, topic, ctaLabel, active }) {
  const ctaClass = `flex w-full items-center justify-center rounded-full border border-white/15 bg-white/10 font-semibold text-white no-underline backdrop-blur-md transition-colors hover:border-white/25 hover:bg-white/15 ${s.cta}`;
  return (
    <div className="px-1">
      <p className={`font-semibold leading-tight text-white ${s.title}`}>{topic.title}</p>
      <p className={`text-neutral-400 ${s.subtitle}`}>{topic.subtitle}</p>
      {active ? (
        <Link to="/waitlist" className={ctaClass}>{ctaLabel}</Link>
      ) : (
        <span className={ctaClass}>{ctaLabel}</span>
      )}
    </div>
  );
}

// Odjíždějící (předchozí) celá kartička — jen poster, bez videa a interakcí.
function TopicCardStatic({ topic, s, ctaLabel }) {
  const media = topic.videos[0];
  return (
    <div className={`pointer-events-none ${s.card}`}>
      <div className={`relative aspect-video overflow-hidden bg-neutral-950 ${s.media}`}>
        <img src={`${media.src}.jpg`} alt="" className="h-full w-full object-cover" style={media.style} />
        <Overlays />
      </div>
      <Texts s={s} topic={topic} ctaLabel={ctaLabel} active={false} />
    </div>
  );
}

export default function TopicCarousel({ topics, variant = "card", onActiveChange }) {
  const { t } = useLang();
  const s = STYLES[variant];
  const [topicIndex, setTopicIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);
  const [prev, setPrev] = useState(null); // { index, dir } odjíždějící kartička
  const videoRef = useRef(null);

  const topic = topics[topicIndex];
  const media = topic.videos[videoIndex];
  const src = media.src;

  const change = useCallback(
    (dir) => {
      setPrev({ index: topicIndex, dir });
      setVideoIndex(0);
      setTopicIndex((topicIndex + dir + topics.length) % topics.length);
    },
    [topicIndex, topics.length],
  );

  const goNext = useCallback(() => change(1), [change]);
  const goPrev = useCallback(() => change(-1), [change]);

  // Autoplay fix: React vždy nenastaví `muted` jako property → nastavíme imperativně.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const played = v.play();
    if (played?.catch) played.catch(() => {});
  }, [src]);

  // Ovládání šipkami na klávesnici (jen desktop mockup, ať se nehandluje 2×).
  useEffect(() => {
    if (variant !== "mockup") return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, goNext, goPrev]);

  // Nahlásit aktivní téma nahoru (kvůli přejezdu mapy na jeho polohu).
  useEffect(() => {
    onActiveChange?.(topicIndex);
  }, [topicIndex, onActiveChange]);

  // Po dohrání videa: druhé video tématu, nebo přepni na další téma.
  function handleEnded() {
    if (videoIndex < topic.videos.length - 1) setVideoIndex(videoIndex + 1);
    else goNext();
  }

  const inClass = prev ? (prev.dir === 1 ? "topic-in-from-right" : "topic-in-from-left") : "";
  const outClass = prev ? (prev.dir === 1 ? "topic-out-to-left" : "topic-out-to-right") : "";

  return (
    <div className="relative w-full overflow-hidden">
      {/* Odjíždějící celá kartička */}
      {prev && (
        <div
          key={`out-${prev.index}`}
          className={`absolute inset-0 ${s.pad} ${outClass}`}
          onAnimationEnd={() => setPrev(null)}
        >
          <TopicCardStatic topic={topics[prev.index]} s={s} ctaLabel={t.topicCta} />
        </div>
      )}

      {/* Příjíždějící celá kartička s běžícím videem */}
      <div key={`in-${topicIndex}`} className={`${s.pad} ${inClass}`}>
        <div className={s.card}>
          <div className={`relative aspect-video overflow-hidden bg-neutral-950 ${s.media}`}>
            <video
              ref={videoRef}
              key={src}
              className="h-full w-full object-cover"
              style={media.style}
              src={`${src}.mp4`}
              poster={`${src}.jpg`}
              muted
              playsInline
              autoPlay
              preload="auto"
              onEnded={handleEnded}
              aria-label={topic.title}
            />
            <Overlays />

            {/* Šipky pro přepínání témat */}
            <button
              type="button"
              onClick={goPrev}
              aria-label="Předchozí téma"
              className={`absolute left-2 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/70 ${s.arrow}`}
            >
              <ChevronLeft className={s.arrowIcon} />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Další téma"
              className={`absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/70 ${s.arrow}`}
            >
              <ChevronRight className={s.arrowIcon} />
            </button>
          </div>
          <Texts s={s} topic={topic} ctaLabel={t.topicCta} active />
        </div>
      </div>
    </div>
  );
}
