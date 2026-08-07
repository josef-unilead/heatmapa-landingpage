#!/usr/bin/env node
// Vygeneruje podpisový pár pro vstupenky a náhodná serverová tajemství.
//
// Podpis je asymetrický (Ed25519) schválně: server drží privátní klíč a jako
// jediný umí vstupenku vyrobit, scanner dostane jen veřejný a umí ji ověřit
// i bez internetu. Kdyby byl podpis symetrický, musel by scanner znát klíč,
// kterým se podepisuje, a kdokoli s přístupem ke scanneru by si mohl vyrobit
// libovolnou vstupenku.
//
// Spuštění:  node scripts/generate-keys.mjs

import { generateKeyPairSync, randomBytes } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");

// Privátní klíč v PKCS8, ať ho node umí naimportovat zpátky jedním voláním.
const privDer = privateKey.export({ format: "der", type: "pkcs8" });

// Veřejný klíč jako holých 32 bajtů. SPKI obal má u Ed25519 pevných 12 bajtů
// hlavičky, takže zbytek je samotný klíč. Scanner ho tak umí naimportovat
// přes WebCrypto i přes libovolnou knihovnu, bez parsování ASN.1.
const pubRaw = publicKey.export({ format: "der", type: "spki" }).subarray(12);

const b64 = (buf) => Buffer.from(buf).toString("base64");
const secret = () => randomBytes(32).toString("base64");

console.log(`
Zkopíruj tyhle proměnné do Vercelu (Settings → Environment Variables)
a do lokálního .env. Ve Vercelu je všechny označ jako Sensitive
a zaškrtni prostředí Production + Preview.

────────────────────────────────────────────────────────────────────────
TICKET_SIGNING_PRIVATE_KEY=${b64(privDer)}
TICKET_PUBLIC_KEY=${b64(pubRaw)}
FORM_TOKEN_SECRET=${secret()}
SESSION_SECRET=${secret()}
IP_HASH_SALT=${secret()}
CRON_SECRET=${secret()}
────────────────────────────────────────────────────────────────────────

Na co si dát pozor:

  • TICKET_SIGNING_PRIVATE_KEY nesmí opustit server. Kdo ho má, umí vyrobit
    platnou vstupenku na jakoukoli akci.
  • TICKET_PUBLIC_KEY je veřejný. Dostane ho scanner a klidně smí být
    i v jeho zdrojácích. Server ho navíc vystavuje na /api/scanner/public-key.
  • IP_HASH_SALT nikdy neměň za běhu akce. Se změnou soli přestanou sedět
    dřív uložené hashe a rate limit podle IP začne počítat od nuly.
  • Když klíče vygeneruješ znovu, všechny dosud rozeslané vstupenky
    přestanou platit. Dělej to jen když víš proč.
`);
