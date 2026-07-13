import { Layers, Zap, MonitorSmartphone } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

const pillarIcons = [Layers, Zap, MonitorSmartphone];
const pillars = [
  {
    title: "Moderní 3D mapa",
    desc: "Ulička tvého města přesně tak, jak ji znáš, s plynulým přiblížením a elegantním nočním zobrazením.",
  },
  {
    title: "Drží krok s tebou",
    desc: "Mapa reaguje okamžitě ať jsi kdekoliv. Plynulé načtení a rychlé aktualizace obsahu.",
  },
  {
    title: "Perfektně optimalizovaná",
    desc: "Běží plynule na všech platformách i starších zařízeních.",
  },
];

export default function MapboxSection() {
  return (
    <section id="mapbox" className="flex min-h-[88svh] items-center overflow-hidden px-4 py-16 md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 text-center md:mb-12">
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {"Postaveno na "}
            <span className="text-orange-400">Mapbox</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-7 text-neutral-400 md:text-lg">
            Rychlá a moderní mapová technologie využívaná společnostmi BMW, Snapchat nebo Airbnb.
          </p>
        </div>

        {/* Video v iPad mockupu (stejný styl jako telefon v hero) */}
        <div className="relative mx-auto w-full max-w-3xl">
          <div className="absolute -inset-8 -z-10 rounded-full bg-orange-400/[0.16] blur-3xl" />
          {/* Tlačítka dle iPad Pro M5 (landscape): power na horní hraně vpravo, hlasitost na pravé hraně u horního rohu */}
          <div className="absolute -top-[2px] right-[9%] z-0 h-[2.5px] w-10 rounded-t-md bg-gradient-to-b from-neutral-700 to-neutral-900" />
          <div className="absolute -right-[2px] top-[13%] z-0 h-9 w-[2.5px] rounded-r-md bg-gradient-to-l from-neutral-700 to-neutral-900" />
          <div className="absolute -right-[2px] top-[24%] z-0 h-9 w-[2.5px] rounded-r-md bg-gradient-to-l from-neutral-700 to-neutral-900" />
          <div className="relative rounded-[40px] border border-white/8 bg-gradient-to-b from-neutral-950 to-black p-[10px] shadow-[0_30px_100px_rgba(0,0,0,0.75),0_0_60px_rgba(255,200,140,0.06),0_0_130px_rgba(255,180,100,0.03)] md:rounded-[48px] md:p-3">

            <div className="relative overflow-hidden rounded-[30px] bg-neutral-950 md:rounded-[38px]">
              <video
                className="block w-full object-cover"
                src="/mapboxvideo2.mp4"
                autoPlay
                muted
                loop
                playsInline
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
          </div>
        </div>

        {/* Pillars */}
        <div className="mt-6 grid grid-cols-1 gap-3 md:mt-8 md:grid-cols-3 md:gap-4">
          {pillars.map(({ title, desc }, i) => {
            const Icon = pillarIcons[i];
            return (
              <Card
                key={title}
                className="no-hover-card flex flex-col items-start gap-4 rounded-[32px] border border-white/10 bg-black/20 p-6 text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/15 bg-orange-500/5 shadow-[0_0_16px_rgba(249,115,22,0.18)]">
                  <Icon className="h-6 w-6 text-orange-400/90" />
                </div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-400">{desc}</p>
              </Card>
            );
          })}
        </div>

        {/* Link */}
        <div className="mt-8 text-center md:mt-10">
          <Button variant="outline" size="md" asChild>
            <a href="https://www.mapbox.com/" target="_blank" rel="noopener noreferrer">
              Více o Mapbox
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
