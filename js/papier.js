import { euro, klant } from "./store.js?v=open1";
import { api } from "./api.js";

export function papierVan(data) {
  const p = data.papier || {};
  return {
    adres: p.adres || "",
    postcode: p.postcode || "",
    plaats: p.plaats || data.place || "",
    kvk: p.kvk || "",
    btw: p.btw || "",
    iban: p.iban || "",
    tel: p.tel || "",
    mail: p.mail || "",
    voet: p.voet || "Prijzen excl. btw. Offerte 30 dagen geldig.",
    logo: p.logo || "",
  };
}

export function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Bestand niet te lezen"));
    r.readAsDataURL(file);
  });
}

export function compressLogo(file) {
  if (!file) return Promise.resolve("");
  if (file.type === "image/svg+xml" || file.size < 90000) return readFile(file);
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement("canvas");
      const scale = Math.min(1, 520 / img.width, 220 / img.height);
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      readFile(file).then(resolve);
    };
    img.src = url;
  });
}

function kop(data) {
  const p = papierVan(data);
  const logo = p.logo
    ? `<img class="brief-logo" src="${p.logo}" alt="${esc(data.firm)}">`
    : `<div class="brief-mark">${esc((data.firm || "V").slice(0, 1))}</div>`;
  const regels = [p.adres, [p.postcode, p.plaats].filter(Boolean).join(" "), p.tel, p.mail].filter(Boolean);
  return `
    <header class="brief-kop">
      <div class="brief-merk">${logo}</div>
      <div class="brief-zaak">
        <p class="brief-naam">${esc(data.firm)}</p>
        ${regels.map((r) => `<p>${esc(r)}</p>`).join("")}
      </div>
    </header>`;
}

function voet(data) {
  const p = papierVan(data);
  const bits = [
    p.kvk ? "KvK " + p.kvk : "",
    p.btw ? "btw " + p.btw : "",
    p.iban ? "IBAN " + p.iban : "",
  ].filter(Boolean);
  return `
    <footer class="brief-voet">
      <p>${esc(p.voet)}</p>
      ${bits.length ? `<p>${esc(bits.join(" · "))}</p>` : ""}
    </footer>`;
}

function regelsTabel(regels) {
  const normalized = (regels || []).map((r) => ({
    ...r,
    bedrag: Number(r.bedrag || 0),
    btw: [0, 9, 21].includes(Number(r.btw)) ? Number(r.btw) : 21,
  }));

  const rows = normalized
    .map(
      (r) =>
        `<tr><td>${esc(r.tekst)}${r.extra ? `<br><small>${esc(r.extra)}</small>` : ""}${r.aantal && r.stukprijs != null ? `<br><small>${esc(r.aantal)} ${esc(r.eenheid || "st")} × ${esc(euro(r.stukprijs))} · ${r.btw}% btw</small>` : `<br><small>${r.btw}% btw</small>`}</td><td class="num">${esc(euro(r.bedrag))}</td></tr>`
    )
    .join("");

  const excl = normalized.reduce((sum, r) => sum + r.bedrag, 0);
  const btw9Basis = normalized.filter((r) => r.btw === 9).reduce((sum, r) => sum + r.bedrag, 0);
  const btw21Basis = normalized.filter((r) => r.btw === 21).reduce((sum, r) => sum + r.bedrag, 0);
  const btw9 = btw9Basis * 0.09;
  const btw21 = btw21Basis * 0.21;
  const totaal = excl + btw9 + btw21;

  return `
    <table class="brief-tabel">
      <thead><tr><th>Omschrijving</th><th>Bedrag</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td>Totaal excl. btw</td><td class="num">${esc(euro(excl))}</td></tr>
        ${btw9Basis ? `<tr><td>btw 9% over ${esc(euro(btw9Basis))}</td><td class="num">${esc(euro(btw9))}</td></tr>` : ""}
        ${btw21Basis ? `<tr><td>btw 21% over ${esc(euro(btw21Basis))}</td><td class="num">${esc(euro(btw21))}</td></tr>` : ""}
        <tr class="totaal"><td>Totaal incl. btw</td><td class="num">${esc(euro(totaal))}</td></tr>
      </tfoot>
    </table>`;
}

const SHEET_CSS = `
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #d8d0c2; color: #1b1610; font-family: Outfit, Segoe UI, sans-serif; }
.sheet {
  width: 210mm; min-height: 297mm; margin: 12px auto; padding: 16mm 18mm 18mm;
  background: #f7f1e6; box-shadow: 0 8px 28px rgba(27,22,16,.18);
}
.brief-kop { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start;
  padding-bottom: 14px; border-bottom: 3px solid #a33b1d; }
.brief-logo { max-height: 78px; max-width: 240px; object-fit: contain; }
.brief-mark { width: 56px; height: 56px; border-radius: 10px; background: #a33b1d; color: #fff8f2;
  display: grid; place-items: center; font-family: Fraunces, Georgia, serif; font-size: 1.8rem; }
.brief-zaak { text-align: right; font-size: 13px; color: #5c5348; }
.brief-naam { font-family: Fraunces, Georgia, serif; font-size: 22px; color: #1b1610; margin: 0 0 6px; }
.brief-meta { display: flex; justify-content: space-between; gap: 24px; margin: 22px 0; }
.brief-meta h1 { font-family: Fraunces, Georgia, serif; font-size: 28px; margin: 0 0 6px; letter-spacing: -0.03em; }
.kicker { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #a33b1d; font-weight: 600; margin: 0; }
.brief-tabel { width: 100%; border-collapse: collapse; margin-top: 8px; }
.brief-tabel th, .brief-tabel td { text-align: left; padding: 8px 0; border-bottom: 1px solid rgba(27,22,16,.12); font-size: 14px; }
.brief-tabel .num { text-align: right; font-variant-numeric: tabular-nums; }
.brief-tabel tfoot td { border-bottom: 0; padding-top: 10px; }
.brief-tabel tr.totaal td { font-weight: 700; font-size: 16px; border-top: 2px solid #24312b; }
.brief-voet { margin-top: 36px; padding-top: 12px; border-top: 1px solid rgba(27,22,16,.12); font-size: 12px; color: #5c5348; }
.no-print { margin: 12px auto; width: 210mm; display: flex; gap: 8px; }
button { font: inherit; border: 0; border-radius: 999px; padding: 10px 18px; background: #a33b1d; color: #fff8f2; cursor: pointer; }
@media print {
  body { background: #fff; }
  .sheet { margin: 0; box-shadow: none; width: auto; min-height: auto; }
  .no-print { display: none; }
}
`;

function blad(data, binnen) {
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Papier</title>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Outfit:wght@400;600&display=swap" rel="stylesheet">
    <style>${SHEET_CSS}</style></head><body>
    <div class="no-print"><button onclick="print()">Print / pdf</button></div>
    <article class="sheet">${kop(data)}${binnen}${voet(data)}</article>
    </body></html>`;
}

export function htmlOfferte(data, o) {
  const c = klant(data, o.klant);
  const binnen = `
    <div class="brief-meta">
      <div>
        <p class="kicker">Offerte</p>
        <h1>${esc(o.nr)}</h1>
        <p>${esc(o.titel)}</p>
        ${o.datum ? `<p><small>Offertedatum: ${esc(o.datum)}${o.geldigTot ? ` · Geldig tot: ${esc(o.geldigTot)}` : ""}</small></p>` : ""}
      </div>
      <div>
        <p><strong>${esc(c?.name)}</strong><br>${esc(c?.contact || "")}<br>${esc(c?.plaats || "")}<br>${esc(c?.tel || "")}</p>
      </div>
    </div>
    ${o.intro ? `<p style="margin:0 0 18px;white-space:pre-line">${esc(o.intro)}</p>` : ""}
    ${regelsTabel(o.regels)}
    ${o.opmerkingen ? `<div style="margin-top:18px"><strong>Opmerkingen en afspraken</strong><p style="white-space:pre-line">${esc(o.opmerkingen)}</p></div>` : ""}
    ${o.risico ? `<p style="margin-top:18px">${esc(o.risico)}</p>` : ""}`;
  return blad(data, binnen);
}

export function htmlFactuur(data, f) {
  const c = klant(data, f.klant);
  const regels = (f.regels && f.regels.length) ? f.regels : [{ tekst: f.titel, bedrag: f.bedrag, btw: f.btw || 21 }];
  const binnen = `
    <div class="brief-meta">
      <div>
        <p class="kicker">Factuur</p>
        <h1>${esc(f.nr)}</h1>
        <p>Datum ${esc(f.dag || "")}</p>
      </div>
      <div>
        <p class="kicker">Aan</p>
        <p><strong>${esc(c?.name)}</strong><br>${esc(c?.plaats || "")}</p>
      </div>
    </div>
    ${regelsTabel(regels)}`;
  return blad(data, binnen);
}

export function htmlDoc(data, o, soort) {
  const c = klant(data, o.klant);
  const titel = soort === "pakbon" ? "Pakbon" : "Opdrachtbevestiging";
  const binnen = `
    <div class="brief-meta">
      <div>
        <p class="kicker">${titel}</p>
        <h1>${esc(o.nr)}</h1>
        <p>${esc(o.titel)}</p>
      </div>
      <div>
        <p class="kicker">Aan</p>
        <p><strong>${esc(c?.name)}</strong><br>${esc(c?.plaats || "")}</p>
      </div>
    </div>
    ${regelsTabel(o.regels)}`;
  return blad(data, binnen);
}

export function openPapier(html) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

export function previewBrief(data) {
  const p = papierVan(data);
  return `
    <div class="brief-preview">
      <div class="brief-kop">
        ${p.logo ? `<img src="${p.logo}" alt="">` : `<span class="brief-mark">${esc((data.firm || "V").slice(0, 1))}</span>`}
        <div>
          <strong>${esc(data.firm)}</strong>
          <p class="muted">${esc([p.adres, p.postcode, p.plaats].filter(Boolean).join(" · ") || "Adres nog leeg")}</p>
        </div>
      </div>
      <p class="muted" style="margin-top:10px">Zo komt je logo op offerte, factuur, bevestiging en pakbon.</p>
    </div>`;
}

export function bindPapier(root, { data, persist, toast }) {
  root.querySelector("form[data-papier]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    data.firm = String(f.get("firm") || data.firm).trim() || data.firm;
    data.papier = {
      ...papierVan(data),
      adres: f.get("adres"),
      postcode: f.get("postcode"),
      plaats: f.get("plaats"),
      kvk: f.get("kvk"),
      btw: f.get("btw"),
      iban: f.get("iban"),
      tel: f.get("tel"),
      mail: f.get("mail"),
      voet: f.get("voet"),
    };
    toast("Briefpapier bewaard");
    persist();
  });
  root.querySelector("[name=logo]")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast("Logo max 4 MB");
      return;
    }
    const form = root.querySelector("form[data-papier]");
    const f = form ? new FormData(form) : null;
    const logo = await compressLogo(file);
    if (f) data.firm = String(f.get("firm") || data.firm).trim() || data.firm;
    data.papier = {
      ...papierVan(data),
      ...(f
        ? {
            adres: f.get("adres"),
            postcode: f.get("postcode"),
            plaats: f.get("plaats"),
            kvk: f.get("kvk"),
            btw: f.get("btw"),
            iban: f.get("iban"),
            tel: f.get("tel"),
            mail: f.get("mail"),
            voet: f.get("voet"),
          }
        : {}),
      logo,
    };
    try {
      await api("/api/cloud", { size: Math.round((logo.length * 3) / 4) });
    } catch (_) {}
    toast("Logo op het briefpapier");
    persist();
  });
  root.querySelector("[data-logo-weg]")?.addEventListener("click", () => {
    data.papier = { ...papierVan(data), logo: "" };
    toast("Logo eraf");
    persist();
  });
}
