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

receiptFile?.addEventListener("change", () => showPreview(receiptFile.files?.[0], $("[data-receipt-preview]")));
photoFile?.addEventListener("change", () => showPreview(photoFile.files?.[0], $("[data-photo-preview]")));

const receiptForm = $("[data-receipt-form]");
if (receiptForm) {
  receiptForm.elements.date.value = new Date().toISOString().slice(0,10);
  receiptForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("[data-receipt-status]");
    const file = receiptFile?.files?.[0];
    if (!file) return status(msg, "Maak eerst een foto of kies een bestand.", false);
    const f = new FormData(receiptForm);
    const d = new Date(String(f.get("date")) + "T12:00:00");
    const year = String(d.getFullYear());
    const month = String(d.getMonth()+1).padStart(2,"0");
    try {
      status(msg, "Bon wordt opgeslagen…");
      const pad = await ensureFolder(`Boekhouding/${year}/${month}/Bonnen`);
      const supplier = safePart(f.get("supplier") || "Bon");
      const ext = file.type === "application/pdf" ? "pdf" : "jpg";
      const name = `${stamp(d)}_${supplier}.${ext}`;
      const body = file.type === "application/pdf" ? file : await prepareImage(file);
      await uploadBlob(body, pad, name);
      const meta = {
        datum: f.get("date"), leverancier: f.get("supplier"), bedragInclBtw: f.get("amount"),
        btw: f.get("vat"), betaaldMet: f.get("paidWith"), notitie: f.get("note"),
        bestand: name, opgeslagen: new Date().toISOString()
      };
      await uploadBlob(new Blob([JSON.stringify(meta, null, 2)], {type:"application/json"}), pad, name.replace(/\.[^.]+$/, ".json"));
      status(msg, "Bon opgeslagen in de boekhoudmap.");
      addRecent("Bon · " + supplier, pad);
      receiptFile.value = "";
      $("[data-receipt-preview]").hidden = true;
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

