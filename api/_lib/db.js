// Přístup do databáze ze serveru.
//
// Service role klíč obchází RLS, takže tenhle modul nesmí nikdy skončit
// v klientském bundlu. Leží proto v /api, kam Vite nesahá, a čte proměnné
// bez prefixu VITE_, které se do buildu nezapékají.

import { createClient } from "@supabase/supabase-js";

let client;

export function db() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY");
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Zavolá databázovou funkci a vrátí její výsledek, nebo vyhodí chybu. */
export async function rpc(name, args) {
  const { data, error } = await db().rpc(name, args);
  if (error) throw new Error(`RPC ${name} selhalo: ${error.message}`);
  return data;
}
