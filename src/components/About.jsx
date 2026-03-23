import { MapPin, Flame, Map, Zap } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

const features = [
  {
    icon: MapPin,
    title: "Live Business Map",
    description:
      "Browse restaurants, shops, and more — all updated in real time on an interactive map.",
  },
  {
    icon: Flame,
    title: "Real-Time Events",
    description:
      "Concerts, pop-ups, markets — discover events the moment they appear nearby.",
  },
  {
    icon: Map,
    title: "Heat Zones",
    description:
      "See where the crowd is. Activity density visualized so you find the energy fast.",
  },
  {
    icon: Zap,
    title: "Instant Updates",
    description:
      "No refresh needed. The map evolves live as things open, start, and change.",
  },
];

export default function About() {
  return (
    <section id="about" className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-14 text-center">
          <Badge className="mb-4">About</Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Your city, alive on a map
          </h2>
          <p className="mx-auto max-w-lg text-neutral-400">
            Everything happening around you — hidden gems, buzzing events —
            all in one living, breathing map.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="group transition-colors hover:border-neutral-700"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Icon className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-white">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-400">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
