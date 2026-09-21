import {
  load,
  save,
  euro,
  klant,
  klus,
  person,
  roster,
  monday,
  iso,
  weekDays,
  addDays,
} from "./store.js?v=open1";
import {
  offerteUitTekst,
  briefing,
  planWeek,
  werkbonUitUren,
  klantmail,
  verrijkMetServer,
} from "./brein.js";
import {
  viewInkoop,
  viewStam,
  viewGeld,
  viewCalc,
  viewTaken,
  bindKantoor,
} from "./kantoor.js?v=lev2";
import {
  papierVan,
  previewBrief,
  esc,
  bindPapier,
  htmlOfferte,
  htmlFactuur,
  htmlDoc,
  openPapier,
} from "./papier.js?v=open1";
import { api } from "./api.js";
import { viewCloud, mountCloud } from "./cloud.js?v=cloud1";
import { viewSlim, bindSlim } from "./slim.js?v=1";

const $ = (s, r = document) => r.querySelector(s);
let data = load();
let weekStart = monday(new Date());

const routes = {
  "#/": viewVandaag,
  "#/bord": viewBord,
  "#/klussen": viewKlussen,
  "#/papier": viewPapier,
  "#/uren": viewUren,
  "#/ploeg": viewPloeg,
  "#/spullen": viewSpullen,
  "#/winst": viewWinst,
  "#/berichten": viewBerichten,
  "#/brein": viewBrein,
  "#/inkoop": () => viewInkoop(data),
  "#/stam": () => viewStam(data),
  "#/geld": () => viewGeld(data),
  "#/calculatie": () => viewCalc(data),
  "#/taken": () => viewTaken(data),
  "#/post": viewPost,
  "#/cloud": viewCloud,
  "#/slim": () => viewSlim(data),
};

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function persist() {
  save(data);
  render();
}

function nav(hash) {
  document.querySelectorAll(".app-nav a, .bottom a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === hash || (hash === "#/" && a.dataset.home));
  });
  document.querySelectorAll(".nav-more").forEach((el) => {
    el.open = false;
  });
}

function isLeeg() {
  return !data.klanten.length && !data.klussen.length;
}

function viewStart() {
  return `
    <div class="row">
      <div>
        <p class="kicker">Eerste keer</p>
        <h1>Zet je zaak erin. Daarna het werk.</h1>
        <p class="muted">Naam, plaats, eerste klant en eerste klus. Dat is genoeg om te beginnen.</p>
      </div>
    </div>
    <form class="card stack" data-start style="max-width:560px">
      <label>Jouw zaak<input name="firm" required value="${data.firm || ""}" placeholder="Schildersbedrijf Jansen"></label>
      <label>Plaats<input name="place" required placeholder="Winterswijk"></label>
      <label>Eerste klant<input name="klant" required placeholder="Bakkerij De Knip"></label>
      <label>Eerste klus<input name="klus" required placeholder="Groepenkast / schilderwerk gevel"></label>
      <button class="btn" type="submit">Werkplaats openen</button>
    </form>
    <div class="start-grid" style="margin-top:22px">
      <a class="card" href="#/papier"><p class="kicker">Papier</p><h3>Briefpapier</h3><p class="muted">Logo erop, daarna offertes.</p></a>
      <a class="card" href="#/stam"><p class="kicker">Stam</p><h3>Groothandel</h3><p class="muted">Richtprijzen in je artikelen.</p></a>
      <a class="card" href="#/brein"><p class="kicker">AI</p><h3>Brein</h3><p class="muted">Offerte uit één zin.</p></a>
    </div>`;
}

function viewVandaag() {
  if (isLeeg()) return viewStart();
  const today = iso(new Date());
  const inzet = data.inzet.filter((i) => i.day === today);
  const openFact = data.facturen.filter((f) => f.status === "open");
  const offertes = data.offertes.filter((o) => o.status === "verstuurd");
  const missingHours = roster.filter((p) => !data.uren.some((u) => u.person === p.id && u.day === today));
  const low = data.materiaal.filter((m) => m.voorraad <= m.min);
  const letop =
    missingHours.map((p) => `<article class="item"><strong class="warn">Geen uren</strong><span>${p.name} heeft vandaag nog niets ingevuld.</span></article>`).join("") +
    low.map((m) => `<article class="item"><strong class="warn">Voorraad</strong><span>${m.naam}: ${m.voorraad} (min ${m.min})</span></article>`).join("") +
    offertes
      .map(
        (o) => `<article class="item"><strong>Offerte ${o.nr}</strong><span>${o.titel} wacht bij ${klant(data, o.klant).name}. Eén tik naar het bord als ze ja zeggen.</span><div class="actions"><button class="btn" data-ok="${o.id}">Akkoord, zet op bord</button></div></article>`
      )
      .join("") +
    openFact.map((f) => `<article class="item"><strong>Factuur ${f.nr}</strong><span>${euro(f.bedrag)} open sinds ${f.dag}</span></article>`).join("");

  return `
    <div class="row">
      <div>
        <p class="kicker">${data.place || "Werkplaats"}</p>
        <h1>Wat er vandaag moet gebeuren.</h1>
        <p class="muted">${data.firm} · ${new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>
      <div class="actions">
        <button class="btn" data-act="briefing">AI-ochtend</button>
        <button class="btn btn-ghost" data-act="start-uren">Uren starten</button>
        <button class="btn btn-ghost" data-act="bon">Werkbon</button>
      </div>
    </div>
    <div class="start-grid" style="margin-bottom:18px">
      <a class="card" href="#/klussen"><p class="kicker">Werk</p><h3>Klussen</h3><p class="muted">${data.klussen.length} in het dossier</p></a>
      <a class="card" href="#/papier"><p class="kicker">Papier</p><h3>Offerte</h3><p class="muted">${data.offertes.length} offertes</p></a>
      <a class="card" href="#/uren"><p class="kicker">Ploeg</p><h3>Uren</h3><p class="muted">Boek vanaf de klus</p></a>
      <a class="card" href="#/cloud"><p class="kicker">Cloud</p><h3>Mappen</h3><p class="muted">Open overal ter wereld</p></a>
    </div>
    <div class="stat-grid">
      <div class="stat"><span class="muted">Op pad</span><b>${inzet.length}</b></div>
      <div class="stat"><span class="muted">Open facturen</span><b>${euro(openFact.reduce((a, f) => a + f.bedrag, 0))}</b></div>
      <div class="stat"><span class="muted">Wacht op akkoord</span><b>${offertes.length}</b></div>
      <div class="stat"><span class="muted">Uren nog leeg</span><b>${missingHours.length}</b></div>
    </div>
    <h2 style="margin:22px 0 10px">Wie waar</h2>
    <div class="list">
      ${
        inzet.length
          ? inzet
              .map((i) => {
                const k = klus(data, i.klus);
                const c = klant(data, k.klant);
                return `<article class="item"><strong>${person(i.person).name}</strong><span>${k.title} · ${c.name}, ${c.plaats}</span></article>`;
              })
              .join("")
          : `<article class="item"><strong>Niemand op het bord</strong><span>Zet de ploeg op het weekbord. <a href="#/bord">Naar het bord</a></span></article>`
      }
    </div>
    <h2 style="margin:22px 0 10px">Let op</h2>
    <div class="list">
      ${letop || `<article class="item"><strong>Rustig</strong><span>Geen open facturen, geen uren die wachten.</span></article>`}
    </div>
    <div class="card" id="briefing-out" hidden></div>`;
}

function viewBord() {
  const days = weekDays(weekStart);
  const cells = roster
    .map((p) => {
      const cols = days
        .map((d) => {
          const day = iso(d);
          const hit = data.inzet.find((i) => i.person === p.id && i.day === day);
          if (!hit) return `<div class="cell"><button class="job empty" data-add="${p.id}|${day}">+ klus</button></div>`;
          const k = klus(data, hit.klus);
          return `<div class="cell"><button class="job" data-drop="${hit.id}">${k.title}</button></div>`;
        })
        .join("");
      return `<div class="who">${p.name}<br><span class="muted">${p.role}</span></div>${cols}`;
    })
    .join("");
  return `
    <div class="row">
      <div>
        <p class="kicker">Weekbord</p>
        <h1>Ploeg × dagen. Klaar.</h1>
        <p class="muted">Geen Gantt-puzzel. Je ziet wie waar staat, zoals op een bord in de kantine.</p>
      </div>
      <div class="actions">
        <button class="btn" data-act="ai-plan">AI plant vrije vakken</button>
        <button class="btn btn-ghost" data-week="-1">Vorige</button>
        <button class="btn btn-ghost" data-week="1">Volgende</button>
      </div>
    </div>
    <div class="week">
      <div></div>
      ${days.map((d) => `<div class="head">${d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" })}</div>`).join("")}
      ${cells}
    </div>`;
}

function viewKlussen() {
  return `
    <div class="row">
      <div><p class="kicker">Klussen</p><h1>Van schuur tot oplevering.</h1></div>
      <button class="btn" data-act="klus">Nieuwe klus</button>
      <button class="btn btn-ghost" data-act="klant">Klant</button>
    </div>
    <div class="list">
      ${
        data.klussen.length
          ? data.klussen
              .map((k) => {
                const c = klant(data, k.klant);
                const winst = k.begroot - k.kost;
                return `<article class="item">
            <strong>${k.title}</strong>
            <span>${c.name} · ${k.status} · ${k.start} t/m ${k.einde}</span>
            <span class="money">Begroot ${euro(k.begroot)} · kosten ${euro(k.kost)} · <b class="${winst < 0 ? "warn" : "ok"}">${euro(winst)}</b></span>
            <div class="actions">
              <a class="btn btn-ghost" href="klant.html?t=${k.token}">Klantlink</a>
              <button class="btn btn-ghost" data-factuur="${k.id}">Factuur maken</button>
            </div>
          </article>`;
              })
              .join("")
          : `<article class="item"><strong>Nog geen klus</strong><span>Eerst een klant, dan een klus. Of begin op Vandaag.</span></article>`
      }
    </div>`;
}

function som(regels) {
  return regels.reduce((a, r) => a + r.bedrag, 0);
}

function viewPapier() {
  const p = papierVan(data);
  return `
    <div class="row"><div><p class="kicker">Papier</p><h1>Offerte, akkoord, rekening.</h1></div>
      <button class="btn btn-ghost" data-act="klant">Klant</button></div>
    <div class="grid-2 papier-set">
      <form class="card stack" data-papier>
        <p class="kicker">Eigen briefpapier</p>
        <h3>Logo erop. Jouw zaak bovenaan.</h3>
        <label>Bedrijfsnaam<input name="firm" value="${esc(data.firm || "")}" required></label>
        <label>Adres<input name="adres" value="${esc(p.adres)}" placeholder="Straat 1"></label>
        <div class="grid-2">
          <label>Postcode<input name="postcode" value="${esc(p.postcode)}"></label>
          <label>Plaats<input name="plaats" value="${esc(p.plaats)}"></label>
        </div>
        <label>Telefoon<input name="tel" value="${esc(p.tel)}"></label>
        <label>E-mail<input name="mail" type="email" value="${esc(p.mail)}"></label>
        <label>KvK<input name="kvk" value="${esc(p.kvk)}"></label>
        <label>btw-nummer<input name="btw" value="${esc(p.btw)}"></label>
        <label>IBAN<input name="iban" value="${esc(p.iban)}"></label>
        <label>Voettekst<textarea name="voet" rows="2">${esc(p.voet)}</textarea></label>
        <label>Logo (png, jpg, svg)<input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></label>
        <div class="actions">
          <button class="btn" type="submit">Briefpapier bewaren</button>
          ${p.logo ? `<button class="btn btn-ghost" type="button" data-logo-weg>Logo eraf</button>` : ""}
        </div>
      </form>
      <div class="card">${previewBrief(data)}</div>
    </div>
    <form class="card stack" data-ai-offerte>
      <p class="kicker">Brein</p>
      <h3>Zeg wat de klant wil. De calculatie komt eronder.</h3>
      <label>Klant${
        data.klanten.length
          ? `<select name="klant">${data.klanten.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}</select>`
          : `<span class="muted"> Nog geen klant. Voeg er eerst één toe.</span>`
      }</label>
      <label>Opdracht<textarea name="vraag" rows="3" required placeholder="Groepenkast 3-fase bakkerij Aalten, oven extra groep, oude kast eruit"></textarea></label>
      <button class="btn" type="submit">Maak offerte met AI</button>
    </form>
    <h2 style="margin-top:22px">Offertes</h2>
    <div class="list" style="margin:10px 0 24px">
      ${data.offertes
        .map(
          (o) => `<article class="item"><strong>${o.nr} · ${o.titel}</strong>
          <span>${klant(data, o.klant).name} · ${o.status} · ${euro(som(o.regels))}</span>
          <div class="actions">
            <button class="btn btn-ghost" data-print="offerte|${o.id}">Briefpapier</button>
            ${o.status !== "akkoord" ? `<button class="btn" data-ok="${o.id}">Zet op akkoord</button>` : `<button class="btn btn-ghost" data-doc="bevestiging|${o.id}">Opdrachtbevestiging</button><button class="btn btn-ghost" data-doc="pakbon|${o.id}">Pakbon</button>`}
          </div></article>`
        )
        .join("")}
    </div>
    <h2>Facturen</h2>
    <div class="list">
      ${data.facturen
        .map(
          (f) => `<article class="item"><strong>${f.nr}</strong><span>${f.titel} · ${euro(f.bedrag)} · ${f.status}</span>
          <div class="actions">
            <button class="btn btn-ghost" data-print="factuur|${f.id}">Briefpapier</button>
            ${f.status === "open" ? `<button class="btn" data-betaald="${f.id}">Ontvangen</button><button class="btn btn-ghost" data-termijn="${f.id}">Termijn 40%</button>` : `<span class="ok">Betaald</span>`}
          </div></article>`
        )
        .join("")}
    </div>`;
}

function viewUren() {
  const today = iso(new Date());
  return `
    <div class="row"><div><p class="kicker">Urenboek</p><h1>Tik in vanaf de klus.</h1></div></div>
    <form class="card stack" data-uren>
      <label>Wie<select name="person">${roster.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select></label>
      <label>Klus<select name="klus">${data.klussen.map((k) => `<option value="${k.id}">${k.title}</option>`).join("")}</select></label>
      <label>Soort<select name="soort"><option value="werk">Werk</option><option value="reis">Reistijd</option><option value="pauze">Pauze</option><option value="weer">Weer</option></select></label>
      <label>Uren<input name="uren" type="number" step="0.5" value="8" required></label>
      <label>Notitie<input name="note" placeholder="Wat is er gedaan"></label>
      <button class="btn" type="submit">Boek ${today}</button>
    </form>
    <div class="list" style="margin-top:16px">
      ${data.uren
        .slice()
        .reverse()
        .map((u) => `<article class="item"><strong>${person(u.person).name} · ${u.uren} u · ${u.soort || "werk"}</strong><span>${klus(data, u.klus).title} · ${u.day}${u.note ? " · " + u.note : ""}</span></article>`)
        .join("")}
    </div>`;
}

function viewPloeg() {
  return `
    <div class="row"><div><p class="kicker">Ploeg</p><h1>Mensen, rollen, vrij.</h1></div>
      <button class="btn" data-act="mens">Iemand erbij</button></div>
    <div class="list">
      ${roster.map((p) => `<article class="item"><strong>${p.name}</strong><span>${p.role}</span></article>`).join("")}
    </div>
    <h2 style="margin:22px 0 10px">Verlof</h2>
    <div class="list">
      ${data.verlof.map((v) => `<article class="item"><strong>${person(v.person).name}</strong><span>${v.soort} · ${v.from} t/m ${v.to}</span></article>`).join("")}
    </div>`;
}

function viewSpullen() {
  return `
    <div class="row"><div><p class="kicker">Bus en schuur</p><h1>Wat op is, zie je hier.</h1></div>
    <button class="btn" data-act="mat">Artikel</button></div>
    <div class="list">
      ${data.materiaal
        .map(
          (m) => `<article class="item"><strong>${m.naam}</strong><span class="${m.voorraad <= m.min ? "warn" : "ok"}">${m.voorraad} stuks</span>
          <div class="actions"><button class="btn btn-ghost" data-plus="${m.id}">+1</button><button class="btn btn-ghost" data-min="${m.id}">−1</button></div></article>`
        )
        .join("")}
    </div>
    <h2 style="margin:22px 0 10px">Werkbonnen</h2>
    <p class="muted">AI kan de bon schrijven uit de geboekte uren.</p>
    <form class="card stack" data-bon>
      <label>Klus<select name="klus">${data.klussen.map((k) => `<option value="${k.id}">${k.title}</option>`).join("")}</select></label>
      <label>Wat is er gedaan<textarea name="tekst" required rows="3"></textarea></label>
      <label>Foto’s (max 8)<input name="fotos" type="file" accept="image/*" multiple></label>
      <div class="actions">
        <button class="btn btn-ghost" type="button" data-act="ai-bon">AI schrijft de tekst</button>
        <button class="btn" type="submit">Bon opslaan</button>
      </div>
    </form>
    <div class="list" style="margin-top:16px">
      ${data.bonnen
        .map((b) => `<article class="item"><strong>${klus(data, b.klus).title}</strong><span>${b.tekst}</span>
        ${b.photos?.length ? `<div class="photos">${b.photos.map((p) => `<img src="${p}" alt="">`).join("")}</div>` : ""}</article>`)
        .join("")}
    </div>`;
}

function viewWinst() {
  const rows = data.klussen.map((k) => ({ ...k, winst: k.begroot - k.kost }));
  const tot = rows.reduce((a, r) => a + r.winst, 0);
  return `
    <div class="row"><div><p class="kicker">Nacalculatie</p><h1>Winst per klus, niet aan het eind van het jaar.</h1></div></div>
    <div class="stat"><span class="muted">Open winst op lopende klussen</span><b class="${tot < 0 ? "warn" : "ok"}">${euro(tot)}</b></div>
    <table class="table" style="margin-top:16px">
      <thead><tr><th>Klus</th><th>Begroot</th><th>Kosten</th><th>Winst</th></tr></thead>
      <tbody>
        ${rows.map((r) => `<tr><td>${r.title}</td><td>${euro(r.begroot)}</td><td>${euro(r.kost)}</td><td class="${r.winst < 0 ? "warn" : "ok"}">${euro(r.winst)}</td></tr>`).join("")}
      </tbody>
    </table>`;
}

function viewBerichten() {
  return `
    <div class="row"><div><p class="kicker">Ploegchat</p><h1>Kort. Op de klus.</h1></div></div>
    <div class="list">
      ${data.berichten.map((b) => `<article class="item"><strong>${b.who}</strong><span>${b.tekst}</span></article>`).join("")}
    </div>
    <form class="card stack" data-msg style="margin-top:16px">
      <input name="tekst" required placeholder="Bericht naar de ploeg">
      <button class="btn" type="submit">Stuur</button>
    </form>`;
}

function viewBrein() {
  return `
    <div class="row">
      <div>
        <p class="kicker">Brein</p>
        <h1>AI als voorman, jij houdt de sleutel.</h1>
        <p class="muted">Eerst vakregels (uren, voorrijden, materiaal). Daarna scherpt AI de tekst. Jij drukt pas op akkoord.</p>
      </div>
    </div>
    <div class="grid-3">
      <article class="card"><h3>Offerte</h3><p class="muted">Zin van de klant → meetstaat + prijs.</p><a class="btn" href="#/papier">Naar papier</a></article>
      <article class="card"><h3>Week</h3><p class="muted">Vrije vakken vullen met open klussen.</p><a class="btn" href="#/bord">Naar bord</a></article>
      <article class="card"><h3>Bon</h3><p class="muted">Uren worden een tekst voor de klant.</p><a class="btn" href="#/spullen">Naar bonnen</a></article>
    </div>
    <form class="card stack" data-ai-vraag style="margin-top:18px">
      <label>Vraag aan het brein<textarea name="vraag" rows="3" required placeholder="Wat moet ik morgen meenemen naar de camping?"></textarea></label>
      <button class="btn" type="submit">Vraag</button>
    </form>
    <div class="card" id="brein-out" hidden style="margin-top:12px;white-space:pre-wrap"></div>`;
}

function viewPost() {
  const p = papierVan(data);
  return `
    <div class="row"><div><p class="kicker">Post</p><h1>Versturen en ontvangen via Vakento.</h1>
      <p class="muted">Uitgaand vanaf hallo@vakento.nl. Antwoord komt op het adres in je briefpapier of je account.</p></div></div>
    <form class="card stack" data-mail>
      <label>Aan<input name="to" type="email" required placeholder="klant@bedrijf.nl"></label>
      <label>Onderwerp<input name="subject" required value="Offerte ${data.firm || ""}"></label>
      <label>Tekst<textarea name="text" rows="8" required>Beste,

Hierbij onze offerte.

Met vriendelijke groet,
${data.firm || ""}
${p.tel || ""}
</textarea></label>
      <button class="btn" type="submit">Verstuur</button>
      <p class="warn" data-err hidden></p>
    </form>
    <h2 style="margin-top:22px">Ontvangen op hallo@vakento.nl</h2>
    <div class="list" id="inbox"><p class="muted">Laden…</p></div>`;
}

function acceptOffer(id) {
  const o = data.offertes.find((x) => x.id === id);
  if (!o) return;
  o.status = "akkoord";
  const k = klus(data, o.klus);
  if (k) {
    k.status = "ingepland";
    k.people.forEach((pid) => {
      if (!data.inzet.some((i) => i.person === pid && i.day === k.start && i.klus === k.id)) {
        data.inzet.push({ id: "i" + Date.now() + pid, person: pid, klus: k.id, day: k.start });
      }
    });
  }
  toast("Op het bord gezet");
  persist();
}

function compress(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement("canvas");
      const scale = Math.min(1, 1200 / img.width);
      c.width = img.width * scale;
      c.height = img.height * scale;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.src = url;
  });
}

function bind(root) {
  root.querySelector("form[data-start]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const firm = String(f.get("firm") || "").trim();
    const place = String(f.get("place") || "").trim();
    const klantNaam = String(f.get("klant") || "").trim();
    const klusTitel = String(f.get("klus") || "").trim();
    if (!firm || !klantNaam || !klusTitel) return;
    data.firm = firm;
    data.place = place;
    data.papier = data.papier || {};
    data.papier.plaats = place;
    data.ploeg = [{ id: "p1", name: firm, role: "Baas" }];
    const kid = "c" + Date.now();
    data.klanten.unshift({ id: kid, name: klantNaam, plaats: place, tel: "", contact: "" });
    data.klussen.unshift({
      id: "k" + Date.now(),
      title: klusTitel,
      klant: kid,
      status: "ingepland",
      start: iso(new Date()),
      einde: iso(new Date()),
      begroot: 0,
      kost: 0,
      people: ["p1"],
      token: "klus-" + Math.floor(Math.random() * 9000 + 1000),
    });
    try {
      sessionStorage.setItem("vakento.firm", firm);
    } catch (_) {}
    toast("Zaak staat klaar");
    persist();
  });
  root.querySelector("[data-act='briefing']")?.addEventListener("click", async () => {
    const box = root.querySelector("#briefing-out");
    const local = briefing(data, roster);
    box.hidden = false;
    box.innerHTML = "<p class='muted'>Brein leest de dag…</p>";
    const out = await verrijkMetServer("briefing", local, { firm: data.firm });
    box.innerHTML = `<p class="kicker">${out.bron}</p><p>${out.tekst}</p>`;
  });
  root.querySelector("[data-act='ai-plan']")?.addEventListener("click", async () => {
    toast("Brein vult vrije vakken");
    const days = weekDays(weekStart);
    const local = planWeek(data, roster, days);
    const out = await verrijkMetServer("plan", local, { klussen: data.klussen.map((k) => k.title) });
    (out.extra || local.extra).forEach((x) => {
      if (!data.inzet.some((i) => i.person === x.person && i.day === x.day)) {
        data.inzet.push({ id: "i" + Date.now() + x.person + x.day, person: x.person, klus: x.klus, day: x.day });
      }
    });
    persist();
  });
  root.querySelector("form[data-ai-offerte]")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const vraag = f.get("vraag");
    const klantId = f.get("klant");
    if (!klantId) {
      toast("Eerst een klant");
      return;
    }
    toast("Calculeren");
    const local = offerteUitTekst(vraag, data.place);
    const out = await verrijkMetServer("offerte", local, { vraag, plaats: data.place });
    const regels = out.regels || local.regels;
    const kId = "k" + Date.now();
    data.klussen.unshift({
      id: kId,
      title: out.titel || local.titel,
      klant: klantId,
      status: "offerte",
      start: iso(new Date()),
      einde: iso(new Date()),
      begroot: (regels || []).reduce((a, r) => a + Number(r.bedrag || 0), 0),
      kost: 0,
      people: [roster[0].id],
      token: "ai-" + Math.floor(Math.random() * 9000 + 1000),
    });
    data.offertes.unshift({
      id: "o" + Date.now(),
      nr: "OFF-" + (1040 + data.offertes.length),
      klant: klantId,
      titel: out.titel || local.titel,
      regels,
      status: "verstuurd",
      klus: kId,
      risico: out.risico || local.risico,
    });
    toast("Offerte klaar");
    persist();
  });
  root.querySelector("[data-act='ai-bon']")?.addEventListener("click", async () => {
    const form = root.querySelector("form[data-bon]");
    const klusId = new FormData(form).get("klus");
    const local = werkbonUitUren(data, klusId);
    const out = await verrijkMetServer("bon", local, { klus: klus(data, klusId)?.title });
    form.tekst.value = out.tekst || local.tekst;
    toast("Tekst gezet — check en sla op");
  });
  root.querySelector("form[data-ai-vraag]")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const vraag = new FormData(e.target).get("vraag");
    const box = root.querySelector("#brein-out");
    box.hidden = false;
    box.textContent = "Even nadenken…";
    const local = { tekst: offerteUitTekst(vraag, data.place).toelichting };
    const mail = klantmail({ ...offerteUitTekst(vraag, data.place), firm: data.firm }, data.klanten[0].name);
    const out = await verrijkMetServer("vraag", { tekst: vraag + "\n\n" + mail.tekst }, { vraag, briefing: briefing(data, roster) });
    box.innerHTML = `<p class="kicker">${out.bron}</p>${out.tekst || mail.tekst}`;
  });
  root.querySelector("[data-act='start-uren']")?.addEventListener("click", () => {
    location.hash = "#/uren";
  });
  root.querySelector("[data-act='bon']")?.addEventListener("click", () => {
    location.hash = "#/spullen";
  });
  root.querySelectorAll("[data-ok]").forEach((btn) => btn.addEventListener("click", () => acceptOffer(btn.dataset.ok)));
  root.querySelector("[data-week='-1']")?.addEventListener("click", () => {
    weekStart = addDays(weekStart, -7);
    persist();
  });
  root.querySelector("[data-week='1']")?.addEventListener("click", () => {
    weekStart = addDays(weekStart, 7);
    persist();
  });
  root.querySelectorAll("[data-add]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const [personId, day] = btn.dataset.add.split("|");
      const k = data.klussen.find((x) => x.status !== "klaar") || data.klussen[0];
      if (!k) {
        toast("Eerst een klus maken");
        return;
      }
      data.inzet.push({ id: "i" + Date.now(), person: personId, klus: k.id, day });
      toast(k.title + " gezet");
      persist();
    })
  );
  root.querySelectorAll("[data-drop]").forEach((btn) =>
    btn.addEventListener("click", () => {
      data.inzet = data.inzet.filter((i) => i.id !== btn.dataset.drop);
      persist();
    })
  );
  root.querySelector("[data-act='klant']")?.addEventListener("click", () => {
    const name = prompt("Naam van de klant of het bedrijf");
    if (!name) return;
    const plaats = prompt("Plaats") || "";
    data.klanten.unshift({ id: "c" + Date.now(), name, contact: "", tel: "", plaats });
    toast("Klant gezet");
    persist();
  });
  root.querySelector("[data-act='mens']")?.addEventListener("click", () => {
    const name = prompt("Naam");
    if (!name) return;
    const role = prompt("Rol, bijvoorbeeld monteur of schilder") || "Ploeg";
    data.ploeg = data.ploeg || [];
    data.ploeg.push({ id: "p" + Date.now(), name, role });
    toast("In de ploeg");
    persist();
  });
  root.querySelector("[data-act='klus']")?.addEventListener("click", () => {
    if (!data.klanten[0]) {
      toast("Eerst een klant");
      return;
    }
    const title = prompt("Naam van de klus");
    if (!title) return;
    data.klussen.unshift({
      id: "k" + Date.now(),
      title,
      klant: data.klanten[0].id,
      status: "ingepland",
      start: iso(new Date()),
      einde: iso(new Date()),
      begroot: 0,
      kost: 0,
      people: [roster[0].id],
      token: "klus-" + Math.floor(Math.random() * 9000 + 1000),
    });
    persist();
  });
  root.querySelectorAll("[data-factuur]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const k = klus(data, btn.dataset.factuur);
      data.facturen.unshift({
        id: "f" + Date.now(),
        nr: "FAC-" + (880 + data.facturen.length),
        klant: k.klant,
        titel: k.title,
        bedrag: k.begroot,
        status: "open",
        dag: iso(new Date()),
      });
      toast("Factuur klaar");
      location.hash = "#/papier";
      persist();
    })
  );
  root.querySelectorAll("[data-betaald]").forEach((btn) =>
    btn.addEventListener("click", () => {
      data.facturen.find((f) => f.id === btn.dataset.betaald).status = "betaald";
      persist();
    })
  );
  root.querySelector("form[data-uren]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const uren = Number(f.get("uren"));
    const klusId = f.get("klus");
    data.uren.push({
      id: "u" + Date.now(),
      person: f.get("person"),
      klus: klusId,
      day: iso(new Date()),
      uren,
      soort: f.get("soort") || "werk",
      note: f.get("note"),
    });
    const k = klus(data, klusId);
    k.kost += Math.round(uren * 55);
    toast("Uren geboekt");
    persist();
  });
  root.querySelectorAll("[data-plus]").forEach((b) =>
    b.addEventListener("click", () => {
      data.materiaal.find((m) => m.id === b.dataset.plus).voorraad += 1;
      persist();
    })
  );
  root.querySelectorAll("[data-min]").forEach((b) =>
    b.addEventListener("click", () => {
      const m = data.materiaal.find((x) => x.id === b.dataset.min);
      m.voorraad = Math.max(0, m.voorraad - 1);
      persist();
    })
  );
  root.querySelector("[data-act='mat']")?.addEventListener("click", () => {
    const naam = prompt("Artikel");
    if (!naam) return;
    data.materiaal.push({ id: "m" + Date.now(), naam, voorraad: 1, min: 1 });
    persist();
  });
  root.querySelector("form[data-bon]")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const files = [...(e.target.fotos.files || [])].slice(0, 8);
    const photos = [];
    for (const file of files) photos.push(await compress(file));
    data.bonnen.unshift({ id: "b" + Date.now(), klus: f.get("klus"), tekst: f.get("tekst"), photos });
    toast("Bon bewaard");
    persist();
  });
  root.querySelector("form[data-msg]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const tekst = new FormData(e.target).get("tekst");
    data.berichten.push({ id: "g" + Date.now(), who: "Jij", tekst, at: Date.now() });
    persist();
  });
  root.querySelectorAll("[data-termijn]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const f = data.facturen.find((x) => x.id === btn.dataset.termijn);
      const deel = Math.round(f.bedrag * 0.4);
      data.facturen.unshift({
        id: "f" + Date.now(),
        nr: f.nr + "-T1",
        klant: f.klant,
        titel: "Termijn 40% · " + f.titel,
        bedrag: deel,
        status: "open",
        dag: iso(new Date()),
      });
      f.bedrag = f.bedrag - deel;
      toast("Termijnfactuur 40%");
      persist();
    })
  );
  root.querySelectorAll("[data-doc]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const [soort, id] = btn.dataset.doc.split("|");
      const o = data.offertes.find((x) => x.id === id);
      openPapier(htmlDoc(data, o, soort));
    })
  );
  root.querySelectorAll("[data-print]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const [soort, id] = btn.dataset.print.split("|");
      if (soort === "factuur") {
        const f = data.facturen.find((x) => x.id === id);
        openPapier(htmlFactuur(data, f));
        return;
      }
      const o = data.offertes.find((x) => x.id === id);
      openPapier(htmlOfferte(data, o));
    })
  );
  root.querySelector("form[data-mail]")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const err = form.querySelector("[data-err]");
    if (err) err.hidden = true;
    const f = new FormData(form);
    try {
      await api("/api/mail/stuur", {
        to: f.get("to"),
        subject: f.get("subject"),
        text: f.get("text"),
        fromName: data.firm,
        replyTo: papierVan(data).mail,
      });
      toast("Mail verstuurd");
    } catch (ex) {
      if (err) {
        err.hidden = false;
        err.textContent = ex.message;
      } else toast(ex.message);
    }
  });
  const inbox = root.querySelector("#inbox");
  if (inbox) {
    api("/api/mail/inbox", null, "GET")
      .then((res) => {
        const rows = res.berichten || [];
        inbox.innerHTML = rows.length
          ? rows
              .map(
                (b) =>
                  `<article class="item"><strong>${esc(b.onderwerp || "(geen onderwerp)")}</strong><span>${esc(b.van)} · ${esc(b.datum)}</span><span>${esc((b.tekst || "").slice(0, 400))}</span></article>`
              )
              .join("")
          : `<p class="muted">Nog geen post op ${esc(res.van || "hallo@vakento.nl")}. Zet bij Strato een MX-record naar deze server, anders komt inkomende mail niet aan.</p>`;
      })
      .catch((ex) => {
        inbox.innerHTML = `<p class="warn">${esc(ex.message)}</p>`;
      });
  }
  bindPapier(root, { data, persist, toast });
  bindKantoor(root, { data, persist, toast });
  bindSlim(root, { data, persist, toast });
  const cloudBox = root.querySelector("[data-cloud-app]");
  if (cloudBox) mountCloud(cloudBox);
}

function render() {
  data = load();
  const hash = (location.hash || "#/").split("?")[0];
  nav(hash);
  const view = routes[hash] || viewVandaag;
  const root = $("#stage");
  root.innerHTML = view();
  bind(root);
}

window.addEventListener("hashchange", render);
render();
