import { api, me, logout } from "./api.js";

const $ = (s, r = document) => r.querySelector(s);
const user = await me();

if (!user?.email || !user?.paid) {
  location.replace("/account.html");
} else {
  $("[data-app-user]").textContent = user.name || user.email || "Vakento";
}

const logoutButton = $("[data-logout]");
logoutButton?.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Uitloggen…";
  await logout();
  location.replace("/account.html?uitgelogd=1");
});

function onlineState() {
  const el = $("[data-online]");
  if (!el) return;
  el.textContent = navigator.onLine ? "Online" : "Offline";
  el.style.color = navigator.onLine ? "var(--ok)" : "var(--warn)";
}
onlineState();
addEventListener("online", onlineState);
addEventListener("offline", onlineState);

const cameraState = $("[data-camera-state]");
async function cameraPermissionState() {
  try {
    if (!navigator.permissions?.query) return;
    const p = await navigator.permissions.query({ name: "camera" });
    if (cameraState) cameraState.textContent = p.state === "granted" ? "Toestemming gegeven." : p.state === "denied" ? "Camera geblokkeerd in de telefoon/browser." : "Toestemming wordt gevraagd zodra je de camera opent.";
    p.onchange = cameraPermissionState;
  } catch (_) {}
}

async function requestCameraPermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    if (cameraState) cameraState.textContent = "Deze browser kan cameratoestemming niet vooraf aanvragen. Gebruik de cameraknop hieronder.";
    return true;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    stream.getTracks().forEach((track) => track.stop());
    if (cameraState) cameraState.textContent = "Camera toegestaan.";
    return true;
  } catch (err) {
    if (cameraState) cameraState.textContent = "Geen cameratoegang. Kies 'Sta toe' of geef Vakento cameratoegang in de instellingen van je telefoon.";
    return false;
  }
}

$("[data-camera-permission]")?.addEventListener("click", requestCameraPermission);
cameraPermissionState();

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

  return {
    date,
    supplier,
    amount,
    vat: vatRates.length === 1 ? vatRates[0] : "",
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

  const meta = {
    datum: dateValue,
    leverancier: extra.supplier || f.get("supplier") || "",
    bedragInclBtw: extra.amount || f.get("amount") || "",
    btw: extra.vat || f.get("vat") || "",
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
  status(msg, automatic ? "Klaar. Bon gelezen en automatisch opgeslagen." : "Bon opgeslagen in de boekhoudmap.");
  addRecent("Bon · " + supplier, pad);
  return { pad, name, meta };
}

const receiptFile = $("[data-receipt-file]");
const photoFile = $("[data-photo-file]");

$("[data-take-receipt]")?.addEventListener("click", async () => {
  const ok = await requestCameraPermission();
  if (ok) receiptFile?.click();
});
$("[data-take-photo]")?.addEventListener("click", async () => {
  const ok = await requestCameraPermission();
  if (ok) photoFile?.click();
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

