import { Zap, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-orange-500/8 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl">
        <Badge className="mb-8">
          <Zap className="h-3 w-3" />
          Coming Soon
        </Badge>

        <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl">
          Discover what's{" "}
          <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            happening
          </span>{" "}
          around you
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-neutral-400">
          Find local businesses and real-time events on a live map.
          Always know where the action is.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="primary" size="lg" asChild>
            <Link to="/waitlist">Join the Waitlist</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="#about">Learn More</a>
          </Button>
        </div>
      </div>

      <a
        href="#about"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-neutral-600 transition-colors hover:text-neutral-400"
      >
        <ArrowDown className="h-5 w-5 animate-bounce" />
      </a>
    </section>
  );
}
