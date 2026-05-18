import { useParams, Link } from "react-router-dom";
import { MapPin, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { useLang } from "../lib/i18n";

const events = {
  cs: {
    e1: {
      title: "heatmapa RELEASE POP-UP",
      image: "/release-popup.jpg",
      date: "22. května 2026",
      time: "13:00 – 22:00 · DJ set od 18:00",
      location: "Muchova 11",
      address: "Praha 6",
      details:
        "Srdečně vás zveme na oficiální release aplikace heatmapa.\nBrány otevíráme ve 13:00 a po celé odpoledne na vás čeká neomezené pivo zdarma, hudba a vintage popup od prodejců Luca$$o a Josef_9, kteří své oblečení budou prodávat přímo na místě. V 18:00 přijde oficiální oznámení od nás a po něm přebere pódium kombinace vybraných DJs (pojedeme do 22:00). Registrovaní v aplikaci získají 5% slevu na veškeré oblečení. Přijďte s námi nastartovat revoluci v sociálních sítích.\n\nStavte se na chvíli a pojďte zjistit o čem projekt heatmapa je.\n\nMíra a Pepa.",
    },
  },
  en: {
    e1: {
      title: "heatmapa RELEASE POP-UP",
      image: "/release-popup.jpg",
      date: "May 22, 2026",
      time: "1:00 PM – 10:00 PM · DJ set from 6:00 PM",
      location: "Muchova 11",
      address: "Prague 6",
      details:
        "You're cordially invited to the official release of the heatmapa app.\nDoors open at 1 PM and the afternoon brings unlimited free beer, music and a vintage pop-up from sellers Luca$$o and Josef_9, who'll be selling their clothing on-site. At 6 PM we'll make our official announcement, followed by a curated DJ lineup taking over the stage (we're running until 10 PM). Guests registered in the app get 5% off all clothing. Come kick off a social media revolution with us.\n\nDrop by for a while and find out what the heatmapa project is all about.\n\nMíra and Pepa.",
    },
  },
};

function InfoRow({ Icon, label, primary, secondary }) {
  return (
    <div className="flex gap-4">
      <Icon className="h-6 w-6 shrink-0 text-orange-400" />
      <div className="text-left">
        <p className="text-sm font-bold text-neutral-300">{label}</p>
        <p className="text-base font-medium text-white">{primary}</p>
        <p className="text-sm text-neutral-400">{secondary}</p>
      </div>
    </div>
  );
}

function NotFound({ lang }) {
  return (
    <div className="min-h-screen bg-black px-4 py-16 md:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-semibold text-white">
          {lang === "cs" ? "Událost nenalezena" : "Event not found"}
        </h1>
        <Button variant="primary" size="lg" asChild className="mt-6">
          <Link to="/">
            {lang === "cs" ? "Zpět na úvodní stránku" : "Back to homepage"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const { lang } = useLang();
  const event = (events[lang] || events.cs)[id];

  if (!event) return <NotFound lang={lang} />;

  return (
    <div className="relative min-h-screen bg-black px-4 py-8 backdrop-blur-sm md:px-6 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden lg:rounded-4xl lg:border lg:border-white/10 lg:bg-black/20 lg:shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:backdrop-blur-xl">
          <div className="lg:px-6 lg:pt-6">
            <img
              src={event.image}
              alt={event.title}
              className="h-80 w-full object-cover sm:h-96 lg:rounded-3xl"
            />
          </div>

          <div className="px-5 py-6 text-left md:px-8 md:py-8">
            <h1 className="mb-6 text-left text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
              {event.title}
            </h1>

            <div className="mb-8 flex flex-col gap-6">
              <InfoRow
                Icon={Clock}
                label={lang === "cs" ? "Datum a čas" : "Date and time"}
                primary={event.date}
                secondary={event.time}
              />
              <InfoRow
                Icon={MapPin}
                label={lang === "cs" ? "Místo" : "Location"}
                primary={event.location}
                secondary={event.address}
              />
            </div>

            <div className="border-t border-white/10 pt-8">
              <h2 className="mb-4 text-left text-xl font-semibold text-white">
                {lang === "cs" ? "O akci" : "About event"}
              </h2>
              <p className="whitespace-pre-line text-left text-base leading-7 text-neutral-400">
                {event.details}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
