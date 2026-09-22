import { euro, klant, klus, person, roster, iso } from "./store.js?v=open1";
import { verrijkMetServer } from "./brein.js";
import { LEVERANCIERS, alleArtikelen } from "./leveranciers.js?v=lev2";

function geld(n) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

function som(regels) {
  return (regels || []).reduce((a, r) => a + Number(r.bedrag || 0), 0);
}

export function viewInkoop(data) {
  const maand = iso(new Date()).slice(0, 7);
  const scans = data.inkoop.filter((x) => (x.dag || "").startsWith(maand)).length;
  return `
    <div class="row"><div><p class="kicker">Inkoop</p><h1>Leveranciersrekeningen. 50 scans per maand in het lidmaatschap.</h1>
    <p class="muted">Deze maand ${scans} van 50. Foto of tekst, het brein leest bedrag en leverancier.</p></div></div>
    <form class="card stack" data-inkoop>
      <label>Leverancier<select name="leverancier">${LEVERANCIERS.map((l) => `<option>${l.naam}</option>`).join("")}<option>Anders</option></select></label>
      <label>Bedrag<input name="bedrag" type="number" step="0.01" required></label>
      <label>Klus<select name="klus"><option value="">—</option>${data.klussen.map((k) => `<option value="${k.id}">${k.title}</option>`).join("")}</select></label>
      <label>Omschrijving<input name="tekst" placeholder="Bon of factuurnummer"></label>
      <label>Foto van de bon<input name="foto" type="file" accept="image/*"></label>
      <button class="btn" type="submit">Boek inkoop</button>
    </form>
    <div class="list" style="margin-top:16px">
      ${data.inkoop
        .map(
          (n) => `<article class="item"><strong>${n.leverancier} · ${euro(n.bedrag)}</strong>
          <span>${n.dag} ${n.klus ? "· " + (klus(data, n.klus)?.title || "") : ""} · ${n.tekst || ""}</span></article>`
        )
        .join("")}
    </div>`;
}

export function viewStam(data) {
  const filter = data.levFilter || "";
  const q = (data.levZoek || "").toLowerCase();
  const lijst = alleArtikelen().filter((a) => {
    if (filter && a.leverancier !== filter) return false;
    if (q && !(`${a.naam} ${a.leverancier} ${a.tak}`).toLowerCase().includes(q)) return false;
    return true;
  });
  return `
    <div class="row"><div><p class="kicker">Stamgegevens</p><h1>Artikelen en diensten. Hergebruik in offertes.</h1></div>
    <button class="btn" data-act="artikel">Eigen artikel</button></div>
    <div class="list">
      ${data.artikelen
        .map(
          (a) => `<article class="item"><strong>${a.naam}</strong><span>${a.eenheid} · ${euro(a.prijs)} · ${Number(a.btw || 21)}% btw${a.leverancier ? " · " + a.leverancier : ""}</span>
          <button class="btn btn-ghost" data-regel="${a.id}">Op offerte</button></article>`
        )
        .join("")}
    </div>
    <h2 style="margin-top:28px">Groothandel</h2>
    <p class="muted">Richtprijzen excl. btw. Geen officiële prijslijst. Tik in stam, pas daarna je eigen inkoop aan.</p>
    <form class="card stack" data-lev-filter style="margin-top:12px">
      <label>Leverancier<select name="lev">
        <option value="">Alle grote bouwleveranciers</option>
        ${LEVERANCIERS.map((l) => `<option value="${l.naam}" ${filter === l.naam ? "selected" : ""}>${l.naam} · ${l.tak}</option>`).join("")}
      </select></label>
      <label>Zoeken<input name="q" value="${q.replace(/"/g, "")}" placeholder="YMvK, gips, dakpan…"></label>
      <div class="actions">
        <button class="btn btn-ghost" type="submit">Toon</button>
        ${filter ? `<button class="btn" type="button" data-lev-import>Hele lijst in stam</button>` : ""}
      </div>
    </form>
    <div class="table-wrap" style="overflow:auto;margin-top:14px">
      <table class="table">
        <thead><tr><th>Leverancier</th><th>Artikel</th><th>Eh</th><th>Richtprijs</th><th></th></tr></thead>
        <tbody>
          ${lijst
            .map(
              (a) => `<tr>
                <td>${a.leverancier}<br><span class="muted">${a.tak}</span></td>
                <td>${a.naam}</td>
                <td>${a.eenheid}</td>
                <td class="money">${geld(a.prijs)}</td>
                <td><button class="btn btn-ghost" type="button" data-cat="${a.id}">In stam</button></td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <p class="muted" style="margin-top:10px">${lijst.length} artikelen. Prijzen ter indicatie.</p>`;
}

export function viewGeld(data) {
  const open = data.facturen.filter((f) => f.status === "open");
  const somOpen = open.reduce((a, f) => a + f.bedrag, 0);
  return `
    <div class="row"><div><p class="kicker">Geld</p><h1>Openstaand, herinnering, termijn.</h1></div>
    <button class="btn btn-ghost" data-act="csv">Export CSV voor de boekhouder</button></div>
    <div class="stat"><span class="muted">Nog te ontvangen</span><b>${euro(somOpen)}</b></div>
    <div class="list" style="margin-top:16px">
      ${open
        .map(
          (f) => `<article class="item"><strong>${f.nr} · ${euro(f.bedrag)}</strong><span>${f.titel} · sinds ${f.dag}</span>
          <div class="actions"><button class="btn" data-herinner="${f.id}">Herinnering</button>
          <button class="btn btn-ghost" data-ubl="${f.id}">E-factuur (UBL)</button></div></article>`
        )
        .join("")}
    </div>`;
}

export function viewCalc(data) {
  const toeslag = Number(data.toeslag || 12);
  const rows = data.klussen.map((k) => {
    const loon = data.uren.filter((u) => u.klus === k.id).reduce((a, u) => a + u.uren * 72, 0);
    const inkoop = data.inkoop.filter((n) => n.klus === k.id).reduce((a, n) => a + n.bedrag, 0);
    const kost = loon + inkoop + (k.kost || 0);
    const metToeslag = Math.round(kost * (1 + toeslag / 100));
    return { ...k, loon, inkoop, kost, metToeslag, winst: k.begroot - kost };
  });
  return `
    <div class="row"><div><p class="kicker">Calculatie</p><h1>Loon, inkoop, toeslag. Nacalculatie in hetzelfde scherm.</h1>
    <p class="muted">Toeslag nu ${toeslag}%.</p></div></div>
    <table class="table">
      <thead><tr><th>Klus</th><th>Loon</th><th>Inkoop</th><th>Kost</th><th>+ toeslag</th><th>Begroot</th><th>Winst</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr><td>${r.title}</td><td>${euro(r.loon)}</td><td>${euro(r.inkoop)}</td><td>${euro(r.kost)}</td>
            <td>${euro(r.metToeslag)}</td><td>${euro(r.begroot)}</td>
            <td class="${r.winst < 0 ? "warn" : "ok"}">${euro(r.winst)}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

export function viewTaken(data) {
  return `
    <div class="row"><div><p class="kicker">Opdrachten</p><h1>Korte instructie voor op de klus.</h1></div></div>
    <form class="card stack" data-taak>
      <label>Klus<select name="klus">${data.klussen.map((k) => `<option value="${k.id}">${k.title}</option>`).join("")}</select></label>
      <label>Wie<select name="wie">${roster.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select></label>
      <label>Opdracht<input name="tekst" required placeholder="Trek extra groep oven"></label>
      <button class="btn" type="submit">Zet klaar</button>
    </form>
    <div class="list" style="margin-top:16px">
      ${data.taken
        .map(
          (t) => `<article class="item"><strong>${t.tekst}</strong>
          <span>${klus(data, t.klus)?.title} · ${person(t.wie)?.name} · ${t.klaar ? "klaar" : "open"}</span>
          ${t.klaar ? "" : `<button class="btn btn-ghost" data-klaar="${t.id}">Afvinken</button>`}</article>`
        )
        .join("")}
    </div>`;
}

export function bindKantoor(root, { data, persist, toast }) {
  root.querySelector("form[data-inkoop]")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const maand = iso(new Date()).slice(0, 7);
    if (data.inkoop.filter((x) => (x.dag || "").startsWith(maand)).length >= 50) {
      toast("50 scans deze maand zit erop");
      return;
    }
    const f = new FormData(e.target);
    let leverancier = f.get("leverancier");
    let bedrag = Number(f.get("bedrag"));
    let tekst = f.get("tekst");
    const file = e.target.foto?.files?.[0];
    if (file) {
      const out = await verrijkMetServer("inkoop", { leverancier, bedrag, tekst }, { naam: file.name });
      leverancier = out.leverancier || leverancier;
      bedrag = Number(out.bedrag || bedrag);
      tekst = out.tekst || tekst;
    }
    data.inkoop.unshift({
      id: "n" + Date.now(),
      leverancier,
      bedrag,
      tekst,
      klus: f.get("klus") || "",
      dag: iso(new Date()),
    });
    const k = klus(data, f.get("klus"));
    if (k) k.kost = (k.kost || 0) + bedrag;
    toast("Inkoop geboekt");
    persist();
  });
  root.querySelector("[data-act='artikel']")?.addEventListener("click", () => {
    const naam = prompt("Artikel");
    if (!naam) return;
    const prijs = Number(prompt("Prijs excl. btw") || 0);
    const gekozen = Number(prompt("BTW tarief: 21 = standaard, 9 = verlaagd indien toegestaan, 0 = 0%", "21") || 21);
    const btw = [0, 9, 21].includes(gekozen) ? gekozen : 21;
    data.artikelen.push({ id: "a" + Date.now(), naam, eenheid: "st", prijs, btw });
    persist();
  });
  root.querySelector("form[data-lev-filter]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    data.levFilter = String(f.get("lev") || "");
    data.levZoek = String(f.get("q") || "");
    persist();
  });
  root.querySelector("[data-lev-import]")?.addEventListener("click", () => {
    const naam = data.levFilter;
    const lev = LEVERANCIERS.find((l) => l.naam === naam);
    if (!lev) return;
    lev.artikelen.forEach(([art, eenheid, prijs]) => {
      if (data.artikelen.some((x) => x.naam === art && x.leverancier === lev.naam)) return;
      data.artikelen.push({ id: "a" + Date.now() + Math.random(), naam: art, eenheid, prijs, btw: 21, leverancier: lev.naam });
    });
    toast(lev.naam + " in stam");
    persist();
  });
  root.querySelectorAll("[data-cat]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const a = alleArtikelen().find((x) => x.id === btn.dataset.cat);
      if (!a) return;
      if (data.artikelen.some((x) => x.naam === a.naam && x.leverancier === a.leverancier)) {
        toast("Staat al in stam");
        return;
      }
      data.artikelen.push({
        id: "a" + Date.now(),
        naam: a.naam,
        eenheid: a.eenheid,
        prijs: a.prijs,
        leverancier: a.leverancier,
      });
      toast("In stam");
      persist();
    })
  );
  root.querySelectorAll("[data-regel]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const a = data.artikelen.find((x) => x.id === btn.dataset.regel);
      const o = data.offertes[0];
      if (!o || !a) return;
      o.regels.push({ tekst: a.naam, bedrag: a.prijs, btw: Number(a.btw || 21) });
      toast("Op de laatste offerte");
      persist();
    })
  );
  root.querySelector("[data-act='csv']")?.addEventListener("click", () => {
    const lines = ["nr;titel;bedrag;status;dag"].concat(
      data.facturen.map((f) => [f.nr, f.titel, f.bedrag, f.status, f.dag].join(";"))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vakento-facturen.csv";
    a.click();
  });
  root.querySelectorAll("[data-herinner]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const f = data.facturen.find((x) => x.id === btn.dataset.herinner);
      const c = klant(data, f.klant);
      toast("Herinnering voor " + (c?.name || "") + ": " + euro(f.bedrag) + " open");
    })
  );
  root.querySelectorAll("[data-ubl]")?.forEach((btn) =>
    btn.addEventListener("click", () => {
      const f = data.facturen.find((x) => x.id === btn.dataset.ubl);
      const xml = `<?xml version="1.0"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><ID>${f.nr}</ID><IssueDate>${f.dag}</IssueDate><LegalMonetaryTotal><PayableAmount currencyID="EUR">${f.bedrag}</PayableAmount></LegalMonetaryTotal></Invoice>`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
      a.download = f.nr + ".xml";
      a.click();
    })
  );
  root.querySelector("form[data-taak]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    data.taken.unshift({ id: "t" + Date.now(), klus: f.get("klus"), wie: f.get("wie"), tekst: f.get("tekst"), klaar: false });
    persist();
  });
  root.querySelectorAll("[data-klaar]").forEach((btn) =>
    btn.addEventListener("click", () => {
      data.taken.find((t) => t.id === btn.dataset.klaar).klaar = true;
      persist();
    })
  );
}

export { som };
