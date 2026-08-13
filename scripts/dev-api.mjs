#!/usr/bin/env node
// Malý server, který lokálně obslouží složku /api stejně jako Vercel.
//
// `vercel dev` by uměl totéž, ale chce přihlášení do účtu. Tohle je pár řádků
// a stačí to: mapuje adresu na soubor, doplní dynamické části cesty do
// req.query a zavolá výchozí export.
//
// Spuštění:  npm run dev:api    (vite si na něj přesměruje /api)

import { createServer } from "node:http";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = join(ROOT, "api");
const PORT = Number(process.env.DEV_API_PORT ?? 3001);

/** Projde api/ a udělá ze souborů seznam cest s dynamickými částmi. */
function collectRoutes(dir = API_DIR) {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "_lib") continue;
      routes.push(...collectRoutes(full));
      continue;
    }
    if (!entry.endsWith(".js")) continue;

    const url = "/api/" + relative(API_DIR, full).replace(/\.js$/, "").replaceAll("\\", "/");
    const params = [];
    // [slug] chytá jeden úsek cesty, [...path] všechny zbývající. Vercel to
    // druhé předává jako pole úseků, tady to musí být stejné, jinak by se
    // kód choval lokálně jinak než na nasazení.
    const pattern = url.replace(/\[(\.\.\.)?([^\]]+)\]/g, (_, spread, name) => {
      params.push({ name, spread: Boolean(spread) });
      return spread ? "(.*)" : "([^/]+)";
    });
    routes.push({ file: full, params, regex: new RegExp(`^${pattern}$`) });
  }
  // Statické cesty mají přednost před dynamickými a catch-all jde nakonec,
  // jinak by "(.*)" spolklo i to, co patří konkrétnějšímu souboru.
  const vaha = (r) => (r.params.some((p) => p.spread) ? 2 : r.params.length ? 1 : 0);
  return routes.sort((a, b) => vaha(a) - vaha(b));
}

const routes = collectRoutes();
console.log("Obsluhované cesty:");
for (const r of routes) console.log("  " + r.regex.source.replace(/[\^$]/g, ""));

function readJsonBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const match = routes.map((r) => ({ r, m: url.pathname.match(r.regex) })).find((x) => x.m);

  if (!match) {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "not_found" }));
  }

  const query = Object.fromEntries(url.searchParams);
  match.r.params.forEach(({ name, spread }, i) => {
    const raw = decodeURIComponent(match.m[i + 1] ?? "");
    query[name] = spread ? raw.split("/").filter(Boolean) : raw;
  });

  req.query = query;
  if (req.method !== "GET" && req.method !== "HEAD") req.body = await readJsonBody(req);

  // Doplníme to z expresu, co serverové funkce používají.
  res.status = (code) => { res.statusCode = code; return res; };
  res.send = (payload) => { res.end(payload); return res; };

  try {
    // Cache busting, ať se při vývoji projeví změny v souborech.
    const mod = await import(`${pathToFileURL(match.r.file).href}?t=${Date.now()}`);
    await mod.default(req, res);
  } catch (err) {
    console.error(`[${req.method} ${url.pathname}]`, err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "server_error", detail: err.message }));
    }
  }
});

server.listen(PORT, () => console.log(`\nAPI běží na http://localhost:${PORT}\n`));
