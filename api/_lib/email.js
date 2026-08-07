// Odesílání e-mailů přes Resend a jejich šablony.
//
// Šablony jsou psané tabulkovým layoutem s vloženými styly. Není to hezký
// kód, ale je to jediné, co spolehlivě vykreslí Outlook, Seznam i Gmail.
// Pozadí je světlé schválně: QR musí být černý na bílém, jinak ho část
// čteček nepřečte, a tmavá karta kolem bílého čtverce vypadá rozbitě.

import { Resend } from "resend";
import { formatEventDateTime } from "../../src/lib/ticketing/format.js";

let resendClient;

function resend() {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Chybí RESEND_API_KEY");
  resendClient = new Resend(key);
  return resendClient;
}

const ORANGE = "#FF8A00";

/** Uvozovky a špičaté závorky v datech od uživatele nesmí rozbít HTML. */
function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout({ preheader, heading, body }) {
  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#f2f2f4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f4;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <tr><td style="background:#000000;padding:22px 28px;">
      <span style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-0.4px;">heatmapa</span>
    </td></tr>
    <tr><td style="padding:32px 28px 36px;">
      <h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;color:#111111;font-weight:700;">${esc(heading)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:0 28px 28px;">
      <p style="margin:0;font-size:11px;line-height:1.6;color:#9a9aa0;">
        heatmapa s.r.o. Tenhle e-mail ti přišel, protože ses přihlásil na akci.
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0;">
<tr><td style="background:${ORANGE};border-radius:999px;">
  <a href="${esc(href)}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:600;color:#000000;text-decoration:none;">${esc(label)}</a>
</td></tr></table>`;
}

const P = 'style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#333333;"';
const SMALL = 'style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#777777;word-break:break-all;"';

// ---------------------------------------------------------------------------
// Texty
// ---------------------------------------------------------------------------
const COPY = {
  cs: {
    confirmSubject: (title) => `Potvrď svou rezervaci: ${title}`,
    confirmPre: "Ještě jeden krok a místo je tvoje.",
    confirmHeading: "Potvrď svou rezervaci",
    confirmLead: (name) => `Ahoj ${name}, díky za zájem. Zbývá poslední krok.`,
    confirmAction: "Potvrdit rezervaci",
    confirmValidity: "Odkaz platí 30 minut. Když ti vyprší, vyplň formulář znovu.",
    confirmFallback: "Nefunguje tlačítko? Zkopíruj si tenhle odkaz do prohlížeče:",
    confirmIgnore: "Pokud o rezervaci nestojíš, nemusíš dělat nic.",

    ticketSubject: (title) => `Tvoje vstupenka: ${title}`,
    ticketPre: "Máš potvrzené místo. Vstupenku ukaž u vchodu.",
    ticketHeading: "Máš potvrzené místo",
    ticketLead: "U vchodu stačí ukázat tenhle QR kód.",
    ticketOpen: "Otevřít vstupenku v prohlížeči",
    ticketNonTransfer:
      "Vstupenka je nepřenosná a platí pro jednu osobu. U vchodu ji přiřadíme ke jménu, na které je vystavená.",
    ticketOffline:
      "Doporučujeme si vstupenku otevřít v prohlížeči už teď. Zůstane ti dostupná, i kdyby na místě nechytal signál.",
    ticketCancel: "Nemůžeš dorazit? Zruš rezervaci a uvolni místo dalším:",
    labelName: "Jméno",
    labelWhen: "Kdy",
    labelWhere: "Kde",
  },
  en: {
    confirmSubject: (title) => `Confirm your spot: ${title}`,
    confirmPre: "One more step and your spot is reserved.",
    confirmHeading: "Confirm your spot",
    confirmLead: (name) => `Hi ${name}, thanks for signing up. One step left.`,
    confirmAction: "Confirm my spot",
    confirmValidity: "The link is valid for 30 minutes. If it expires, just fill in the form again.",
    confirmFallback: "Button not working? Copy this link into your browser:",
    confirmIgnore: "If you did not sign up, you can safely ignore this email.",

    ticketSubject: (title) => `Your ticket: ${title}`,
    ticketPre: "Your spot is confirmed. Show this ticket at the door.",
    ticketHeading: "Your spot is confirmed",
    ticketLead: "Just show this QR code at the door.",
    ticketOpen: "Open ticket in browser",
    ticketNonTransfer:
      "This ticket is non transferable and admits one person. At the door we match it to the name it was issued to.",
    ticketOffline:
      "We recommend opening the ticket in your browser now. It stays available even without signal at the venue.",
    ticketCancel: "Cannot make it? Cancel your spot so someone else can take it:",
    labelName: "Name",
    labelWhen: "When",
    labelWhere: "Where",
  },
};

const pick = (lang) => COPY[lang] || COPY.cs;

function from() {
  return process.env.EMAIL_FROM || "heatmapa <vstupenky@heatmapa.com>";
}

// ---------------------------------------------------------------------------
// Potvrzovací e-mail
// ---------------------------------------------------------------------------
export async function sendConfirmationEmail({ to, lang = "cs", firstName, event, confirmUrl }) {
  const t = pick(lang);

  const html = layout({
    preheader: t.confirmPre,
    heading: t.confirmHeading,
    body: `
      <p ${P}>${esc(t.confirmLead(firstName))}</p>
      <p ${P}><strong>${esc(event.title)}</strong><br>${esc(formatEventDateTime(event.starts_at, lang))}<br>${esc(event.venue_name)}</p>
      ${button(confirmUrl, t.confirmAction)}
      <p ${P}>${esc(t.confirmValidity)}</p>
      <p ${SMALL}>${esc(t.confirmFallback)}</p>
      <p ${SMALL}><a href="${esc(confirmUrl)}" style="color:#666;">${esc(confirmUrl)}</a></p>
      <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#999;">${esc(t.confirmIgnore)}</p>`,
  });

  const text = [
    t.confirmLead(firstName),
    "",
    event.title,
    formatEventDateTime(event.starts_at, lang),
    event.venue_name,
    "",
    t.confirmAction + ":",
    confirmUrl,
    "",
    t.confirmValidity,
    t.confirmIgnore,
  ].join("\n");

  return send({ to, subject: t.confirmSubject(event.title), html, text });
}

// ---------------------------------------------------------------------------
// E-mail se vstupenkou
//
// QR jde jako vložená příloha (cid), protože data URI Gmail zahazuje.
// Odkaz na webovou vstupenku je povinný: část klientů obrázky nezobrazí
// vůbec a bez něj by takový člověk zůstal u vchodu s prázdnou.
// ---------------------------------------------------------------------------
export async function sendTicketEmail({
  to, lang = "cs", firstName, lastName, event, ticketUrl, cancelUrl, qrPng,
}) {
  const t = pick(lang);
  const detail = (label, value) =>
    `<tr><td style="padding:6px 0;font-size:13px;color:#8a8a90;width:64px;">${esc(label)}</td>
         <td style="padding:6px 0;font-size:14px;color:#111;font-weight:600;">${value}</td></tr>`;

  const html = layout({
    preheader: t.ticketPre,
    heading: t.ticketHeading,
    body: `
      <p ${P}>${esc(t.ticketLead)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 22px;">
        ${detail(t.labelName, esc(`${firstName} ${lastName}`))}
        ${detail(t.labelWhen, esc(formatEventDateTime(event.starts_at, lang)))}
        ${detail(t.labelWhere, `${esc(event.venue_name)}<br><span style="font-weight:400;color:#666;">${esc(event.venue_address)}</span>`)}
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
        <tr><td align="center" style="background:#ffffff;border:1px solid #e6e6ea;border-radius:16px;padding:20px;">
          <img src="cid:ticket-qr" width="240" height="240" alt="QR kód vstupenky"
               style="display:block;width:240px;height:240px;background:#fff;">
        </td></tr>
      </table>
      ${button(ticketUrl, t.ticketOpen)}
      <p ${P}>${esc(t.ticketOffline)}</p>
      <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#777;">${esc(t.ticketNonTransfer)}</p>
      <p ${SMALL}>${esc(t.ticketCancel)}</p>
      <p ${SMALL}><a href="${esc(cancelUrl)}" style="color:#666;">${esc(cancelUrl)}</a></p>`,
  });

  const text = [
    t.ticketHeading,
    "",
    `${t.labelName}: ${firstName} ${lastName}`,
    `${t.labelWhen}: ${formatEventDateTime(event.starts_at, lang)}`,
    `${t.labelWhere}: ${event.venue_name}, ${event.venue_address}`,
    "",
    `${t.ticketOpen}: ${ticketUrl}`,
    "",
    t.ticketNonTransfer,
    "",
    `${t.ticketCancel} ${cancelUrl}`,
  ].join("\n");

  return send({
    to,
    subject: t.ticketSubject(event.title),
    html,
    text,
    attachments: [
      {
        filename: "vstupenka-qr.png",
        content: qrPng,
        contentType: "image/png",
        contentId: "ticket-qr",
      },
    ],
  });
}

async function send({ to, subject, html, text, attachments }) {
  const { data, error } = await resend().emails.send({
    from: from(),
    to: [to],
    subject,
    html,
    text,
    ...(attachments ? { attachments } : {}),
  });
  if (error) throw new Error(`Resend odmítl e-mail: ${error.message || JSON.stringify(error)}`);
  return data;
}
