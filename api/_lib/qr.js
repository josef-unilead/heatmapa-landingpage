// Generování QR kódu se vstupenkou.

import QRCode from "qrcode";

/**
 * QR jako PNG.
 *
 * Vysoká korekce chyb schválně: kód se často skenuje z displeje s otiskem
 * prstů, sníženým jasem nebo pod ostrým světlem v klubu. Kontrast je čistě
 * černá na bílé, žádné barvy značky, protože obarvený QR část čteček nepřečte.
 */
export function ticketQrPng(token, { size = 600 } = {}) {
  return QRCode.toBuffer(token, {
    type: "png",
    width: size,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
