// Denní úloha, která vyjme osobní údaje z rezervací na dávno proběhlé akce.
//
// Spouští ji Vercel podle rozvrhu ve vercel.json. Endpoint je veřejně
// dostupná adresa, takže se musí bránit sám: Vercel k volání přikládá
// hlavičku s CRON_SECRET a bez ní se nic nestane. Jinak by stačilo cestu
// uhodnout a nechat úlohu běžet, kdy se komu zachce.

import { rpc } from "../_lib/db.js";
import { json, safeEqual, withErrorHandling } from "../_lib/http.js";

const RETENTION_DAYS = 90;

async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] Chybí CRON_SECRET, úloha se nespustí.");
    return json(res, 500, { ok: false, error: "not_configured" });
  }

  const provided = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!safeEqual(provided, secret)) {
    return json(res, 401, { ok: false, error: "unauthorized" });
  }

  const count = await rpc("anonymize_old_reservations", { p_days: RETENTION_DAYS });

  // Do logu jde jen počet, žádné údaje o lidech.
  console.log(`[cron] anonymizováno ${count} rezervací starších než ${RETENTION_DAYS} dní`);
  return json(res, 200, { ok: true, anonymized: count, retentionDays: RETENTION_DAYS });
}

export default withErrorHandling(handler);
