// Testy sdílené validace a podepisování vstupenek.
// Běží na vestavěném test runneru node, žádná knihovna navíc.
//
// Spuštění:  npm test

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign as edSign } from "node:crypto";

import {
  normalizeEmail, normalizePhone, isDisposableEmail, validateReservation,
} from "../src/lib/ticketing/validation.js";

// Klíče musí být v prostředí dřív, než se modul s tokeny naimportuje.
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
process.env.TICKET_SIGNING_PRIVATE_KEY =
  privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
process.env.TICKET_PUBLIC_KEY =
  publicKey.export({ format: "der", type: "spki" }).subarray(12).toString("base64");
process.env.FORM_TOKEN_SECRET = "testovaci-tajemstvi-na-nonce";

const { signTicket, verifyTicket, verifyFormToken, issueFormToken } =
  await import("../api/_lib/tokens.js");

describe("normalizace e-mailu", () => {
  test("gmail ignoruje tečky a plusové tagy", () => {
    const varianty = [
      "jan.novak@gmail.com",
      "jannovak@gmail.com",
      "j.a.n.n.o.v.a.k@gmail.com",
      "jannovak+akce@gmail.com",
      "Jan.Novak+cokoliv@GMAIL.com",
      "jan.novak@googlemail.com",
    ];
    const vysledky = new Set(varianty.map(normalizeEmail));
    assert.equal(vysledky.size, 1, "všechny varianty musí dát jednu adresu");
    assert.equal([...vysledky][0], "jannovak@gmail.com");
  });

  test("u seznamu se tečky zachovají, plus se zahodí", () => {
    assert.equal(normalizeEmail("jan.novak@seznam.cz"), "jan.novak@seznam.cz");
    assert.equal(normalizeEmail("jan.novak+spam@seznam.cz"), "jan.novak@seznam.cz");
  });

  test("cizí doména se nechá být, jen se zmenší písmena", () => {
    assert.equal(normalizeEmail("Jan.Novak@Firma.CZ"), "jan.novak@firma.cz");
  });
});

describe("normalizace telefonu", () => {
  test("české tvary dají stejné číslo", () => {
    for (const vstup of ["777123456", "777 123 456", "+420777123456",
                         "+420 777 123 456", "00420777123456", "0777123456"]) {
      assert.equal(normalizePhone(vstup), "+420777123456", `selhalo na "${vstup}"`);
    }
  });

  test("cizí předvolba se zachová", () => {
    assert.equal(normalizePhone("+421903123456"), "+421903123456");
  });
});

describe("jednorázové schránky", () => {
  test("známé se poznají", () => {
    assert.ok(isDisposableEmail("kdokoliv@mailinator.com"));
    assert.ok(isDisposableEmail("kdokoliv@yopmail.com"));
  });
  test("běžné projdou", () => {
    assert.ok(!isDisposableEmail("jan@seznam.cz"));
    assert.ok(!isDisposableEmail("jan@gmail.com"));
  });
});

describe("validace formuláře", () => {
  const platny = {
    firstName: "Jan", lastName: "Novák", email: "jan.novak@seznam.cz",
    phone: "777123456", consentGdpr: true,
  };

  test("správně vyplněný projde a vrátí očištěná data", () => {
    const { valid, values } = validateReservation(platny);
    assert.ok(valid);
    assert.equal(values.phone, "+420777123456");
    assert.equal(values.emailNormalized, "jan.novak@seznam.cz");
  });

  test("bez souhlasu neprojde", () => {
    const { valid, errors } = validateReservation({ ...platny, consentGdpr: false });
    assert.ok(!valid);
    assert.equal(errors.consentGdpr, "required");
  });

  test("odkaz ve jméně neprojde", () => {
    const { errors } = validateReservation({ ...platny, firstName: "http://spam.ru" });
    assert.equal(errors.firstName, "invalid");
  });

  test("jednorázová schránka neprojde", () => {
    const { errors } = validateReservation({ ...platny, email: "a@mailinator.com" });
    assert.equal(errors.email, "disposable");
  });

  test("diakritika a spojovník ve jméně projdou", () => {
    const { valid } = validateReservation({
      ...platny, firstName: "Anna-Marie", lastName: "Dvořáková",
    });
    assert.ok(valid);
  });
});

describe("token vstupenky", () => {
  const ticketId = "3f8a1c2e-4b5d-4e6f-8a9b-0c1d2e3f4a5b";

  test("podepsaný token se ověří a vrátí obsah", () => {
    const token = signTicket({ eventRef: 7, ticketId });
    const data = verifyTicket(token);
    assert.equal(data.eventRef, 7);
    assert.equal(data.ticketId, ticketId);
  });

  test("token neobsahuje osobní údaje ani čitelné id", () => {
    const token = signTicket({ eventRef: 7, ticketId });
    assert.ok(!token.includes(ticketId));
    assert.ok(!/novak|jan|@/i.test(token));
    // 111 znaků se v pohodě vejde do QR i při vysoké korekci chyb.
    assert.ok(token.length < 130, `token je moc dlouhý: ${token.length}`);
  });

  test("pozměněný token se odmítne", () => {
    const token = signTicket({ eventRef: 7, ticketId });
    for (let i = 0; i < token.length; i += 17) {
      const znak = token[i] === "A" ? "B" : "A";
      const podvrh = token.slice(0, i) + znak + token.slice(i + 1);
      if (podvrh === token) continue;
      assert.equal(verifyTicket(podvrh), null, `prošel podvrh na pozici ${i}`);
    }
  });

  test("vstupenka vyrobená cizím klíčem se odmítne", () => {
    // Tohle je scénář, který má asymetrický podpis ustát: útočník zná formát
    // tokenu i to, co má být uvnitř, ale nemá náš privátní klíč. Vyrobíme
    // korektně poskládaný token podepsaný jiným klíčem a ten musí propadnout.
    const utocnik = generateKeyPairSync("ed25519");

    const payload = Buffer.alloc(19);
    payload.writeUInt8(1, 0);
    payload.writeUInt16BE(7, 1);
    Buffer.from(ticketId.replaceAll("-", ""), "hex").copy(payload, 3);

    const podvrzenyPodpis = edSign(null, payload, utocnik.privateKey);
    const padelek = Buffer.concat([payload, podvrzenyPodpis]).toString("base64url");

    // Formátem je nerozeznatelný od pravého, jen podpis nesedí.
    assert.equal(padelek.length, signTicket({ eventRef: 7, ticketId }).length);
    assert.equal(verifyTicket(padelek), null, "padělek nesmí projít");
  });

  test("nesmysl místo tokenu spadne na null, ne na výjimku", () => {
    for (const vstup of ["", "abc", "!!!", "a".repeat(500), null, undefined]) {
      assert.equal(verifyTicket(vstup), null);
    }
  });
});

describe("nonce formuláře", () => {
  const eventId = "11111111-2222-3333-4444-555555555555";

  test("čerstvá nonce je odmítnutá jako příliš rychlá", () => {
    const token = issueFormToken(eventId);
    const result = verifyFormToken(token, eventId);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "too_fast");
  });

  test("nonce pro jinou akci neprojde", () => {
    const token = issueFormToken(eventId);
    const result = verifyFormToken(token, "99999999-2222-3333-4444-555555555555");
    assert.equal(result.reason, "wrong_event");
  });

  test("pozměněná nonce neprojde", () => {
    const token = issueFormToken(eventId);
    const [body, mac] = token.split(".");
    assert.equal(verifyFormToken(`${body}x.${mac}`, eventId).reason, "bad_signature");
    assert.equal(verifyFormToken(`${body}.${mac}x`, eventId).reason, "bad_signature");
  });

  test("nonce starší než 30 minut neprojde", () => {
    const puvodni = Date.now;
    const token = issueFormToken(eventId);
    Date.now = () => puvodni() + 31 * 60 * 1000;
    try {
      assert.equal(verifyFormToken(token, eventId).reason, "too_old");
    } finally {
      Date.now = puvodni;
    }
  });

  test("nonce po uplynutí prodlevy projde", () => {
    const puvodni = Date.now;
    const token = issueFormToken(eventId);
    Date.now = () => puvodni() + 5000;
    try {
      assert.equal(verifyFormToken(token, eventId).ok, true);
    } finally {
      Date.now = puvodni;
    }
  });
});
