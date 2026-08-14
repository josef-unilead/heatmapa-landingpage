// Vyrobí video soubor s QR kódem, který Chrome přehraje místo kamery.
//
// Chrome umí `--use-file-for-fake-video-capture` s formátem Y4M. Ten je
// natolik jednoduchý, že se dá poskládat ručně: hlavička a pak snímky
// v surovém I420. Odpadá tím závislost na ffmpegu jen kvůli testu.

import QRCode from "qrcode";

const SIRKA = 640;
const VYSKA = 480;
const SNIMKU = 12;

/**
 * @param token co má být v QR kódu
 * @returns Buffer s obsahem souboru .y4m
 */
export function vyrobY4M(token) {
  const qr = QRCode.create(token, { errorCorrectionLevel: "H" });
  const moduly = qr.modules.size;
  const okraj = 4;
  const celkem = moduly + okraj * 2;

  // QR zabere zhruba dvě třetiny výšky, jako když obsluha přiloží telefon.
  const strana = Math.floor(VYSKA * 0.66);
  const meritko = Math.floor(strana / celkem);
  const kresleno = meritko * celkem;
  const posunX = Math.floor((SIRKA - kresleno) / 2);
  const posunY = Math.floor((VYSKA - kresleno) / 2);

  // Jasová složka. Pozadí necháváme šedivé jako stůl, QR je na bílém poli,
  // ať to odpovídá skutečnému skenu z displeje.
  const y = Buffer.alloc(SIRKA * VYSKA, 90);

  for (let radek = 0; radek < kresleno; radek++) {
    for (let sloupec = 0; sloupec < kresleno; sloupec++) {
      const mx = Math.floor(sloupec / meritko) - okraj;
      const my = Math.floor(radek / meritko) - okraj;

      const vRozsahu = mx >= 0 && my >= 0 && mx < moduly && my < moduly;
      const tmavy = vRozsahu && qr.modules.get(my, mx);

      y[(posunY + radek) * SIRKA + (posunX + sloupec)] = tmavy ? 0 : 255;
    }
  }

  // Barvonosné složky jsou neutrální, obraz je černobílý.
  const u = Buffer.alloc((SIRKA / 2) * (VYSKA / 2), 128);
  const v = Buffer.alloc((SIRKA / 2) * (VYSKA / 2), 128);

  const casti = [Buffer.from(`YUV4MPEG2 W${SIRKA} H${VYSKA} F25:1 Ip A1:1 C420jpeg\n`)];
  for (let i = 0; i < SNIMKU; i++) {
    casti.push(Buffer.from("FRAME\n"), y, u, v);
  }
  return Buffer.concat(casti);
}
