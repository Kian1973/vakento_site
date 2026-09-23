/**
 * Vakento Rompslomp importer (VPS-side)
 *
 * Mount this handler inside the existing Vakento Node server:
 *   import { handleRompslompImport } from "./rompslomp-import.mjs";
 *   if (await handleRompslompImport(req, res, { user })) return;
 *
 * Optional VPS packages for .xls/.xlsx and .zip:
 *   npm i xlsx adm-zip
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const BASE = process.env.VAKENTO_IMPORT_DIR || "/var/lib/vakento/imports";
const MAX_FILE = Number(process.env.VAKENTO_IMPORT_MAX_FILE || 50 * 1024 * 1024);
const MAX_BATCH = Number(process.env.VAKENTO_IMPORT_MAX_BATCH || 250 * 1024 * 1024);
const ALLOWED_EXT = new Set([".csv", ".xls", ".xlsx", ".xml", ".zip", ".pdf"]);

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function safeUserId(user) {
  const id = String(user?.id || user?.user_id || "").replace(/[^a-zA-Z0-9_-]/g, "");
  return id || "";
}

function safeBatch(value) {
  const v = String(value || "");
  if (!/^rompslomp-[0-9]+-[a-z0-9]{4,20}$/i.test(v)) return "";
  return v;
}

function safeName(value) {
  const base = path.basename(String(value || "bestand"));
  return base.replace(/[^a-zA-Z0-9._() -]/g, "_").slice(0, 180) || "bestand";
}

function batchDir(userId, batch) {
  return path.join(BASE, userId, batch);
}

async function readJson(req, limit = 2 * 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) throw new Error("Aanvraag is te groot.");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function writeRawFile(req, target, declaredSize = 0) {
  if (declaredSize > MAX_FILE) throw new Error("Bestand is groter dan 50 MB.");
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_FILE) throw new Error("Bestand is groter dan 50 MB.");
    chunks.push(chunk);
  }
  await fs.writeFile(target, Buffer.concat(chunks), { mode: 0o600 });
  return total;
}

async function listBatch(dir) {
  let names = [];
  try { names = await fs.readdir(dir); } catch { return []; }
  const out = [];
  for (const name of names) {
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const stat = await fs.stat(full).catch(() => null);
    if (stat?.isFile()) out.push({ name, full, bytes: stat.size, ext: path.extname(name).toLowerCase() });
  }
  return out;
}

function splitCsvLine(line, delimiter) {
  const out = [];
  let cur = "";
  let quote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quote && line[i + 1] === '"') { cur += '"'; i++; }
      else quote = !quote;
    } else if (ch === delimiter && !quote) {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

function parseCsvText(text) {
  const clean = String(text || "").replace(/^\uFEFF/, "").replace(/\r/g, "");
  const lines = clean.split("\n").filter((x) => x.trim());
  if (!lines.length) return [];
  const delimiter = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const vals = splitCsvLine(line, delimiter);
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] ?? "");
    return obj;
  });
}

function normalizeHeader(s) {
  return String(s || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function value(row, ...keys) {
  for (const k of keys) {
    const nk = normalizeHeader(k);
    if (row[nk] != null && String(row[nk]).trim() !== "") return String(row[nk]).trim();
  }
  return "";
}

function money(v) {
  let s = String(v ?? "").trim().replace(/\s/g, "").replace(/[€]/g, "");
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function dateIso(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
  if (m) return [m[3], m[2].padStart(2,"0"), m[1].padStart(2,"0")].join("-");
  return s;
}

function classify(headers, filename = "") {
  const h = new Set(headers);
  const f = filename.toLowerCase();
  const has = (...x) => x.some((k) => h.has(normalizeHeader(k)));
  if (/contact|klant|relatie/.test(f) || (has("naam","bedrijfsnaam") && has("email","e-mail","adres"))) return "contacts";
  if (/factu/.test(f) || has("factuurnummer","factuurnr","invoice_number")) return "invoices";
  if (/uitga|inkoop|kosten|bon/.test(f) || (has("leverancier") && has("bedrag","totaal"))) return "expenses";
  if (/uren|time/.test(f) || (has("uren","hours") && has("datum"))) return "hours";
  if (/product|artikel|voorraad/.test(f) || has("artikel","product","eenheid","prijs")) return "products";
  return "unknown";
}

function normalizeContact(row, index) {
  const name = value(row, "naam", "bedrijfsnaam", "bedrijf", "relatie", "contact");
  if (!name) return null;
  return {
    id: "romp-c-" + crypto.createHash("sha1").update(name + "|" + value(row,"email","e-mail") + "|" + index).digest("hex").slice(0,12),
    entityType: value(row,"type")?.toLowerCase().includes("particul") ? "particulier" : "bedrijf",
    type: value(row,"soort","contacttype","type").toLowerCase().includes("lever") ? "leverancier" : "klant",
    name,
    contact: value(row,"contactpersoon","contact_person"),
    email: value(row,"email","e-mail"),
    factuurEmail: value(row,"factuur_email","factuuremail"),
    tel: value(row,"telefoon","telefoonnummer","tel","mobiel"),
    adres: value(row,"adres","straat","straat_huisnummer"),
    postcode: value(row,"postcode"),
    plaats: value(row,"plaats","woonplaats"),
    land: value(row,"land") || "Nederland",
    kvk: value(row,"kvk","kvk_nummer"),
    btw: value(row,"btw","btw_nummer"),
    oin: value(row,"oin"),
    klantnr: value(row,"klantnummer","relatienummer","nummer"),
    betaaltermijn: Number(value(row,"betaaltermijn","betalingstermijn") || 30),
    notitie: value(row,"notitie","opmerking"),
    bron: "rompslomp",
  };
}

function normalizeInvoice(row, index) {
  const nr = value(row,"factuurnummer","factuurnr","nummer","invoice_number");
  const amountIncl = money(value(row,"totaal_incl_btw","totaal","bedrag_incl_btw","bedrag"));
  const vat = money(value(row,"btw_bedrag","btw"));
  const amountEx = money(value(row,"totaal_excl_btw","bedrag_excl_btw")) || Math.max(0, amountIncl - vat);
  if (!nr && !amountIncl && !amountEx) return null;
  const statusRaw = value(row,"status","betaalstatus").toLowerCase();
  const status = /betaald|paid|voldaan/.test(statusRaw) ? "betaald" : "open";
  const rate = Number(value(row,"btw_percentage","btw_tarief","btw_pct")) || (vat && amountEx ? Math.round(vat / amountEx * 100) : 21);
  return {
    id: "romp-f-" + crypto.createHash("sha1").update((nr || index) + "|" + value(row,"datum","factuurdatum")).digest("hex").slice(0,12),
    nr: nr || "ROMP-" + (index + 1),
    klantNaam: value(row,"klant","klantnaam","relatie","debiteur"),
    titel: value(row,"omschrijving","onderwerp","titel") || "Rompslomp factuur",
    bedrag: amountEx || amountIncl,
    regels: [{ tekst: value(row,"omschrijving","titel") || "Rompslomp factuur", bedrag: amountEx || amountIncl, btw: [0,9,21].includes(rate) ? rate : 21 }],
    status,
    dag: dateIso(value(row,"datum","factuurdatum","date")),
    betaaldOp: dateIso(value(row,"betaald_op","betaaldatum")),
    bedragInclBtw: amountIncl,
    bron: "rompslomp",
  };
}

function normalizeExpense(row, index) {
  const gross = money(value(row,"totaal_incl_btw","totaal","bedrag","bedrag_incl_btw"));
  const net = money(value(row,"bedrag_excl_btw","totaal_excl_btw"));
  const vat = money(value(row,"btw_bedrag","btw"));
  const rate = Number(value(row,"btw_percentage","btw_tarief","btw_pct")) || (vat && net ? Math.round(vat / net * 100) : null);
  if (!gross && !net) return null;
  return {
    id: "romp-i-" + crypto.createHash("sha1").update(value(row,"leverancier") + "|" + value(row,"datum") + "|" + gross + "|" + index).digest("hex").slice(0,12),
    dag: dateIso(value(row,"datum","boekdatum","date")),
    leverancier: value(row,"leverancier","crediteur","naam") || "Onbekende leverancier",
    tekst: value(row,"omschrijving","notitie","factuurnummer") || "Rompslomp uitgave",
    bedrag: gross || net,
    bedragInclBtw: gross || (net + vat),
    bedragExclBtw: net || (gross && rate != null ? Math.round((gross / (1 + rate/100))*100)/100 : 0),
    btwBedrag: vat,
    btw: [0,9,21].includes(rate) ? rate : null,
    btwAftrekbaar: null,
    categorie: "",
    status: /open/.test(value(row,"status").toLowerCase()) ? "open" : "betaald",
    bron: "rompslomp",
  };
}

function normalizeHour(row, index) {
  const hours = Number(String(value(row,"uren","aantal_uren","hours") || "0").replace(",", "."));
  if (!hours) return null;
  return {
    id: "romp-u-" + crypto.createHash("sha1").update(value(row,"datum") + "|" + value(row,"klant","klus","project") + "|" + hours + "|" + index).digest("hex").slice(0,12),
    day: dateIso(value(row,"datum","date")),
    uren: hours,
    soort: value(row,"soort","type") || "werk",
    note: value(row,"omschrijving","notitie","activiteit"),
    klantNaam: value(row,"klant","relatie"),
    klusNaam: value(row,"klus","project","opdracht"),
    bron: "rompslomp",
  };
}

function normalizeProduct(row, index) {
  const name = value(row,"artikel","product","naam","omschrijving");
  if (!name) return null;
  return {
    id: "romp-a-" + crypto.createHash("sha1").update(name + "|" + index).digest("hex").slice(0,12),
    naam: name,
    eenheid: value(row,"eenheid","unit") || "st",
    prijs: money(value(row,"prijs","verkoopprijs","bedrag")),
    btw: Number(value(row,"btw","btw_percentage","btw_tarief")) || 21,
    leverancier: value(row,"leverancier"),
    bron: "rompslomp",
  };
}

async function rowsFromFile(file) {
  if (file.ext === ".csv") return parseCsvText(await fs.readFile(file.full, "utf8"));
  if (file.ext === ".xml") {
    const text = await fs.readFile(file.full, "utf8");
    const rows = [];
    const records = text.match(/<(?:row|record|invoice|contact|transaction)[^>]*>[\s\S]*?<\/(?:row|record|invoice|contact|transaction)>/gi) || [];
    for (const rec of records) {
      const obj = {};
      for (const m of rec.matchAll(/<([a-zA-Z0-9_:-]+)[^>]*>([^<]*)<\/\1>/g)) obj[normalizeHeader(m[1])] = m[2].trim();
      if (Object.keys(obj).length) rows.push(obj);
    }
    return rows;
  }
  if (file.ext === ".xls" || file.ext === ".xlsx") {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await fs.readFile(file.full), { type: "buffer", cellDates: false });
      const rows = [];
      for (const sheet of wb.SheetNames) {
        const arr = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: "", raw: false });
        for (const row of arr) {
          const normalized = {};
          for (const [k,v] of Object.entries(row)) normalized[normalizeHeader(k)] = String(v ?? "");
          rows.push(normalized);
        }
      }
      return rows;
    } catch {
      return [];
    }
  }
  return [];
}

async function collectData(dir) {
  const files = await listBatch(dir);
  const data = { contacts: [], invoices: [], expenses: [], hours: [], products: [], documents: [] };
  const warnings = [];
  for (const file of files) {
    if (file.ext === ".pdf") { data.documents.push({ name:file.name, bytes:file.bytes, type:"pdf" }); continue; }
    if (file.ext === ".zip") {
      data.documents.push({ name:file.name, bytes:file.bytes, type:"zip" });
      warnings.push(file.name + ": ZIP wordt als origineel archief bewaard; losse bestanden in ZIP worden in deze eerste versie niet automatisch uitgepakt.");
      continue;
    }
    const rows = await rowsFromFile(file);
    if (!rows.length) {
      warnings.push(file.name + ": geen leesbare rijen gevonden. Voor oude .xls/.xlsx bestanden moet op de VPS het npm-pakket 'xlsx' zijn geïnstalleerd.");
      continue;
    }
    const kind = classify(Object.keys(rows[0] || {}), file.name);
    if (kind === "unknown") {
      warnings.push(file.name + ": bestandstype niet automatisch herkend.");
      continue;
    }
    rows.forEach((row, i) => {
      const item = kind === "contacts" ? normalizeContact(row,i)
        : kind === "invoices" ? normalizeInvoice(row,i)
        : kind === "expenses" ? normalizeExpense(row,i)
        : kind === "hours" ? normalizeHour(row,i)
        : kind === "products" ? normalizeProduct(row,i)
        : null;
      if (item) data[kind].push(item);
    });
  }
  return { files, data, warnings };
}

function dedupe(items, keyFn) {
  const seen = new Set();
  const out = [];
  let duplicates = 0;
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key); out.push(item);
  }
  return { items: out, duplicates };
}

async function analyse(dir) {
  const { files, data, warnings } = await collectData(dir);
  const dc = dedupe(data.contacts, x => (x.klantnr || "") + "|" + x.name.toLowerCase() + "|" + (x.email || "").toLowerCase());
  const df = dedupe(data.invoices, x => String(x.nr || "").toLowerCase());
  const de = dedupe(data.expenses, x => [x.dag,x.leverancier,x.bedragInclBtw].join("|").toLowerCase());
  const dh = dedupe(data.hours, x => [x.day,x.uren,x.klantNaam,x.klusNaam,x.note].join("|").toLowerCase());
  const dp = dedupe(data.products, x => x.naam.toLowerCase());
  return {
    summary: {
      contacts: dc.items.length,
      invoices: df.items.length,
      expenses: de.items.length,
      hours: dh.items.length,
      products: dp.items.length,
      documents: data.documents.length,
      files: files.length,
    },
    duplicates: {
      contacts: dc.duplicates,
      invoices: df.duplicates,
      expenses: de.duplicates,
      hours: dh.duplicates,
      products: dp.duplicates,
    },
    warnings,
    normalized: {
      contacts: dc.items,
      invoices: df.items,
      expenses: de.items,
      hours: dh.items,
      products: dp.items,
      documents: data.documents,
    },
  };
}

async function archiveOriginals(dir) {
  const archive = path.join(dir, "archive");
  await fs.mkdir(archive, { recursive: true, mode: 0o700 });
  const files = await listBatch(dir);
  for (const f of files) await fs.copyFile(f.full, path.join(archive, f.name));
}

export async function handleRompslompImport(req, res, ctx = {}) {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith("/api/import/rompslomp/")) return false;

  const userId = safeUserId(ctx.user || ctx.session?.user);
  if (!userId) { send(res, 401, { error:"Niet ingelogd." }); return true; }

  try {
    if (req.method === "GET" && url.pathname === "/api/import/rompslomp/status") {
      send(res, 200, { ok:true, service:"rompslomp-import", maxFileBytes:MAX_FILE, maxBatchBytes:MAX_BATCH });
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/import/rompslomp/upload") {
      const batch = safeBatch(url.searchParams.get("batch"));
      const name = safeName(url.searchParams.get("naam"));
      const ext = path.extname(name).toLowerCase();
      if (!batch || !ALLOWED_EXT.has(ext)) { send(res, 400, { error:"Ongeldig bestand of importnummer." }); return true; }

      const dir = batchDir(userId, batch);
      await fs.mkdir(dir, { recursive:true, mode:0o700 });
      const existing = await listBatch(dir);
      const used = existing.reduce((n,x)=>n+x.bytes,0);
      const declared = Number(req.headers["x-file-size"] || 0);
      if (used + declared > MAX_BATCH) { send(res, 413, { error:"Deze import is groter dan 250 MB." }); return true; }

      const target = path.join(dir, name);
      const bytes = await writeRawFile(req, target, declared);
      send(res, 200, { ok:true, batch, name, bytes });
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/import/rompslomp/analyse") {
      const body = await readJson(req);
      const batch = safeBatch(body.batch);
      if (!batch) { send(res, 400, { error:"Ongeldig importnummer." }); return true; }
      const dir = batchDir(userId, batch);
      const result = await analyse(dir);
      await fs.writeFile(path.join(dir, ".analysis.json"), JSON.stringify(result), { mode:0o600 });
      send(res, 200, { batch, summary:result.summary, duplicates:result.duplicates, warnings:result.warnings });
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/import/rompslomp/import") {
      const body = await readJson(req);
      const batch = safeBatch(body.batch);
      if (!batch || body.overwriteExisting !== false) {
        send(res, 400, { error:"Veilige import vereist overwriteExisting=false." }); return true;
      }
      const dir = batchDir(userId, batch);
      let result;
      try { result = JSON.parse(await fs.readFile(path.join(dir, ".analysis.json"), "utf8")); }
      catch { result = await analyse(dir); }

      if (body.archiveOriginals !== false) await archiveOriginals(dir);

      const audit = {
        importedAt:new Date().toISOString(),
        userId,
        batch,
        summary:result.summary,
        mode:"merge-no-overwrite",
      };
      await fs.writeFile(path.join(dir, ".imported.json"), JSON.stringify(audit, null, 2), { mode:0o600 });

      send(res, 200, {
        ok:true,
        batch,
        message:"Analyse voltooid. De gegevens zijn veilig klaargezet om in Vakento samen te voegen.",
        summary:result.summary,
        data:result.normalized,
      });
      return true;
    }

    send(res, 404, { error:"Importactie niet gevonden." });
    return true;
  } catch (err) {
    send(res, 500, { error:err?.message || "Rompslomp-import is mislukt." });
    return true;
  }
}
