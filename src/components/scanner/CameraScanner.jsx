// Kamera a čtení QR kódů.
//
// Dvě cesty ke stejnému cíli. Když prohlížeč umí BarcodeDetector, používá se
// on: dekóduje nativně, takže je rychlejší a šetří baterku. Jinak se sáhne po
// jsQR, který čte z plátna v JavaScriptu. Změřeno na našich kódech: 10 až 50
// ms na snímek, takže i ta pomalejší cesta stíhá s velkou rezervou.
//
// Displej se drží rozsvícený přes Wake Lock. Bez toho telefon u dveří po
// minutě zhasne a obsluha ho pořád probouzí.

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// Jak dlouho se ignoruje tentýž kód. Bez toho by jeden přiložený telefon
// vystřelil desítky skenů za sekundu.
const STEJNY_KOD_MS = 2500;
const INTERVAL_MS = 100;

// Kamera zůstává puštěná i během zobrazeného výsledku. Vypínat a znovu
// startovat stream by znamenalo sekundu čekání a probliknutí u každého
// návštěvníka, a navíc by se tím zapomnělo, co se právě naskenovalo, takže
// by čtečka po zavření výsledku hned přečetla tentýž kód znovu.
export default function CameraScanner({ onScan, pozastaveno = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const posledni = useRef({ kod: null, kdy: 0 });
  // V ref, aby uvnitř běžícího intervalu byla vidět aktuální hodnota.
  // Zapisuje se v efektu, ne během vykreslení.
  const pauza = useRef(pozastaveno);
  const [chyba, setChyba] = useState(null);
  const [pripraveno, setPripraveno] = useState(false);

  useEffect(() => {
    pauza.current = pozastaveno;
  }, [pozastaveno]);

  const nahlas = useCallback((kod) => {
    if (pauza.current) return;
    const ted = Date.now();
    if (posledni.current.kod === kod && ted - posledni.current.kdy < STEJNY_KOD_MS) return;
    posledni.current = { kod, kdy: ted };
    onScan(kod);
  }, [onScan]);

  useEffect(() => {
    let stream;
    let detector;
    let timer;
    let wakeLock;
    let zruseno = false;

    async function spust() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // Zadní kamera. Bez tohohle telefon nabídne selfie kameru.
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
      } catch (err) {
        setChyba(
          err?.name === "NotAllowedError"
            ? "Kamera je zakázaná. Povol ji v nastavení prohlížeče a načti stránku znovu."
            : "Kameru se nepodařilo spustit.",
        );
        return;
      }
      if (zruseno) return stream.getTracks().forEach((t) => t.stop());

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      // playsInline je na iOS nutnost, jinak si Safari video přepne na
      // celou obrazovku a čtečka zmizí.
      video.setAttribute("playsinline", "true");
      await video.play().catch(() => {});
      setPripraveno(true);

      try {
        wakeLock = await navigator.wakeLock?.request("screen");
      } catch {
        // Nepodstatné, obsluha si displej probudí sama.
      }

      if ("BarcodeDetector" in window) {
        try {
          const podporovane = await window.BarcodeDetector.getSupportedFormats();
          if (podporovane.includes("qr_code")) {
            detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          }
        } catch { /* spadneme na jsQR */ }
      }

      timer = setInterval(cti, INTERVAL_MS);
    }

    async function cti() {
      if (pauza.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      if (detector) {
        try {
          const [nalez] = await detector.detect(video);
          if (nalez?.rawValue) nahlas(nalez.rawValue);
          return;
        } catch {
          // Někdy selže jen jeden snímek, jindy detektor celý. Zahodíme ho
          // a dál čteme jsQR, ať čtečka nepřestane fungovat uprostřed akce.
          detector = null;
        }
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const sirka = video.videoWidth;
      const vyska = video.videoHeight;
      if (!sirka || !vyska) return;

      // Zmenšení na polovinu. Dekódování je pak výrazně rychlejší a na kód
      // přiložený k telefonu to bohatě stačí.
      canvas.width = Math.round(sirka / 2);
      canvas.height = Math.round(vyska / 2);
      const cx = canvas.getContext("2d", { willReadFrequently: true });
      cx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const obraz = cx.getImageData(0, 0, canvas.width, canvas.height);
      const nalez = jsQR(obraz.data, obraz.width, obraz.height, {
        inversionAttempts: "dontInvert",
      });
      if (nalez?.data) nahlas(nalez.data);
    }

    spust();

    return () => {
      zruseno = true;
      clearInterval(timer);
      wakeLock?.release?.().catch(() => {});
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [nahlas]);

  if (chyba) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-3xl border border-white/10 bg-neutral-950 p-8">
        <p className="text-center text-sm leading-relaxed text-neutral-400">{chyba}</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-neutral-950">
      <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Rámeček, kam má obsluha kód namířit. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-3/5 w-3/5 rounded-2xl border-2 border-white/50" />
      </div>

      {!pripraveno && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
          <p className="text-sm text-neutral-500">Spouštím kameru</p>
        </div>
      )}
    </div>
  );
}
