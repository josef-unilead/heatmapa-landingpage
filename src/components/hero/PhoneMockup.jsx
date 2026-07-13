import { useEffect, useState } from "react";
import Map, { Marker, useMap } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import TopicCarousel from "./TopicCarousel";
import ErrorBoundary from "../ErrorBoundary";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAP_STYLE = "mapbox://styles/mapbox/standard"; // Standard styl = 3D budovy + světelné presety
const LIGHT_PRESET = "dusk"; // 'dawn' | 'day' | 'dusk' | 'night'
const MAP_ZOOM = 15.5;
const MAP_PITCH = 62; // sklon kamery → 3D perspektiva
const MAP_BEARING = -18; // mírné natočení mapy
const PAN_DURATION = 1100; // ms, délka plynulého přejezdu mapy

function IosSignal({ className }) {
  return (
    <svg viewBox="0 0 18 12" className={className} fill="currentColor" aria-hidden="true">
      <rect x="0" y="8.5" width="3" height="3.5" rx="0.6" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="0.6" />
      <rect x="10" y="2.5" width="3" height="9.5" rx="0.6" />
      <rect x="15" y="0" width="3" height="12" rx="0.6" />
    </svg>
  );
}

function IosWifi({ className }) {
  return (
    <svg viewBox="0 0 16 12" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 1.5C4.7 1.5 1.8 2.7.5 4c-.4.4-.4 1.1 0 1.5.4.4 1 .4 1.5 0C3 4.4 5.3 3.4 8 3.4s5 1 6 2.1c.4.4 1 .4 1.5 0 .4-.4.4-1.1 0-1.5C14.2 2.7 11.3 1.5 8 1.5z" />
      <path d="M8 5.2c-2 0-3.7.8-4.6 1.7-.4.4-.4 1 0 1.4.4.4 1 .4 1.4 0 .6-.6 1.8-1.2 3.2-1.2s2.6.6 3.2 1.2c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4C11.7 6 10 5.2 8 5.2z" />
      <circle cx="8" cy="10.2" r="1.4" />
    </svg>
  );
}

function IosBattery({ className }) {
  return (
    <svg viewBox="0 0 26 12" className={className} fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" strokeOpacity="0.45" />
      <rect x="23.5" y="3.75" width="1.6" height="4.5" rx="0.8" fill="currentColor" fillOpacity="0.45" />
      <rect x="2" y="2" width="19" height="8" rx="1.6" fill="currentColor" />
    </svg>
  );
}

function StatusBar() {
  return (
    <div className="absolute inset-x-0 top-2 z-30 flex h-8 items-center justify-between px-6 text-[11px] font-semibold text-white">
      <span className="tabular-nums tracking-tight">9:41</span>
      <div className="flex items-center gap-1.5 text-white">
        <IosSignal className="h-2.5 w-auto" />
        <IosWifi className="h-2.5 w-auto" />
        <IosBattery className="h-3 w-auto" />
      </div>
    </div>
  );
}

// Pin tématu na mapě – oranžový kruh s bílým logem heatmapy, pulzující u aktivního.
function TopicPin({ active }) {
  return (
    <div className={`relative transition-all duration-300 ${active ? "scale-100 opacity-100" : "scale-75 opacity-40"}`}>
      {active && (
        <span
          className="absolute inset-0 -m-2 animate-ping rounded-full"
          style={{ backgroundColor: "#FF8A0055", animationDuration: "1.3s" }}
        />
      )}
      <div
        className="relative flex h-10 w-10 items-center justify-center rounded-full shadow-[0_0_20px_rgba(255,138,0,0.5)]"
        style={{ backgroundColor: "#FF8A00" }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 894 1141" className="h-6 w-auto" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M598.262 263.553C653.996 263.553 704.236 276.623 748.815 303.054C793.353 328.652 828.442 363.825 854.332 408.571H854.208C880.764 453.525 894 504.056 894 560.082V791.512C894 808.786 887.964 823.604 875.894 835.55C864.53 846.955 849.795 852.408 832.604 852.408C815.414 852.408 800.471 846.955 788.4 835.8L788.191 835.592L787.983 835.384C776.703 823.438 771.251 808.619 771.251 791.554V789.847C745.86 808.869 717.597 823.562 687.836 833.219C653.996 848.245 617.159 855.654 577.283 855.654C529.519 855.654 486.058 844.933 447.023 823.496C408.009 844.905 364.574 855.613 316.842 855.613C276.966 855.613 240.129 848.204 206.289 833.178C176.57 823.521 148.306 808.828 122.874 789.806V1078.88C122.874 1112.81 95.3609 1140.32 61.4375 1140.32C27.5139 1140.32 0 1112.81 0 1078.88V560.082C4.05116e-05 504.098 13.2369 453.525 39.793 408.571C65.6415 363.825 100.73 328.652 145.31 303.054C189.889 276.664 240.129 263.553 295.863 263.553C351.436 263.553 401.918 276.548 447.062 302.825C492.207 276.589 542.689 263.553 598.262 263.553ZM676.765 406.198C634.55 384.48 587.539 381.841 545.582 395.135C548.486 399.515 551.298 403.993 554.016 408.571V408.654L555.22 410.762C580.305 455.113 592.768 505.177 592.768 560.082C592.768 615.858 581.029 666.265 557.304 711.136V711.261L557.179 711.386C554.563 716.124 551.843 720.761 549.023 725.297C627.077 748.279 712.926 713.527 751.521 638.544C795.185 553.839 761.678 449.82 676.765 406.198ZM348.536 395.143C306.58 381.852 259.567 384.484 217.36 406.198C132.448 449.779 98.94 553.839 142.604 638.544C181.195 713.482 267.03 748.263 345.077 725.302C342.266 720.777 339.555 716.153 336.946 711.428L336.821 711.303V711.178C313.096 666.349 301.357 616.15 301.357 560.124C301.357 504.098 314.219 453.567 340.109 408.696V408.571C342.825 403.996 345.635 399.52 348.536 395.143ZM447.062 475.361C446.071 477.133 445.106 478.928 444.17 480.747C416.662 534.19 419.785 595.248 447.062 644.023C474.34 595.249 477.464 534.19 449.956 480.747C449.02 478.928 448.054 477.133 447.062 475.361ZM205.747 0C274.137 7.83425e-05 329.578 55.4419 329.578 123.832C329.578 192.222 274.137 247.663 205.747 247.663C137.357 247.663 81.9152 192.222 81.915 123.832C81.915 55.4418 137.357 0 205.747 0ZM689.21 0C757.6 0 813.041 55.4418 813.041 123.832C813.041 192.222 757.6 247.663 689.21 247.663C620.82 247.663 565.379 192.222 565.379 123.832C565.379 55.4418 620.82 8.24873e-06 689.21 0Z" />
        </svg>
      </div>
    </div>
  );
}

// Plynulý přejezd mapy na polohu aktivního tématu (easeTo se zabudovaným easingem).
// `padding.bottom` drží pin nad kartičkou carouselu (spodní část telefonu).
function MapController({ location }) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map || !location) return;
    const h = map.getContainer()?.offsetHeight || 680;
    map.easeTo({
      center: [location.lng, location.lat],
      duration: PAN_DURATION,
      padding: { top: 0, bottom: Math.round(h * 0.42), left: 0, right: 0 },
      essential: true,
    });
  }, [map, location]);

  return null;
}

// Mapbox mapa na pozadí telefonu (Standard styl, 3D) + pin u každého tématu.
function PhoneMap({ topics, activeIndex }) {
  const [ready, setReady] = useState(false);
  const activeLocation = topics[activeIndex]?.location;

  return (
    <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-95" : "opacity-0"}`}>
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        initialViewState={{
          longitude: topics[0].location.lng,
          latitude: topics[0].location.lat,
          zoom: MAP_ZOOM,
          pitch: MAP_PITCH,
          bearing: MAP_BEARING,
        }}
        style={{ width: "100%", height: "100%" }}
        interactive={false}
        attributionControl={false}
        logoPosition="bottom-left"
        fadeDuration={0}
        onLoad={(e) => {
          try {
            e.target.setConfigProperty("basemap", "lightPreset", LIGHT_PRESET);
            e.target.setConfigProperty("basemap", "showPointOfInterestLabels", false);
            e.target.setConfigProperty("basemap", "showTransitLabels", false);
          } catch {
            /* starší styl bez configu – ignoruj */
          }
          // Jen canvas = mapa šedá, markery zůstanou barevné.
          e.target.getCanvas().style.filter = "grayscale(0.72) brightness(0.60) contrast(1.2) saturate(1.15)";
          const logo = e.target.getContainer().querySelector(".mapboxgl-ctrl-logo");
          if (logo) { logo.style.transform = "scale(0.45)"; logo.style.transformOrigin = "bottom left"; logo.style.marginLeft = "15px"; logo.style.marginBottom = "-6px"; }
        }}
        onIdle={() => setReady(true)}
      >
        {topics.map((topic, i) => (
          <Marker
            key={topic.id}
            longitude={topic.location.lng}
            latitude={topic.location.lat}
            anchor="bottom"
          >
            <TopicPin active={i === activeIndex} />
          </Marker>
        ))}
        <MapController location={activeLocation} />
      </Map>
    </div>
  );
}

export default function PhoneMockup({ topics }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="relative w-full max-w-85">
      <div className="absolute -inset-8 -z-10 rounded-full bg-orange-400/[0.16] blur-3xl" />
      {/* Boční tlačítka zařízení */}
      <div className="absolute -left-[2px] top-[17%] z-0 h-7 w-[2.5px] rounded-l-md bg-gradient-to-r from-neutral-700 to-neutral-900" />
      <div className="absolute -left-[2px] top-[26%] z-0 h-11 w-[2.5px] rounded-l-md bg-gradient-to-r from-neutral-700 to-neutral-900" />
      <div className="absolute -left-[2px] top-[37%] z-0 h-11 w-[2.5px] rounded-l-md bg-gradient-to-r from-neutral-700 to-neutral-900" />
      <div className="absolute -right-[2px] top-[28%] z-0 h-16 w-[2.5px] rounded-r-md bg-gradient-to-l from-neutral-700 to-neutral-900" />
      <div className="relative aspect-[9/19] rounded-[48px] border border-white/8 bg-gradient-to-b from-neutral-950 to-black p-[6px] shadow-[0_30px_100px_rgba(0,0,0,0.75),0_0_60px_rgba(255,200,140,0.06),0_0_130px_rgba(255,180,100,0.03)]">
        <div className="relative h-full w-full overflow-hidden rounded-[42px] bg-neutral-950">
          {MAPBOX_TOKEN && topics.length > 0 && (
            <ErrorBoundary
              fallback={
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-neutral-950" />
              }
            >
              <PhoneMap topics={topics} activeIndex={activeIndex} />
            </ErrorBoundary>
          )}
          {/* Maska horizontu/oblohy nakloněné 3D mapy ve vrchní části */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-neutral-950 via-neutral-950/80 to-transparent" />
          <div className="absolute left-1/2 top-2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />
          <StatusBar />
          <div className="absolute inset-x-0 bottom-0 z-20 pb-4">
            <TopicCarousel topics={topics} variant="mockup" onActiveChange={setActiveIndex} />
          </div>
        </div>
      </div>
    </div>
  );
}
