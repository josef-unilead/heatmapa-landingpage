import { Megaphone, Share2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const positions = [
  {
    icon: Megaphone,
    title: "Ambassador",
    type: "Part-time · Remote",
    description:
      "Represent Heatmapa in your city. Connect with local businesses, spread the word at events, and help us grow community by community.",
    perks: ["Flexible schedule", "Early access", "Commission-based"],
  },
  {
    icon: Share2,
    title: "Social Media Manager",
    type: "Part-time · Remote",
    description:
      "Own our social presence. Create engaging content, build our audience, and tell the Heatmapa story across Instagram, TikTok, and X.",
    perks: ["Creative freedom", "Equity options", "Growth role"],
  },
];

export default function JoinTeam() {
  return (
    <section id="careers" className="border-t border-neutral-800/60 px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-14 text-center">
          <Badge className="mb-4">We're Hiring</Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Join our team
          </h2>
          <p className="mx-auto max-w-lg text-neutral-400">
            We're a small startup with big ambitions. Join early and help shape
            how people discover their city.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {positions.map(({ icon: Icon, title, type, description, perks }) => (
            <Card
              key={title}
              className="flex flex-col transition-colors hover:border-neutral-700"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Icon className="h-5 w-5 text-orange-400" />
                </div>
                <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-400">
                  {type}
                </span>
              </div>

              <h3 className="mb-1.5 text-lg font-semibold text-white">{title}</h3>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-400">
                {description}
              </p>

              <div className="mb-5 flex flex-wrap gap-2">
                {perks.map((perk) => (
                  <span
                    key={perk}
                    className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
                  >
                    {perk}
                  </span>
                ))}
              </div>

              <Button variant="outline" asChild>
                <Link to="/jobform">
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
