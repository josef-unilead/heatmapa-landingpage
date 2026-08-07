// Stránka akce s vloženými OG značkami.
//
// Web je jednostránková aplikace: server posílá pro každou adresu tentýž
// index.html a obsah dokreslí až JavaScript. Jenže crawler Facebooku,
// WhatsAppu, Messengeru ani Slacku JavaScript nespouští. Sdílený odkaz na
// akci by proto ukazoval obecný titulek celého webu a žádný obrázek.
//
// Tahle funkce vezme vybuilděný index.html, doplní do hlavičky značky
// konkrétní akce a pošle ho dál. Prohlížeč pak stránku normálně nahydratuje,
// crawler si vystačí s hlavičkou.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../_lib/db.js";
import { withErrorHandling } from "../_lib/http.js";

let shellCache;

function shell() {
  if (shellCache) return shellCache;
  // Na Vercelu leží statický výstup vedle funkce v kořeni nasazení.
  const candidates = [
    join(process.cwd(), "dist", "index.html"),
    join(process.cwd(), "index.html"),
  ];
  for (const path of candidates) {
    try {
      shellCache = readFileSync(path, "utf8");
      return shellCache;
    } catch {
      // zkusíme další
    }
  }
  throw new Error("index.html se nepodařilo najít");
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function metaFor(event, siteUrl) {
  const url = `${siteUrl}/akce/${event.slug}`;
  const image = event.cover_url?.startsWith("http")
    ? event.cover_url
    : `${siteUrl}${event.cover_url ?? "/logo.svg"}`;
  const title = `${event.title} | heatmapa`;
  const description =
    event.perex ?? `${event.venue_name}, ${event.venue_address}`;

  return `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:locale" content="cs_CZ" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <link rel="canonical" href="${esc(url)}" />`;
}

async function handler(req, res) {
  const { slug } = req.query;
  const siteUrl = (process.env.PUBLIC_SITE_URL || `https://${req.headers.host}`).replace(/\/$/, "");

  const { data: event } = await db()
    .from("events")
    .select("slug, title, perex, cover_url, venue_name, venue_address")
    .eq("slug", String(slug ?? ""))
    .eq("is_published", true)
    .maybeSingle();

  let html = shell();

  if (event) {
    // Původní titulek a OG značky celého webu se vyhodí, ať v hlavičce
    // nezůstanou dvě sady a crawler si nevybral tu špatnou.
    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\s+(?:name|property)="(?:description|og:[^"]*|twitter:[^"]*)"[^>]*>/gi, "")
      .replace(/<link\s+rel="canonical"[^>]*>/i, "")
      .replace("</head>", `${metaFor(event, siteUrl)}\n</head>`);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Krátká cache na okraji: crawlery chodí opakovaně, ale změna názvu akce
  // v administraci se má projevit rychle.
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=600");
  res.status(event ? 200 : 404).send(html);
}

export default withErrorHandling(handler);
