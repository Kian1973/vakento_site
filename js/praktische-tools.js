import { euro } from "./store.js?v=boek1";

const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const money = (value) => new Intl.NumberFormat("nl-NL", { style:"currency", currency:"EUR" }).format(Number(value) || 0);
const csvCell = (value) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
function downloadCsv(rows, filename) {
  const csv = "\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
const roundKm = (n) => Math.round(Number(n) * 10) / 10;

export function viewRitten(data) {
  const ritten = [...(data.ritten || [])].sort((a,b) => String(b.datum).localeCompare(String(a.datum)));
  const totaal = ritten.reduce((sum,rit) => sum + (Number(rit.km)||0),0);
  const vandaag = new Date();
  const datum = [vandaag.getFullYear(),String(vandaag.getMonth()+1).padStart(2,"0"),String(vandaag.getDate()).padStart(2,"0")].join("-");
  return `
    <div class="row"><div><p class="kicker">Ritten</p><h1>Zakelijke kilometers bijhouden</h1>
    <p class="muted">Vul je rit in. Vakento telt je kilometers automatisch op. Je kunt ze als CSV downloaden voor je administratie.</p></div></div>
    <div class="stat"><span class="muted">Totaal geregistreerd</span><b>${roundKm(totaal).toLocaleString("nl-NL")} km</b></div>
    <form class="card stack" data-rit-form style="margin:16px 0">
      <label>Datum<input type="date" name="datum" value="${datum}" required></label>
      <label>Van<input name="van" maxlength="140" placeholder="Bijvoorbeeld: Winterswijk" required></label>
      <label>Naar<input name="naar" maxlength="140" placeholder="Bijvoorbeeld: klant in Aalten" required></label>
      <label>Doel van de rit<input name="doel" maxlength="180" placeholder="Bijvoorbeeld: offerte opnemen" required></label>
      <label>Kilometers (totaal gereden)<input name="km" type="number" inputmode="decimal" step="0.1" min="0.1" max="10000" required></label>
      <button class="btn" type="submit">Rit bewaren</button>
    </form>
    <div class="row"><h2>Mijn ritten</h2><button class="btn btn-ghost" type="button" data-ritten-export ${ritten.length ? "" : "disabled"}>Download CSV</button></div>
    <div class="list">${ritten.length ? ritten.map(rit => `
      <article class="item"><strong>${esc(rit.datum)} · ${roundKm(rit.km).toLocaleString("nl-NL")} km</strong>
        <span>${esc(rit.van)} → ${esc(rit.naar)} · ${esc(rit.doel)}</span>
        <div class="actions"><button class="btn btn-ghost" type="button" data-rit-verwijder="${esc(rit.id)}">Verwijderen</button></div>
      </article>`).join("") : '<p class="muted">Nog geen ritten ingevoerd.</p>'}</div>
    <p class="muted" style="margin-top:16px">Let op: dit is een rittenoverzicht, geen automatische gps-registratie of belastingadvies. Controleer de fiscale regels en bewaar zo nodig aanvullende ritgegevens.</p>
  `;
}

export function bindRitten(root, {data,persist,toast}) {
  root.querySelector("[data-rit-form]")?.addEventListener("submit", event => {
    event.preventDefault();
    const input = new FormData(event.currentTarget);
    const km = roundKm(String(input.get("km") || "").replace(",", "."));
    const datum = String(input.get("datum") || "");
    const van = String(input.get("van") || "").trim();
    const naar = String(input.get("naar") || "").trim();
    const doel = String(input.get("doel") || "").trim();
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(datum) || !Number.isFinite(km) || km <= 0 || km > 10000 || !van || !naar || !doel) {
      toast("Controleer datum, kilometers en omschrijving."); return;
    }
    data.ritten ||= [];
    data.ritten.push({id:"rit-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),datum,van,naar,doel,km});
    toast("Rit bewaard");persist();
  });
  root.querySelectorAll("[data-rit-verwijder]").forEach(button => button.addEventListener("click", () => {
    if (!confirm("Deze rit verwijderen?")) return;
    data.ritten = (data.ritten || []).filter(x => x.id !== button.dataset.ritVerwijder);
    toast("Rit verwijderd");persist();
  }));
  root.querySelector("[data-ritten-export]")?.addEventListener("click", () => {
    downloadCsv([["Datum","Van","Naar","Doel","Kilometers"],...(data.ritten||[]).map(r => [r.datum,r.van,r.naar,r.doel,r.km])], "vakento-ritten.csv");
  });
}

export function bindBetalingsherinneringen(root, {data,toast}) {
  root.querySelectorAll("[data-herinner]").forEach(button => button.addEventListener("click", () => {
    const f = (data.facturen || []).find(x => String(x.id) === button.dataset.herinner);
    if (!f || f.status !== "open") { toast("Deze factuur staat niet meer open."); return; }
    const c = (data.klanten || []).find(x => String(x.id) === String(f.klant)) || {};
    const naam = String(c.name || "klant").trim();
    const nr = String(f.nr || "zonder nummer");
    const bedrag = money(f.bedrag);
    const onderwerp = "Vriendelijke betalingsherinnering factuur " + nr;
    const tekst = "Beste " + naam + ",\\n\\nVolgens onze administratie staat factuur " + nr + " van " + bedrag + " nog open. Mogelijk is de betaling aan uw aandacht ontsnapt.\\n\\nZou u de betaling willen controleren? Als u inmiddels heeft betaald, kunt u deze herinnering als niet verzonden beschouwen.\\n\\nMet vriendelijke groet,\\n" + (data.firm || "Vakento gebruiker");
    const email = [c.email,c.mail,c.contact].find(value => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(value || "").trim()));
    const dialog = document.createElement("dialog");
    dialog.style.cssText = "max-width:min(570px,95vw);width:100%;border:1px solid #dbe3ef;border-radius:15px;padding:22px;box-shadow:0 20px 55px #0004";
    const label = document.createElement("h2");label.textContent = "Herinnering controleren";
    const hint = document.createElement("p");hint.textContent = "Controleer de gegevens. Er wordt niets automatisch verstuurd.";
    const subject = document.createElement("p");subject.textContent = "Onderwerp: " + onderwerp;
    const field = document.createElement("textarea");field.rows = 11;field.style.cssText="width:100%;padding:12px;font:inherit";field.value = tekst;
    const actions = document.createElement("div");actions.style.cssText="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px";
    const copy = document.createElement("button");copy.type="button";copy.textContent="Tekst kopiëren";copy.className="btn btn-ghost";
    copy.addEventListener("click", async () => {try{await navigator.clipboard.writeText(field.value);toast("Tekst gekopieerd");}catch{field.focus();field.select();toast("Selecteer en kopieer de tekst");}});
    const mail = document.createElement("button");mail.type="button";mail.textContent="Open e-mail";mail.className="btn";
    mail.addEventListener("click", () => {
      if (!email) {toast("Geen e-mailadres bij deze klant; kopieer de tekst.");return;}
      const url = "mailto:" + encodeURIComponent(String(email).trim()) + "?subject=" + encodeURIComponent(onderwerp) + "&body=" + encodeURIComponent(field.value);
      window.location.href = url;
    });
    const close = document.createElement("button");close.type="button";close.textContent="Sluiten";close.className="btn btn-ghost";
    close.addEventListener("click", () => dialog.close());
    actions.append(copy,mail,close);dialog.append(label,hint,subject,field,actions);
    document.body.append(dialog);dialog.addEventListener("close",() => dialog.remove());
    if (typeof dialog.showModal === "function") dialog.showModal(); else toast("Uw browser ondersteunt deze functie niet.");
  }));
}
