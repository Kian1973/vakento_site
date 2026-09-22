import { api, me, logout } from "./api.js";

const $ = (s, r = document) => r.querySelector(s);
const user = await me();

if (!user?.email || !user?.paid) {
  location.replace("/account.html");
} else {
  $("[data-app-user]").textContent = user.name || user.email || "Vakento";
}

const rawPlan = String(
  user.plan || user.pakket || user.package || user.sku || user.subscription || user.abonnement || ""
).toLowerCase();
const isProPlus = rawPlan.includes("proplus") || rawPlan.includes("pro+") || rawPlan.includes("pro-plus") || rawPlan.includes("plus");
const planName = isProPlus ? "Pro+" : "Pro";
$("[data-plan-name]") && ($("[data-plan-name]").textContent = planName);
$("[data-plan-badge]") && ($("[data-plan-badge]").textContent = planName);
$("[data-plan-description]") && ($("[data-plan-description]").textContent = isProPlus
  ? "Alles van Pro plus je eigen beveiligde Vakento-mailbox."
  : "Werk, administratie, bonnen, cloud en slimme ondersteuning vanaf je telefoon.");
document.querySelectorAll("[data-proplus-only]").forEach((el) => { el.hidden = !isProPlus; });
const proPlusNote = $("[data-proplus-note]");
if (proPlusNote) proPlusNote.hidden = !isProPlus;

// Uitloggen loopt via /logout.html, zodat het ook werkt als deze module of PWA-cache problemen heeft.

function onlineState() {
  const el = $("[data-online]");
  if (!el) return;
  el.textContent = navigator.onLine ? "Online" : "Offline";
  el.style.color = navigator.onLine ? "var(--ok)" : "var(--warn)";
}
onlineState();
addEventListener("online", onlineState);
addEventListener("offline", onlineState);

// De mobiele camera wordt rechtstreeks via <input capture> geopend.
// Hierdoor vraagt Vakento niet zelf bij iedere scan opnieuw om cameratoestemming.

function safePart(s) {
  return String(s || "").trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").slice(0, 80) || "Onbekend";
}
function fileExt(name, fallback = "jpg") {
  const m = String(name || "").match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : fallback;
}
function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
function status(el, text, ok = true) {
  if (!el) return;
  el.textContent = text; el.hidden = false; el.className = "app-status " + (ok ? "ok" : "warn");
}
async function listFolder(pad) {
  return api("/api/cloud?pad=" + encodeURIComponent(pad || ""), null, "GET");
}
async function ensureFolder(path) {
  const parts = String(path || "").split("/").filter(Boolean);
  let current = "";
  for (const raw of parts) {
    const part = safePart(raw);
    const listing = await listFolder(current);
    const hit = (listing.items || []).find((x) => x.soort === "map" && String(x.name).toLowerCase() === part.toLowerCase());
    if (hit) current = hit.pad;
    else current = (await api("/api/cloud/map", { pad: current, naam: part })).pad;
  }
  return current;
}
async function uploadBlob(blob, pad, name) {
  if (!navigator.onLine) throw new Error("Geen internet. Probeer opnieuw zodra je online bent.");
  const q = new URLSearchParams({ pad, naam: name });
  const res = await fetch("/api/cloud/upload?" + q, { method: "POST", credentials: "include", body: blob });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Upload mislukt");
  return out;
}

async function readCloudText(pad) {
  const res = await fetch("/api/cloud/bestand?pad=" + encodeURIComponent(pad), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
  });
  if (!res.ok) throw new Error("Bestand kon niet worden gelezen");
  return res.text();
}

function nlMoney(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n.toFixed(2).replace(".", ",") : "";
}

function csvCell(value) {
  const s = String(value ?? "").replace(/"/g, '""');
  return '"' + s + '"';
}

async function buildBookkeeperExport(year, month) {
  const bonPad = await ensureFolder(`Boekhouding/${year}/${month}/Bonnen`);
  const exportPad = await ensureFolder(`Boekhouding/${year}/${month}/Export boekhouder`);
  const listing = await listFolder(bonPad);
  const metas = [];

  for (const item of (listing.items || [])) {
    if (item.soort !== "bestand" || !String(item.name || "").toLowerCase().endsWith(".json")) continue;
    try {
      const raw = await readCloudText(item.pad);
      const meta = JSON.parse(raw);
      metas.push(meta);
    } catch (_) {}
  }

  metas.sort((a, b) => String(a.datum || "").localeCompare(String(b.datum || "")));

  const csvHeaders = [
    "Datum",
    "Leverancier",
    "Omschrijving",
    "Bedrag excl. btw",
    "BTW %",
    "BTW bedrag",
    "Bedrag incl. btw",
    "Betaalwijze",
    "Bonbestand",
    "Notitie"
  ];
  const csvRows = metas.map((m) => [
    m.datum || "",
    m.leverancier || "",
    "Inkoopbon",
    nlMoney(m.bedragExclBtw),
    m.btw || "",
    nlMoney(m.btwBedrag),
    nlMoney(m.bedragInclBtw),
    m.betaaldMet || "",
    m.bestand || "",
    m.notitie || ""
  ]);

  const csv = "\uFEFF" + [csvHeaders, ...csvRows]
    .map((row) => row.map(csvCell).join(";"))
    .join("\r\n");

  const sum = (key) => metas.reduce((t, m) => {
    const n = Number(String(m[key] ?? "").replace(",", "."));
    return t + (Number.isFinite(n) ? n : 0);
  }, 0);

  const escHtml = (v) => String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const rowsHtml = metas.map((m) => `
    <tr>
      <td>${escHtml(m.datum || "")}</td>
      <td>${escHtml(m.leverancier || "")}</td>
      <td class="num">€ ${nlMoney(m.bedragExclBtw) || "0,00"}</td>
      <td class="num">${escHtml(m.btw || "")}%</td>
      <td class="num">€ ${nlMoney(m.btwBedrag) || "0,00"}</td>
      <td class="num">€ ${nlMoney(m.bedragInclBtw) || "0,00"}</td>
      <td>${escHtml(m.betaaldMet || "")}</td>
      <td>${escHtml(m.bestand || "")}</td>
    </tr>`).join("");

  const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Boekhouder overzicht ${year}-${month}</title>
<style>
body{font-family:Arial,sans-serif;margin:28px;color:#222}h1{margin-bottom:4px}p{color:#555}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #ccc;padding:7px;text-align:left}
th{background:#f3f3f3}.num{text-align:right;white-space:nowrap}tfoot td{font-weight:bold;background:#fafafa}
@media print{body{margin:10mm}table{font-size:10px}}
</style></head><body>
<h1>Boekhouder-overzicht ${year}-${month}</h1>
<p>Originele bonnen staan in Boekhouding → ${year} → ${month} → Bonnen.</p>
<table><thead><tr><th>Datum</th><th>Leverancier</th><th>Excl. btw</th><th>BTW %</th><th>BTW</th><th>Incl. btw</th><th>Betaald met</th><th>Bonbestand</th></tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr><td colspan="2">Totaal</td><td class="num">€ ${nlMoney(sum("bedragExclBtw"))}</td><td></td><td class="num">€ ${nlMoney(sum("btwBedrag"))}</td><td class="num">€ ${nlMoney(sum("bedragInclBtw"))}</td><td colspan="2"></td></tr></tfoot>
</table></body></html>`;

  await uploadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), exportPad, `inkoopboek-${year}-${month}.csv`);
  await uploadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), exportPad, `boekhouder-overzicht-${year}-${month}.html`);

  return { exportPad, count: metas.length };
}
async function prepareImage(file) {
  if (!file.type?.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const max = 2200;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .88));
    bmp.close?.();
    return blob || file;
  } catch (_) {
    return file;
  }
}
function showPreview(file, el) {
  if (!file || !el) return;
  el.hidden = false;
  if (file.type?.startsWith("image/")) {
    const url = URL.createObjectURL(file);
    el.innerHTML = `<img src="${url}" alt="Voorbeeld">`;
  } else {
    el.innerHTML = `<div class="file-card"><strong>${file.name}</strong><br><small>Bestand geselecteerd</small></div>`;
  }
}
function addRecent(title, path) {
  const items = JSON.parse(localStorage.getItem("vakento.app.recent") || "[]");
  items.unshift({ title, path, when: new Date().toISOString() });
  localStorage.setItem("vakento.app.recent", JSON.stringify(items.slice(0, 8)));
  renderRecent();
}
function renderRecent() {
  const root = $("[data-recent]");
  if (!root) return;
  const items = JSON.parse(localStorage.getItem("vakento.app.recent") || "[]");
  root.innerHTML = items.length ? items.map((x) => `<div class="app-recent-item"><strong>${x.title}</strong><small>${new Date(x.when).toLocaleString("nl-NL")} · ${x.path}</small></div>`).join("") : '<p class="muted">Nog niets opgeslagen via deze telefoon.</p>';
}
renderRecent();

function parseMoney(raw) {
  const s = String(raw || "").replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  if (!s) return "";
  const comma = s.lastIndexOf(",");
  const dot = s.lastIndexOf(".");
  let normalized = s;
  if (comma > dot) normalized = s.replace(/\./g, "").replace(",", ".");
  else if (dot > comma && comma >= 0) normalized = s.replace(/,/g, "");
  else normalized = s.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

function vatFromInclusive(grossRaw, rateRaw) {
  const gross = Number(parseMoney(grossRaw));
  const rate = Number(rateRaw);
  if (!Number.isFinite(gross) || !Number.isFinite(rate) || rate < 0) {
    return { gross: "", net: "", vatAmount: "" };
  }
  if (rate === 0) {
    return { gross: gross.toFixed(2), net: gross.toFixed(2), vatAmount: "0.00" };
  }
  const net = gross / (1 + rate / 100);
  const vatAmount = gross - net;
  return {
    gross: gross.toFixed(2),
    net: net.toFixed(2),
    vatAmount: vatAmount.toFixed(2)
  };
}

function updateVatPreview() {
  if (!receiptForm) return;
  const gross = receiptForm.elements.amount?.value || "";
  const rate = receiptForm.elements.vat?.value || "";
  const calc = vatFromInclusive(gross, rate);
  const netEl = $("[data-net-amount]");
  const vatEl = $("[data-vat-amount]");
  if (netEl) netEl.textContent = calc.net ? "€ " + calc.net.replace(".", ",") : "—";
  if (vatEl) vatEl.textContent = calc.vatAmount ? "€ " + calc.vatAmount.replace(".", ",") : "—";
}

function amountMatches(line) {
  const hits = String(line || "").match(/\b\d{1,6}(?:[.,]\d{2})\b/g) || [];
  return hits.map(parseMoney).filter(Boolean);
}

function parseReceiptText(text) {
  const clean = String(text || "").replace(/\r/g, "");
  const lines = clean.split("\n").map((x) => x.trim()).filter(Boolean);

  let date = "";
  const datePatterns = [
    /\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.]([0-2]?\d|3[01])\b/,
    /\b([0-2]?\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/
  ];
  for (const line of lines) {
    let m = line.match(datePatterns[0]);
    if (m) { date = m[1] + "-" + String(m[2]).padStart(2,"0") + "-" + String(m[3]).padStart(2,"0"); break; }
    m = line.match(datePatterns[1]);
    if (m) { date = m[3] + "-" + String(m[2]).padStart(2,"0") + "-" + String(m[1]).padStart(2,"0"); break; }
  }

  let supplier = "";
  const rejectSupplier = /(kassa|bon|receipt|factuur|invoice|datum|date|tijd|time|btw|vat|kvk|totaal|total|pin|betaald|bedrag|tel\.?|www\.|@|iban)/i;
  for (const line of lines.slice(0, 10)) {
    const letters = (line.match(/[A-Za-zÀ-ÿ]/g) || []).length;
    if (letters >= 3 && !rejectSupplier.test(line) && !/^\d/.test(line)) {
      supplier = line.replace(/\s{2,}/g, " ").slice(0, 80);
      break;
    }
  }

  const totalWords = /(totaal|total|te betalen|te voldoen|eindtotaal|grand total|amount due|betaling)/i;
  let amount = "";
  for (const line of lines) {
    if (!totalWords.test(line)) continue;
    const vals = amountMatches(line);
    if (vals.length) amount = vals[vals.length - 1];
  }
  if (!amount) {
    const all = lines.flatMap(amountMatches).map(Number).filter(Number.isFinite);
    if (all.length) amount = Math.max(...all).toFixed(2);
  }

  const vatRates = [];
  const vatRows = [];
  for (const line of lines) {
    if (!/(btw|vat|tax)/i.test(line)) continue;
    const rate = line.match(/\b(21|9|0)\s*%?/);
    const vals = amountMatches(line);
    if (rate && !vatRates.includes(rate[1])) vatRates.push(rate[1]);
    if (rate || vals.length) vatRows.push(line.slice(0, 180));
  }

  let paidWith = "";
  if (/(pin|maestro|debit|betaalpas)/i.test(clean)) paidWith = "Pin / betaalpas";
  else if (/(visa|mastercard|creditcard)/i.test(clean)) paidWith = "Creditcard";
  else if (/(contant|cash)/i.test(clean)) paidWith = "Contant";

  const vat = vatRates.length === 1 ? vatRates[0] : "";
  const calc = vatFromInclusive(amount, vat);

  return {
    date,
    supplier,
    amount,
    vat,
    amountExclVat: calc.net,
    vatAmount: calc.vatAmount,
    vatRates,
    vatRows,
    paidWith,
    ocrText: clean
  };
}

async function readReceipt(file, msg) {
  if (!file?.type?.startsWith("image/")) return { ocrText: "", vatRates: [], vatRows: [] };
  if (!window.Tesseract?.recognize) throw new Error("Bonlezer kon niet laden. Controleer je internetverbinding.");
  status(msg, "Bon wordt gelezen…");
  const image = await prepareImage(file);
  const result = await window.Tesseract.recognize(image, "nld+eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && Number.isFinite(m.progress)) {
        status(msg, "Bon lezen… " + Math.round(m.progress * 100) + "%");
      }
    }
  });
  const parsed = parseReceiptText(result?.data?.text || "");
  parsed.ocrConfidence = Math.round(result?.data?.confidence || 0);
  return parsed;
}

function fillReceiptForm(data = {}) {
  if (!receiptForm) return;
  if (data.date) receiptForm.elements.date.value = data.date;
  if (data.supplier) receiptForm.elements.supplier.value = data.supplier;
  if (data.amount) receiptForm.elements.amount.value = String(data.amount).replace(".", ",");
  if (data.vat) receiptForm.elements.vat.value = data.vat;
  if (data.paidWith) receiptForm.elements.paidWith.value = data.paidWith;
  updateVatPreview();
}

async function saveReceipt(file, extra = {}, automatic = false) {
  const msg = $("[data-receipt-status]");
  if (!file) return status(msg, "Maak eerst een foto of kies een bestand.", false);
  const f = new FormData(receiptForm);
  const dateValue = String(extra.date || f.get("date") || new Date().toISOString().slice(0,10));
  const d = new Date(dateValue + "T12:00:00");
  const year = String(d.getFullYear());
  const month = String(d.getMonth()+1).padStart(2,"0");
  status(msg, automatic ? "Gegevens gevonden. Bon wordt automatisch opgeslagen…" : "Bon wordt opgeslagen…");
  const pad = await ensureFolder(`Boekhouding/${year}/${month}/Bonnen`);
  const supplier = safePart(extra.supplier || f.get("supplier") || "Bon");
  const ext = file.type === "application/pdf" ? "pdf" : "jpg";
  const name = `${stamp(d)}_${supplier}.${ext}`;
  const body = file.type === "application/pdf" ? file : await prepareImage(file);
  await uploadBlob(body, pad, name);

  const gross = extra.amount || f.get("amount") || "";
  const rate = extra.vat || f.get("vat") || "";
  const calc = vatFromInclusive(gross, rate);
  const meta = {
    datum: dateValue,
    leverancier: extra.supplier || f.get("supplier") || "",
    bedragInclBtw: calc.gross || gross,
    bedragExclBtw: extra.amountExclVat || calc.net || "",
    btwBedrag: extra.vatAmount || calc.vatAmount || "",
    btw: rate,
    btwIsInbegrepen: true,
    btwTarieven: extra.vatRates || [],
    btwRegels: extra.vatRows || [],
    betaaldMet: extra.paidWith || f.get("paidWith") || "",
    notitie: f.get("note") || "",
    ocrConfidence: extra.ocrConfidence ?? null,
    bestand: name,
    automatischGelezen: Boolean(extra.ocrText),
    opgeslagen: new Date().toISOString()
  };
  await uploadBlob(new Blob([JSON.stringify(meta, null, 2)], {type:"application/json"}), pad, name.replace(/\.[^.]+$/, ".json"));
  if (extra.ocrText) {
    await uploadBlob(new Blob([extra.ocrText], {type:"text/plain;charset=utf-8"}), pad, name.replace(/\.[^.]+$/, ".txt"));
  }

  try {
    await buildBookkeeperExport(year, month);
  } catch (_) {}

  status(msg, automatic
    ? "Klaar. Bon + berekeningen opgeslagen en boekhouder-overzicht bijgewerkt."
    : "Bon opgeslagen en boekhouder-overzicht bijgewerkt.");
  addRecent("Bon · " + supplier, pad);
  return { pad, name, meta };
}

const receiptFile = $("[data-receipt-file]");
const photoFile = $("[data-photo-file]");

$("[data-take-receipt]")?.addEventListener("click", () => {
  receiptFile?.click();
});
$("[data-take-photo]")?.addEventListener("click", () => {
  photoFile?.click();
});

receiptFile?.addEventListener("change", async () => {
  const file = receiptFile.files?.[0];
  showPreview(file, $("[data-receipt-preview]"));
  if (!file) return;
  const msg = $("[data-receipt-status]");
  try {
    const read = await readReceipt(file, msg);
    const today = new Date().toISOString().slice(0,10);
    if (!read.date) read.date = today;
    fillReceiptForm(read);
    await saveReceipt(file, read, true);
  } catch (err) {
    status(msg, (err.message || "Automatisch lezen mislukt.") + " Je kunt de gegevens hieronder controleren en handmatig opslaan.", false);
  }
});
photoFile?.addEventListener("change", () => showPreview(photoFile.files?.[0], $("[data-photo-preview]")));

const receiptForm = $("[data-receipt-form]");
if (receiptForm) {
  receiptForm.elements.date.value = new Date().toISOString().slice(0,10);
  receiptForm.elements.amount?.addEventListener("input", updateVatPreview);
  receiptForm.elements.vat?.addEventListener("change", updateVatPreview);
  updateVatPreview();
  receiptForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("[data-receipt-status]");
    const file = receiptFile?.files?.[0];
    try {
      await saveReceipt(file, {}, false);
    } catch (err) {
      status(msg, err.message || "Opslaan mislukt.", false);
    }
  });
}

const photoForm = $("[data-photo-form]");
photoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("[data-photo-status]");
  const file = photoFile?.files?.[0];
  if (!file) return status(msg, "Maak eerst een werkfoto.", false);
  const f = new FormData(photoForm);
  const job = safePart(f.get("job"));
  const kind = safePart(f.get("kind"));
  const today = new Date().toISOString().slice(0,10);
  try {
    status(msg, "Foto wordt opgeslagen…");
    const pad = await ensureFolder(`Klussen/${job}/Foto's/${today}`);
    const name = `${stamp()}_${kind}.jpg`;
    await uploadBlob(await prepareImage(file), pad, name);
    if (String(f.get("note") || "").trim()) {
      await uploadBlob(new Blob([String(f.get("note"))], {type:"text/plain"}), pad, name.replace(".jpg", ".txt"));
    }
    status(msg, "Werkfoto staat in de juiste klusmap.");
    addRecent("Werkfoto · " + job, pad);
    photoFile.value = "";
    $("[data-photo-preview]").hidden = true;
  } catch (err) {
    status(msg, err.message || "Opslaan mislukt.", false);
  }
});

$("[data-share-books]")?.addEventListener("click", async () => {
  try {
    const pad = await ensureFolder("Boekhouding");
    const out = await api("/api/cloud/delen", { pad });
    await navigator.clipboard?.writeText(out.url);
    alert("Deellink voor de boekhoudmap is gekopieerd.");
  } catch (err) {
    alert(err.message || "Delen mislukt.");
  }
});

