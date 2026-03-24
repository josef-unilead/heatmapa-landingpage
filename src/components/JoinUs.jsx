import { Store, CalendarDays, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const roles = [
  {
    icon: Store,
    title: "Business Owner",
    description:
      "Get discovered by people actively looking for places nearby — right now.",
  },
  {
    icon: CalendarDays,
    title: "Event Organizer",
    description:
      "Reach locals when it matters most — as your event is happening.",
  },
  {
    icon: Compass,
    title: "Explorer",
    description:
      "Find the best spots and events without endless social media scrolling.",
  },
];

export default function JoinUs() {
  return (
    <section id="join" className="border-t border-neutral-800/60 px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-14 text-center">
          <Badge className="mb-4">For Everyone</Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Who is Heatmapa for?
          </h2>
          <p className="mx-auto max-w-lg text-neutral-400">
            Whether you run a business, host events, or love exploring —
            Heatmapa was built for you.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {roles.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="flex flex-col transition-colors hover:border-neutral-700"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Icon className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="mb-1.5 text-base font-semibold text-white">
                {title}
              </h3>
              <p className="mb-5 flex-1 text-sm leading-relaxed text-neutral-400">
                {description}
              </p>
              <Button variant="ghost" asChild>
                <Link to="/waitlist">Get Early Access</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
