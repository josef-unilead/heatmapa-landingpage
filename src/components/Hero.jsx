import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Globe } from "./ui/cobe-globe";
import { useLang } from "../lib/i18n";

const markers = [
  // People (10)
  { id: "p1", location: [37.7595, -122.4367], label: "Anna", type: "person", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face" },
  { id: "p2", location: [51.5074, -0.1278], label: "James", type: "person", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face" },
  { id: "p3", location: [35.6762, 139.6503], label: "Yuki", type: "person", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face" },
  { id: "p4", location: [-33.8688, 151.2093], label: "Mia", type: "person", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face" },
  { id: "p5", location: [4.711, -74.0721], label: "Carlos", type: "person", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face" },
  { id: "p6", location: [55.7558, 37.6173], label: "Olga", type: "person", image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face" },
  { id: "p7", location: [1.3521, 103.8198], label: "Wei", type: "person", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face" },
  { id: "p8", location: [-1.2921, 36.8219], label: "Amara", type: "person", image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop&crop=face" },
  { id: "p9", location: [52.52, 13.405], label: "Lena", type: "person", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face" },
  { id: "p10", location: [19.4326, -99.1332], label: "Diego", type: "person", image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&h=80&fit=crop&crop=face" },
  // Events (8)
  { id: "e1", location: [40.7128, -74.006], label: "Concert", type: "event", image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=80&h=80&fit=crop" },
  { id: "e2", location: [48.8566, 2.3522], label: "Art Expo", type: "event", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=80&h=80&fit=crop" },
  { id: "e3", location: [25.2048, 55.2708], label: "Festival", type: "event", image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=80&h=80&fit=crop" },
  { id: "e4", location: [41.3874, 2.1686], label: "DJ Set", type: "event", image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=80&h=80&fit=crop" },
  { id: "e5", location: [-34.6037, -58.3816], label: "Tango Night", type: "event", image: "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=80&h=80&fit=crop" },
  { id: "e6", location: [13.7563, 100.5018], label: "Night Market", type: "event", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=80&h=80&fit=crop" },
  { id: "e7", location: [59.3293, 18.0686], label: "Open Mic", type: "event", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=80&h=80&fit=crop" },
  { id: "e8", location: [34.0522, -118.2437], label: "Pop-Up", type: "event", image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=80&h=80&fit=crop" },
  // Businesses (4)
  { id: "b1", location: [50.0755, 14.4378], label: "Café Noir", type: "business", icon: "coffee", color: "#a16207" },
  { id: "b2", location: [37.9838, 23.7275], label: "Taverna", type: "business", icon: "restaurant", color: "#dc2626" },
  { id: "b3", location: [22.3193, 114.1694], label: "Club Neon", type: "business", icon: "club", color: "#9333ea" },
  { id: "b4", location: [28.6139, 77.209], label: "Spice Kitchen", type: "business", icon: "restaurant", color: "#dc2626" },
];

export default function Hero() {
  const { t } = useLang();
  return (
    <section className="relative flex h-screen w-full snap-start snap-always flex-col items-center justify-between overflow-hidden px-4 py-6 text-center md:px-6 md:py-8">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-150 w-full -translate-x-1/2 -translate-y-1/3 rounded-full bg-orange-500/8 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-1 w-full flex-col items-center justify-center gap-2">
        <div className="relative w-full max-w-[24rem] md:max-w-lg lg:max-w-xl">
          {/* Logo behind the globe */}
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-20">
            <img src="/logo.svg" alt="" className="h-48 w-auto md:h-72" />
          </div>
          <Globe
            markers={markers}
            markerColor={[1, 0.5, 0.2]}
            baseColor={[0.2, 0.2, 0.2]}
            glowColor={[0.15, 0.15, 0.15]}
            dark={1}
            mapBrightness={6}
            markerSize={0}
            markerElevation={0.01}
          />
        </div>

        <div className="text-center">
          <h1 className="mb-3 text-lg font-light leading-[1.2] tracking-wide text-neutral-500 md:text-3xl">
            {t.heroTitle1}{" "}
            <span className="font-medium bg-linear-to-r from-orange-400/80 to-amber-400/80 bg-clip-text text-transparent">
              {t.heroHighlight}
            </span>{" "}
            {t.heroTitle2}
          </h1>

          <p className="mx-auto mb-6 max-w-sm text-xs leading-relaxed tracking-wide text-neutral-600">
            {t.heroSub}
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="primary" size="lg" asChild>
              <Link to="/waitlist">{t.heroWaitlist}</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#about">{t.heroLearn}</a>
            </Button>
          </div>
        </div>
      </div>

    </section>
  );
}
