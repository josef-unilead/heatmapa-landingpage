# Rozhraní pro scanner vstupenek

Popis všeho, co potřebuješ ke stavbě čtečky u vchodu. Zdrojáky serveru číst
nemusíš, tenhle dokument je úplný.

Základ adresy: `https://www.heatmapa.com/api/scanner`

---

## 1. Jak vstupenka vypadá

V QR kódu je jeden řetězec, nic víc. **Není to URL**, je to token. Když ho
naskenuješ běžnou čtečkou, uvidíš jen změť znaků, a to je záměr: kdyby tam
byla adresa, náhodné naskenování mobilem by komukoli otevřelo cizí vstupenku.

```
AQABUHaKiktgS1irEvIdj_087i6jkWDSLMfjnS-fTlF65VMlVQht3f35Ak700BatJSlTQSxt3vVLQYD_FP4VQ14vDI9ptcDZTf-3FLzH20_7IAI
```

- vždy **111 znaků**
- abeceda **base64url** (`A-Z a-z 0-9 - _`), bez zarovnávacích rovnítek
- po dekódování **83 bajtů**

### Rozložení bajtů

| Pozice | Délka | Význam |
|---|---|---|
| 0 | 1 B | verze formátu, dnes vždy `1` |
| 1–2 | 2 B | číslo akce, uint16 big endian |
| 3–18 | 16 B | id vstupenky (UUID v binární podobě) |
| 19–82 | 64 B | podpis Ed25519 prvních 19 bajtů |

**Nejsou v něm žádné osobní údaje.** Jméno ani e-mail se z tokenu nedají
zjistit, čtečka si je vytáhne ze serveru nebo z offline seznamu podle id
vstupenky.

Verzi na první pozici kontroluj a při neznámé hodnotě vstupenku odmítni.
Existuje proto, aby šel formát někdy změnit, aniž by přestaly platit dřív
rozeslané vstupenky.

---

## 2. Ověření podpisu

Podpis je **Ed25519**. Server podepisuje privátním klíčem, který nikdy
neopouští server, čtečka dostane jen veřejný. Z veřejného klíče se vstupenka
vyrobit nedá, jen ověřit. Proto smí být klidně v aplikaci nebo v jejích
zdrojácích.

**Ověřuj vždycky, i offline.** Bez toho by stačilo vygenerovat si náhodných
83 bajtů a projít.

### Kde vzít veřejný klíč

```
GET /api/scanner/public-key
```

Bez přihlášení. Odpověď:

```json
{
  "ok": true,
  "algorithm": "Ed25519",
  "format": "raw-32-byte-base64",
  "tokenVersion": 1,
  "publicKey": "zV3C7ift9Vt5zkjx…"
}
```

`publicKey` je **holých 32 bajtů v base64**, ne PEM ani DER. Stáhni si ho při
prvním spuštění, ulož a dál používej i bez sítě. Kdyby se klíč někdy měnil,
přestanou platit všechny dosud rozeslané vstupenky, takže se to nestane bez
předchozí domluvy.

### Postup ověření

1. Dekóduj token z base64url na 83 bajtů. Jiná délka = neplatné.
2. Zkontroluj, že bajt 0 je `1`.
3. Rozděl na payload (bajty 0–18) a podpis (19–82).
4. Ověř podpis payloadu veřejným klíčem.
5. Přečti číslo akce (bajty 1–2, big endian) a id vstupenky (bajty 3–18).

### Ukázka v JavaScriptu

```js
// Web Crypto umí Ed25519 v Safari 17+, Chrome 137+ a ve Firefoxu.
// Na starších prohlížečích sáhni po @noble/ed25519, chová se stejně.
async function overVstupenku(token, publicKeyBase64) {
  const raw = Uint8Array.from(atob(token.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  if (raw.length !== 83 || raw[0] !== 1) return null;

  const payload = raw.subarray(0, 19);
  const signature = raw.subarray(19);

  const key = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(publicKeyBase64), (c) => c.charCodeAt(0)),
    { name: "Ed25519" }, false, ["verify"],
  );
  if (!(await crypto.subtle.verify({ name: "Ed25519" }, key, signature, payload))) return null;

  const eventRef = (payload[1] << 8) | payload[2];
  const hex = [...payload.subarray(3, 19)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const ticketId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  return { eventRef, ticketId };
}
```

### Ukázka ve Swiftu

```swift
import CryptoKit

func overVstupenku(_ token: String, publicKey: Data) -> (eventRef: Int, ticketId: UUID)? {
    var b64 = token.replacingOccurrences(of: "-", with: "+")
                   .replacingOccurrences(of: "_", with: "/")
    while b64.count % 4 != 0 { b64 += "=" }
    guard let raw = Data(base64Encoded: b64), raw.count == 83, raw[0] == 1 else { return nil }

    let payload = raw.prefix(19)
    let signature = raw.suffix(64)
    guard let key = try? Curve25519.Signing.PublicKey(rawRepresentation: publicKey),
          key.isValidSignature(signature, for: payload) else { return nil }

    let eventRef = Int(raw[1]) << 8 | Int(raw[2])
    let bytes = [UInt8](raw[3..<19])
    let ticketId = UUID(uuid: (bytes[0],bytes[1],bytes[2],bytes[3],bytes[4],bytes[5],bytes[6],bytes[7],
                               bytes[8],bytes[9],bytes[10],bytes[11],bytes[12],bytes[13],bytes[14],bytes[15]))
    return (eventRef, ticketId)
}
```

**Ověřený podpis ještě neznamená vpustit.** Říká jen, že vstupenku vydal náš
server. Jestli je platná, zrušená nebo už použitá, ví jen server nebo offline
seznam.

---

## 3. Přihlášení obsluhy

```
POST /api/scanner/login
Content-Type: application/json

{ "code": "R5FC3F" }
```

Kód vydává pořadatel v administraci. Má šest znaků z abecedy bez písmen, která
se pletou s číslicemi (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`), takže se dá
nadiktovat po telefonu. Před odesláním ho **převeď na velká písmena**, server
malá přijme, ale ať se to chová stejně.

Odpověď 200:

```json
{
  "ok": true,
  "token": "eyJlIjoiM2U1NDZkYmQt….Ff9lM…",
  "staff": { "label": "Vchod A" },
  "event": {
    "slug": "what-the-f3ck-is-heatmapa",
    "title": "WHAT THE F3CK IS HEATMA8A",
    "startsAt": "2026-08-30T18:00:00+00:00",
    "venueName": "Bar Zvon"
  }
}
```

Odpověď 401 `{ "ok": false, "error": "invalid_code" }` u neplatného,
zneplatněného i vypršelého kódu. Rozlišovat se schválně nedá.

**Token si ulož.** Platí **12 hodin** a posílá se s každým dalším voláním:

```
Authorization: Bearer <token>
```

Nese v sobě akci, takže kódem od jedné akce neodbavíš vstupenky na jinou, a
jméno obsluhy, které se zapíše ke každému odbavení. Bez hlavičky vrací
všechny chráněné cesty `401 { "ok": false, "error": "unauthorized" }`.

Ověření platnosti relace bez vedlejších účinků:

```
GET /api/scanner/me
→ { "ok": true, "staff": { "eventId": "…", "eventRef": 1, "label": "Vchod A", "expiresAt": "…" } }
```

---

## 4. Odbavení

```
POST /api/scanner/checkin
Authorization: Bearer <token>

{ "ticket": "AQABUHaKiktg…" }
```

Posílej **celý naskenovaný řetězec**, nerozebírej ho. Server si ho ověří sám.

**Odpověď je vždy HTTP 200**, i když se nevpouští. Rozhoduje pole `result`,
ne stavový kód. Chybové kódy jsou vyhrazené pro selhání komunikace.

| `result` | `ok` | Co se stalo | Co má obsluha udělat |
|---|---|---|---|
| `ok` | true | Odbaveno | Pustit dovnitř |
| `ok` + `repeat: true` | true | Tentýž sken toutéž obsluhou do 5 s | Pustit, je to jen dvojí sken |
| `already_used` | false | Vstupenka už byla použita | Nepouštět, ukázat čas a jméno |
| `invalid_signature` | false | Podpis nesedí | Nepouštět, není to naše vstupenka |
| `wrong_event` | false | Vstupenka na jinou akci | Nepouštět, sdělit název akce |
| `cancelled` | false | Rezervaci zrušil návštěvník | Nepouštět |
| `revoked` | false | Rezervaci zneplatnil pořadatel | Nepouštět |
| `not_confirmed` | false | Rezervace nebyla potvrzena e-mailem | Nepouštět, poslat k pořadateli |
| `not_found` | false | Podpis sedí, ale vstupenka v databázi není | Nepouštět, hlásit pořadateli |

Úspěch:

```json
{ "ok": true, "result": "ok", "firstName": "Jan", "lastName": "Novák",
  "checkedInAt": "2026-08-30T19:12:44.512Z" }
```

Konflikt nese navíc čas prvního odbavení a jméno obsluhy, která pustila
první, ať jde na místě dohledat, co se stalo:

```json
{ "ok": false, "result": "already_used", "firstName": "Jan", "lastName": "Novák",
  "checkedInAt": "2026-08-30T19:05:02.104Z", "checkedInBy": "Vchod A" }
```

`wrong_event` nese `eventTitle` s názvem akce, na kterou vstupenka patří.

### Dvě čtečky naráz

Odbavení je jedna atomická operace v databázi. Když dvě čtečky naskenují tutéž
vstupenku ve stejný okamžik, **projde právě jedna** a druhá dostane
`already_used`. Není potřeba nic zamykat ani koordinovat mezi telefony.

### Opakovaný sken

Do **5 sekund** od odbavení vrátí tentýž sken **toutéž obsluhou** znovu `ok`,
navíc s `repeat: true`. Je to na případ, kdy se telefon zasekne a obsluha
neví, jestli první sken prošel. Po pěti sekundách, nebo když skenuje jiná
obsluha, jde už o `already_used`.

---

## 5. Vzetí zpět

```
POST /api/scanner/undo
Authorization: Bearer <token>

{ "ticket": "AQABUHaKiktg…" }
```

Vrátí odbavení do stavu „potvrzeno", takže vstupenka jde odbavit znovu. Jen
do **30 sekund** od odbavení, potom `{ "ok": false, "result": "too_late" }`.
Na omyl obsluhy to stačí a zároveň to nedovolí vyrobit díru v evidenci
hodinu po akci.

---

## 6. Offline režim

V klubu bývá signál mizerný. Počítej s tím, že **u dveří síť nebude**.

### Stažení seznamu

```
GET /api/scanner/manifest
Authorization: Bearer <token>
```

Stáhni ho, dokud máš signál, ideálně těsně před otevřením dveří.

```json
{
  "ok": true,
  "generatedAt": "2026-08-30T18:40:00.000Z",
  "event": { "ref": 1, "slug": "what-the-f3ck-is-heatmapa",
             "title": "WHAT THE F3CK IS HEATMA8A",
             "startsAt": "2026-08-30T18:00:00+00:00", "capacity": 100 },
  "tickets": [
    { "ticketId": "50768a8a-4b60-4b58-ab12-f21d8ffd3cee",
      "firstName": "Jan", "lastName": "Novák",
      "status": "confirmed", "checkedInAt": null }
  ]
}
```

Jsou v něm jen vstupenky ve stavu `confirmed` a `checked_in`, tedy ty, které
můžou dorazit. Zrušené a nepotvrzené v seznamu nejsou, takže **vstupenku,
kterou v seznamu nenajdeš, nepouštěj**.

### Odbavování bez sítě

1. Ověř podpis (kapitola 2). Když nesedí, nepouštěj.
2. Zkontroluj, že číslo akce v tokenu sedí s `event.ref` ze seznamu.
3. Najdi `ticketId` v seznamu. Když tam není, nepouštěj.
4. Když je u něj `checkedInAt` nebo jsi ho už odbavil v tomhle běhu, hlas
   `already_used`.
5. Jinak pusť a **ulož si sken lokálně** i s časem.

### Dosynchronizování

Jakmile je signál zpátky:

```
POST /api/scanner/sync
Authorization: Bearer <token>

{
  "checkins": [
    { "ticket": "AQAB…", "scannedAt": "2026-08-30T19:12:44.512Z" },
    { "ticket": "AQAB…", "scannedAt": "2026-08-30T19:13:02.881Z" }
  ]
}
```

`scannedAt` je čas skutečného skenu u dveří, ne odeslání. Uloží se do logu,
takže je pak vidět reálný průběh večera. Nejvýš **500 položek na dávku**, víc
vrátí `413 batch_too_large`.

```json
{
  "ok": true,
  "accepted": 47,
  "conflicts": [
    { "ticket": "AQAB…", "ok": false, "result": "already_used",
      "firstName": "Jan", "lastName": "Novák",
      "checkedInAt": "2026-08-30T19:05:02.104Z", "checkedInBy": "Vchod B" }
  ]
}
```

**Konflikt není chyba.** Když u dveří stojí dvě čtečky bez signálu, obě mohly
pustit tutéž vstupenku a někdo to musí rozseknout. Vyhrává ta, která dorazila
na server první. Konflikty ukaž obsluze nebo pořadateli, ale neposílej dávku
znovu, výsledek by byl stejný.

V dávce se **neuplatňuje** pětisekundové okno na opakovaný sken. Duplicita
v dávce je skutečný konflikt, ne zaseknutý telefon.

---

## 7. Hledání a ruční odbavení

Na vybité telefony a smazané e-maily.

```
GET /api/scanner/search?q=Novák
Authorization: Bearer <token>
```

Hledá v příjmení, jménu i e-mailu, potřebuje aspoň dva znaky, vrací nejvýš
20 výsledků, jen ze své akce a jen stavy `confirmed` a `checked_in`.

```json
{
  "ok": true,
  "results": [
    { "reservationId": "e8184302-3637-4063-b466-dee65231d121",
      "firstName": "Jan", "lastName": "Novák",
      "emailHint": "j***@example.com",
      "status": "confirmed", "checkedInAt": null }
  ]
}
```

E-mail je schválně jen naznačený. Na rozlišení dvou stejných jmen to stačí a
zároveň z toho nejde vyhledáváním odčerpat seznam účastníků.

Odbavení nalezeného člověka:

```
POST /api/scanner/manual
Authorization: Bearer <token>

{ "reservationId": "e8184302-3637-4063-b466-dee65231d121" }
```

Odpovídá stejně jako `checkin` a v logu se odliší zdrojem `manual`, takže je
pak vidět, kolik lidí prošlo bez QR.

---

## 8. Co si ohlídat při stavbě

**Ověřuj podpis vždycky, i offline.** Je to jediná obrana proti vyrobenému QR.

**Neukládej si přihlašovací kód, ulož token.** Kód je trvalý, token vyprší za
12 hodin. Po vypršení nech obsluhu přihlásit znovu, kód je krátký.

**Ošetři vybitou baterku.** Neodeslané offline skeny si ukládej tak, aby
přežily zavření aplikace, ne jen do paměti.

**Nespoléhej na hodiny telefonu.** `scannedAt` posílej, ale server si o pořadí
rozhoduje sám podle toho, co dorazí první.

**Ukazuj jméno.** U `ok` i u `already_used` ho server vrací. Obsluha podle něj
pozná, jestli u dveří stojí ten člověk, nebo někdo s cizím screenshotem.

**Odlišuj zvukem.** Obsluha se u dveří na displej nedívá. Jiný zvuk pro
propuštění a jiný pro odmítnutí ušetří víc času než jakékoli rozhraní.

---

## 9. Rychlý přehled cest

| Metoda | Cesta | Přihlášení | K čemu |
|---|---|---|---|
| GET | `/public-key` | ne | veřejný klíč k ověření podpisu |
| POST | `/login` | ne | přihlášení obsluhy kódem |
| GET | `/me` | ano | ověření platnosti relace |
| POST | `/checkin` | ano | odbavení naskenované vstupenky |
| POST | `/undo` | ano | vzetí odbavení zpět do 30 s |
| GET | `/manifest` | ano | seznam vstupenek pro offline |
| POST | `/sync` | ano | dávka offline odbavení |
| GET | `/search?q=` | ano | hledání podle jména nebo e-mailu |
| POST | `/manual` | ano | odbavení bez QR |

Chybové stavy mimo `result`:

| HTTP | Kdy |
|---|---|
| 400 | špatně poskládaný požadavek, u `login` příliš krátký kód |
| 401 | chybí nebo vypršel token, u `login` neplatný kód |
| 404 | neznámá cesta, u `manual` rezervace na téhle akci není |
| 405 | špatná metoda |
| 413 | dávka nad 500 položek |
| 500 | chyba serveru, zkus to znovu |
