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
} from "./store.js?v=boek1";
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
} from "./kantoor.js?v=btw2";
import {
  papierVan,
  previewBrief,
  esc,
  bindPapier,
  htmlOfferte,
  htmlFactuur,
  htmlDoc,
  openPapier,
} from "./papier.js?v=btw1";
import { api } from "./api.js";
import { viewCloud, mountCloud } from "./cloud.js?v=gallery1";
import { viewSlim, bindSlim } from "./slim.js?v=1";
import { viewContacten, bindContacten } from "./contacten.js?v=2";

const $ = (s, r = document) => r.querySelector(s);
let data = load();
let weekStart = monday(new Date());

const routes = {
  "#/": viewVandaag,
  "#/bord": viewBord,
  "#/klussen": viewKlussen,
  "#/contacten": () => viewContacten(data),
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
  "#/boekhouding": viewBoekhouding,
  "#/calculatie": () => viewCalc(data),
  "#/taken": () => viewTaken(data),
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
    <section class="start-full">
      <div class="start-full-intro">
        <p class="kicker">Eerste keer</p>
        <h1>Zet je zaak erin.<br>Daarna het werk.</h1>
        <p class="muted start-full-lead">Vul één keer de basis in. Daarna gebruik je Vakento over het hele scherm voor klanten, planning, administratie en werk.</p>

        <div class="start-full-points">
          <div><strong>Alles op één plek</strong><span>Klanten, opdrachten, uren, bonnen en bestanden.</span></div>
          <div><strong>Telefoon + laptop</strong><span>Overal dezelfde Vakento-werkplaats.</span></div>
          <div><strong>Snel beginnen</strong><span>Alleen je zaak, plaats en eerste opdracht zijn genoeg.</span></div>
        </div>
      </div>

      <form class="card stack start-full-form" data-start>
        <p class="kicker">Bedrijfsgegevens</p>
        <h2>Maak je werkplaats klaar</h2>
        <label>Jouw zaak
          <input name="firm" required value="${data.firm || ""}" placeholder="Jouw bedrijfsnaam">
        </label>
        <label>Plaats
          <input name="place" required placeholder="Bijvoorbeeld Winterswijk">
        </label>
        <label>Eerste klant
          <input name="klant" required placeholder="Naam klant of bedrijf">
        </label>
        <label>Eerste opdracht
          <input name="klus" required placeholder="Bijvoorbeeld onderhoud, advies of project">
        </label>
        <button class="btn" type="submit">Werkplaats openen</button>
      </form>
    </section>

    <div class="start-grid start-full-links">
      <a class="card" href="#/contacten"><p class="kicker">Relaties</p><h3>Contacten</h3><p class="muted">Klanten en leveranciers centraal bewaren.</p></a>
      <a class="card" href="#/papier"><p class="kicker">Administratie</p><h3>Offertes & facturen</h3><p class="muted">Van aanvraag naar betaling.</p></a>
      <a class="card" href="#/cloud"><p class="kicker">Cloud</p><h3>Bestanden</h3><p class="muted">Documenten en foto's bij elkaar.</p></a>
      <a class="card" href="#/slim"><p class="kicker">AI</p><h3>Slim werken</h3><p class="muted">Laat Vakento werk uit handen nemen.</p></a>
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
    <div class="card" style="margin-bottom:18px">
      <p class="kicker">Hoofdmenu abonnement</p>
      <h2 style="margin:4px 0 12px">Belangrijkste onderdelen</h2>
      <div class="start-grid">
        <a class="card" href="#/"><p class="kicker">Vandaag</p><h3>Dagoverzicht</h3><p class="muted">Wat moet er gebeuren</p></a>
        <a class="card" href="#/bord"><p class="kicker">Planning</p><h3>Weekbord</h3><p class="muted">Wie staat waar</p></a>
        <a class="card" href="#/klussen"><p class="kicker">Werk</p><h3>Klussen</h3><p class="muted">${data.klussen.length} dossiers</p></a>
        <a class="card" href="#/contacten"><p class="kicker">Relaties</p><h3>Contacten</h3><p class="muted">${data.klanten.length} klanten & leveranciers</p></a>
        <a class="card" href="#/papier"><p class="kicker">Papier</p><h3>Offertes & facturen</h3><p class="muted">${data.offertes.length} offertes</p></a>
        <a class="card" href="#/uren"><p class="kicker">Tijd</p><h3>Uren</h3><p class="muted">Snel registreren</p></a>
        <a class="card" href="#/boekhouding"><p class="kicker">Boekhouding</p><h3>Boekhouding</h3><p class="muted">Verkoop, inkoop, btw en boekhouder-export</p></a>
        <a class="card" href="/app.html#bon"><p class="kicker">Bonnen</p><h3>Bonnen scannen</h3><p class="muted">Lezen, btw en opslaan</p></a>
        <a class="card" href="#/cloud"><p class="kicker">Cloud</p><h3>Bestanden</h3><p class="muted">5 GB opslag</p></a>
        <a class="card" href="#/winst"><p class="kicker">Financiën</p><h3>Winst</h3><p class="muted">Omzet en kosten</p></a>
        <a class="card" href="#/slim"><p class="kicker">AI</p><h3>Slim werken</h3><p class="muted">AI-assistent</p></a>
        <a class="card" href="/account.html"><p class="kicker">Account</p><h3>Abonnement</h3><p class="muted">Abonnement en app</p></a>
      </div>
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
  return (regels || []).reduce((a, r) => a + Number(r.bedrag || 0), 0);
}

function btwOverzicht(regels) {
  const rows = (regels || []).map((r) => ({
    bedrag: Number(r.bedrag || 0),
    btw: [9, 21].includes(Number(r.btw)) ? Number(r.btw) : 21,
  }));
  const basis9 = rows.filter((r) => r.btw === 9).reduce((a, r) => a + r.bedrag, 0);
  const basis21 = rows.filter((r) => r.btw === 21).reduce((a, r) => a + r.bedrag, 0);
  const btw9 = basis9 * 0.09;
  const btw21 = basis21 * 0.21;
  return {
    excl: basis9 + basis21,
    basis9,
    basis21,
    btw9,
    btw21,
    incl: basis9 + basis21 + btw9 + btw21,
  };
}


function bookNum(v) {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}
function bookRound(v) {
  return Math.round((bookNum(v) + Number.EPSILON) * 100) / 100;
}
function bookMoney(v) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(bookRound(v));
}
function invoiceBookCalc(f) {
  const regels = (f.regels?.length ? f.regels : [{ tekst: f.titel, bedrag: f.bedrag, btw: f.btw || 21 }])
    .map(r => ({ bedrag: bookNum(r.bedrag), btw: [0,9,21].includes(Number(r.btw)) ? Number(r.btw) : 21 }));
  const ex9 = bookRound(regels.filter(r=>r.btw===9).reduce((s,r)=>s+r.bedrag,0));
  const ex21 = bookRound(regels.filter(r=>r.btw===21).reduce((s,r)=>s+r.bedrag,0));
  const ex0 = bookRound(regels.filter(r=>r.btw===0).reduce((s,r)=>s+r.bedrag,0));
  const vat9 = bookRound(ex9*.09);
  const vat21 = bookRound(ex21*.21);
  return { ex9, ex21, ex0, vat9, vat21, ex:bookRound(ex9+ex21+ex0), vat:bookRound(vat9+vat21), incl:bookRound(ex9+ex21+ex0+vat9+vat21) };
}
function purchaseBookCalc(x) {
  const rate = [0,9,21].includes(Number(x.btw)) ? Number(x.btw) : null;
  let gross = bookNum(x.bedragInclBtw || x.bedrag);
  let net = bookNum(x.bedragExclBtw);
  let vat = bookNum(x.btwBedrag);
  if (!net && gross && rate !== null) net = rate ? bookRound(gross/(1+rate/100)) : gross;
  if (!vat && gross && net) vat = bookRound(gross-net);
  if (!gross && net) gross = bookRound(net+vat);
  return { gross:bookRound(gross), net:bookRound(net), vat:bookRound(vat), rate, deductible:x.btwAftrekbaar === true, category:x.categorie || "4999" };
}
function bookPeriod(date, year, quarter) {
  const d = String(date || "");
  if (!d.startsWith(String(year))) return false;
  if (quarter === "all") return true;
  const m = Number(d.slice(5,7));
  return Math.ceil(m/3) === Number(quarter);
}
function bookTotals() {
  data.boekhouding ||= { jaar:new Date().getFullYear(), kwartaal:"all" };
  const year = Number(data.boekhouding.jaar || new Date().getFullYear());
  const quarter = String(data.boekhouding.kwartaal || "all");
  const sales = (data.facturen||[]).filter(f=>bookPeriod(f.dag,year,quarter)).map(f=>({f,c:invoiceBookCalc(f)}));
  const purchases = (data.inkoop||[]).filter(x=>bookPeriod(x.dag||x.datum,year,quarter)).map(x=>({x,c:purchaseBookCalc(x)}));
  const salesEx = bookRound(sales.reduce((s,x)=>s+x.c.ex,0));
  const salesVat = bookRound(sales.reduce((s,x)=>s+x.c.vat,0));
  const purchaseEx = bookRound(purchases.reduce((s,x)=>s+x.c.net,0));
  const inputVat = bookRound(purchases.reduce((s,x)=>s+(x.c.deductible?x.c.vat:0),0));
  const open = bookRound(sales.filter(x=>x.f.status==="open").reduce((s,x)=>s+x.c.incl,0));
  const review = purchases.filter(({x,c})=>c.rate===null || !x.categorie || x.btwAftrekbaar==null).length;
  return {year,quarter,sales,purchases,salesEx,salesVat,purchaseEx,inputVat,result:bookRound(salesEx-purchaseEx),vatDue:bookRound(salesVat-inputVat),open,review};
}
function bookCsv(rows) {
  const cell = v => '"' + String(v ?? "").replace(/"/g,'""') + '"';
  return "\uFEFF" + rows.map(r=>r.map(cell).join(";")).join("\r\n");
}
function downloadBookBlob(content, name, type="text/csv;charset=utf-8") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content],{type}));
  a.download = name;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
function bookPackageFiles() {
  const t = bookTotals();
  const sales = [["Datum","Factuurnummer","Klant","Omschrijving","Excl 9%","BTW 9%","Excl 21%","BTW 21%","Excl 0%","Totaal excl","Totaal btw","Totaal incl","Status","Betaald op"]];
  t.sales.forEach(({f,c})=>sales.push([f.dag||"",f.nr||"",klant(data,f.klant)?.name||"",f.titel||"",c.ex9,c.vat9,c.ex21,c.vat21,c.ex0,c.ex,c.vat,c.incl,f.status||"",f.betaaldOp||""]));
  const purchases = [["Datum","Leverancier","Omschrijving","Categorie","Excl btw","BTW %","BTW bedrag","BTW aftrekbaar","Incl btw","Betaalwijze","Status","Bonbestand"]];
  t.purchases.forEach(({x,c})=>purchases.push([x.dag||x.datum||"",x.leverancier||"",x.tekst||x.notitie||"",x.categorie||"4999",c.net,c.rate??"",c.vat,x.btwAftrekbaar===true?"ja":x.btwAftrekbaar===false?"nee":"controle",c.gross,x.betaaldMet||x.betaalwijze||"",x.status||"betaald",x.bestand||""]));
  const vat = [["Onderdeel","Grondslag","BTW"],
    ["Verkoop 9%",bookRound(t.sales.reduce((s,x)=>s+x.c.ex9,0)),bookRound(t.sales.reduce((s,x)=>s+x.c.vat9,0))],
    ["Verkoop 21%",bookRound(t.sales.reduce((s,x)=>s+x.c.ex21,0)),bookRound(t.sales.reduce((s,x)=>s+x.c.vat21,0))],
    ["Verkoop 0%",bookRound(t.sales.reduce((s,x)=>s+x.c.ex0,0)),0],
    ["Voorbelasting aftrekbaar","",t.inputVat],
    ["Indicatief BTW-saldo","",t.vatDue]
  ];
  const open = [["Soort","Datum","Nummer","Relatie","Bedrag incl","Status"]];
  t.sales.filter(x=>x.f.status==="open").forEach(({f,c})=>open.push(["Verkoop",f.dag||"",f.nr||"",klant(data,f.klant)?.name||"",c.incl,"open"]));
  t.purchases.filter(x=>x.x.status==="open").forEach(({x,c})=>open.push(["Inkoop",x.dag||x.datum||"",x.factuurnr||x.id,x.leverancier||"",c.gross,"open"]));
  const checks = [["Soort","Referentie","Controlepunt"]];
  t.purchases.forEach(({x,c})=>{
    const ref=x.id||x.bestand||"inkoop";
    if(c.rate===null) checks.push(["Inkoop",ref,"BTW-tarief ontbreekt"]);
    if(!x.categorie) checks.push(["Inkoop",ref,"Categorie ontbreekt"]);
    if(x.btwAftrekbaar==null) checks.push(["Inkoop",ref,"BTW-aftrek nog beoordelen"]);
  });
  const period = t.quarter==="all" ? String(t.year) : t.year+"-Q"+t.quarter;
  const readme = `Vakento boekhouderspakket ${period}

Inhoud:
- verkoopboek.csv
- inkoopboek.csv
- btw-overzicht.csv
- openstaande-posten.csv
- controlepunten.csv
- data-backup.json

Dit pakket is voorbereid voor de boekhouder. Laat de boekhouder altijd rubricering, fiscale correcties, privégebruik, investeringen/afschrijvingen en btw-aangifte controleren.`;
  return {
    period,
    files:{
      "00-LEESMIJ.txt":readme,
      "01-verkoopboek.csv":bookCsv(sales),
      "02-inkoopboek.csv":bookCsv(purchases),
      "03-btw-overzicht.csv":bookCsv(vat),
      "04-openstaande-posten.csv":bookCsv(open),
      "05-controlepunten.csv":bookCsv(checks),
      "06-data-backup.json":JSON.stringify({exportedAt:new Date().toISOString(),period:{year:t.year,quarter:t.quarter},data},null,2)
    }
  };
}
function viewBoekhouding() {
  data.boekhouding ||= { jaar:new Date().getFullYear(), kwartaal:"all" };
  const t = bookTotals();
  const years = [...new Set([new Date().getFullYear(),...(data.facturen||[]).map(x=>Number(String(x.dag||"").slice(0,4))).filter(Boolean),...(data.inkoop||[]).map(x=>Number(String(x.dag||x.datum||"").slice(0,4))).filter(Boolean)])].sort((a,b)=>b-a);
  return `
    <div class="row"><div><p class="kicker">Boekhouding</p><h1>Klaar voor je boekhouder.</h1>
    <p class="muted">Verkoop, inkoop, btw en open posten in één overzicht.</p></div>
    <div class="actions"><a class="btn btn-ghost" href="/app.html#bon">Bon scannen</a><button class="btn" data-book-export>Boekhouderspakket ZIP</button></div></div>

    <form class="card stack" data-book-filter style="margin-bottom:18px">
      <div class="grid-2">
        <label>Jaar<select name="year">${years.map(y=>`<option value="${y}" ${Number(y)===Number(t.year)?"selected":""}>${y}</option>`).join("")}</select></label>
        <label>Periode<select name="quarter">
          <option value="all" ${t.quarter==="all"?"selected":""}>Heel jaar</option>
          <option value="1" ${t.quarter==="1"?"selected":""}>Kwartaal 1</option>
          <option value="2" ${t.quarter==="2"?"selected":""}>Kwartaal 2</option>
          <option value="3" ${t.quarter==="3"?"selected":""}>Kwartaal 3</option>
          <option value="4" ${t.quarter==="4"?"selected":""}>Kwartaal 4</option>
        </select></label>
      </div>
      <button class="btn btn-ghost" type="submit">Toon periode</button>
    </form>

    <div class="stat-grid">
      <div class="stat"><span>Omzet excl.</span><b>${bookMoney(t.salesEx)}</b></div>
      <div class="stat"><span>Kosten excl.</span><b>${bookMoney(t.purchaseEx)}</b></div>
      <div class="stat"><span>Resultaat*</span><b>${bookMoney(t.result)}</b></div>
      <div class="stat"><span>BTW verkoop</span><b>${bookMoney(t.salesVat)}</b></div>
      <div class="stat"><span>Voorbelasting</span><b>${bookMoney(t.inputVat)}</b></div>
      <div class="stat"><span>BTW-saldo*</span><b>${bookMoney(t.vatDue)}</b></div>
      <div class="stat"><span>Open te ontvangen</span><b>${bookMoney(t.open)}</b></div>
      <div class="stat"><span>Controlepunten</span><b class="${t.review?"warn":"ok"}">${t.review}</b></div>
    </div>
    <p class="muted">* Indicatief. De boekhouder controleert fiscale correcties, privégebruik, investeringen, afschrijvingen en aftrekbaarheid.</p>

    <section class="card" style="margin-top:18px">
      <p class="kicker">Nieuwe inkoopboeking</p><h2>Kosten vastleggen</h2>
      <form class="stack" data-book-purchase>
        <div class="grid-2"><label>Datum<input name="date" type="date" value="${iso(new Date())}" required></label><label>Leverancier<input name="supplier" required></label></div>
        <label>Omschrijving<input name="text"></label>
        <div class="grid-2"><label>Bedrag incl. btw<input name="gross" type="number" step=".01" min="0" required></label><label>BTW<select name="vat"><option value="21">21%</option><option value="9">9%</option><option value="0">0%</option></select></label></div>
        <label>Categorie<select name="category"><option value="4000">4000 · Inkoop materialen</option><option value="4100">4100 · Uitbesteed werk</option><option value="4200">4200 · Gereedschap en klein materiaal</option><option value="4300">4300 · Auto en vervoer</option><option value="4500">4500 · Kantoor en administratie</option><option value="4600">4600 · Telefoon, internet en software</option><option value="4700">4700 · Reclame en verkoop</option><option value="4800">4800 · Verzekeringen en bankkosten</option><option value="4900">4900 · Overige bedrijfskosten</option><option value="4999" selected>4999 · Te rubriceren</option></select></label>
        <div class="grid-2"><label>Betaalwijze<select name="paidWith"><option>Bank</option><option>Pin / betaalpas</option><option>Creditcard</option><option>Contant</option></select></label><label>Status<select name="status"><option value="betaald">Betaald</option><option value="open">Nog te betalen</option></select></label></div>
        <label style="display:flex;gap:9px;align-items:flex-start"><input type="checkbox" name="deductible" value="1"><span><strong>BTW aftrekbaar</strong><br><span class="muted">Alleen aanvinken als je zeker weet dat deze btw zakelijk aftrekbaar is.</span></span></label>
        <button class="btn" type="submit">Boeking bewaren</button>
      </form>
    </section>

    <h2 style="margin-top:22px">Verkoopboek</h2>
    <div class="table-wrap"><table class="table"><thead><tr><th>Datum</th><th>Nr</th><th>Klant</th><th>Excl.</th><th>BTW</th><th>Incl.</th><th>Status</th></tr></thead><tbody>
      ${t.sales.map(({f,c})=>`<tr><td>${esc(f.dag||"")}</td><td>${esc(f.nr||"")}</td><td>${esc(klant(data,f.klant)?.name||"")}</td><td>${bookMoney(c.ex)}</td><td>${bookMoney(c.vat)}</td><td>${bookMoney(c.incl)}</td><td>${esc(f.status||"")}</td></tr>`).join("") || '<tr><td colspan="7">Geen verkoopfacturen.</td></tr>'}
    </tbody></table></div>

    <h2 style="margin-top:22px">Inkoopboek</h2>
    <div class="table-wrap"><table class="table"><thead><tr><th>Datum</th><th>Leverancier</th><th>Categorie</th><th>Excl.</th><th>BTW</th><th>Incl.</th><th>Controle</th></tr></thead><tbody>
      ${t.purchases.map(({x,c})=>`<tr><td>${esc(x.dag||x.datum||"")}</td><td>${esc(x.leverancier||"")}</td><td>${esc(x.categorie||"4999")}</td><td>${bookMoney(c.net)}</td><td>${c.rate==null?"?":c.rate+"%"} · ${bookMoney(c.vat)}</td><td>${bookMoney(c.gross)}</td><td class="${c.rate===null||!x.categorie||x.btwAftrekbaar==null?"warn":"ok"}">${c.rate===null||!x.categorie||x.btwAftrekbaar==null?"Nakijken":"Compleet"}</td></tr>`).join("") || '<tr><td colspan="7">Geen inkoopboekingen.</td></tr>'}
    </tbody></table></div>
  `;
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
      <label>Opdracht<textarea name="vraag" rows="3" required placeholder="Beschrijf de opdracht"></textarea></label>
      <label>BTW-categorie
        <select name="btwCategorie">
          <option value="standaard21">21% standaard</option>
          <option value="schilder9">9% schilderwerk woning ouder dan 2 jaar</option>
          <option value="stukadoor9">9% stukadoorswerk woning ouder dan 2 jaar</option>
          <option value="behang9">9% behangen woning ouder dan 2 jaar</option>
          <option value="isolatieMix">Isolatie: arbeid 9%, materiaal 21%</option>
          <option value="schoonmaak9">9% schoonmaak in woning</option>
        </select>
      </label>
      <p class="muted">Vakento splitst 9% en 21% op de offerte en factuur. Controleer altijd of de werkzaamheden aan de voorwaarden voldoen.</p>
      <button class="btn" type="submit">Maak offerte met AI</button>
    </form>
    <h2 style="margin-top:22px">Offertes</h2>
    <div class="list" style="margin:10px 0 24px">
      ${data.offertes
        .map((o) => {
          const btw = btwOverzicht(o.regels);
          return `<article class="item offer-vat-card">
            <div class="row offer-vat-head">
              <div>
                <strong>${o.nr} · ${o.titel}</strong>
                <span class="muted">${klant(data, o.klant).name} · ${o.status}</span>
              </div>
              <div class="offer-vat-total">
                <small>Incl. btw</small>
                <strong>${euro(btw.incl)}</strong>
              </div>
            </div>

            <div class="offer-vat-lines">
              ${(o.regels || []).map((r, index) => {
                const tarief = [9, 21].includes(Number(r.btw)) ? Number(r.btw) : 21;
                return `<div class="offer-vat-line">
                  <div>
                    <strong>${esc(r.tekst || "Regel")}</strong>
                    <span class="muted">${euro(Number(r.bedrag || 0))} excl. btw</span>
                  </div>
                  <label>BTW
                    <select data-offerte-btw="${o.id}|${index}">
                      <option value="9" ${tarief === 9 ? "selected" : ""}>9%</option>
                      <option value="21" ${tarief === 21 ? "selected" : ""}>21%</option>
                    </select>
                  </label>
                </div>`;
              }).join("")}
            </div>

            <div class="offer-vat-summary">
              ${btw.basis9 ? `<span>9%: ${euro(btw.basis9)} + ${euro(btw.btw9)} btw</span>` : ""}
              ${btw.basis21 ? `<span>21%: ${euro(btw.basis21)} + ${euro(btw.btw21)} btw</span>` : ""}
              <strong>Excl. btw ${euro(btw.excl)}</strong>
            </div>

            <div class="actions">
              <button class="btn btn-ghost" data-print="offerte|${o.id}">Briefpapier</button>
              ${o.status !== "akkoord" ? `<button class="btn" data-ok="${o.id}">Zet op akkoord</button>` : `<button class="btn btn-ghost" data-doc="bevestiging|${o.id}">Opdrachtbevestiging</button><button class="btn btn-ghost" data-doc="pakbon|${o.id}">Pakbon</button>`}
            </div>
          </article>`;
        })
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
    const btwCategorie = String(f.get("btwCategorie") || "standaard21");
    if (!klantId) {
      toast("Eerst een klant");
      return;
    }
    toast("Calculeren");
    const local = offerteUitTekst(vraag, data.place);
    const out = await verrijkMetServer("offerte", local, { vraag, plaats: data.place });
    const bronRegels = out.regels || local.regels;
    const regelBtw = (r) => {
      const tekst = String(r?.tekst || "").toLowerCase();
      if (btwCategorie === "standaard21") return 21;
      if (["schilder9", "stukadoor9", "behang9", "schoonmaak9"].includes(btwCategorie)) return 9;
      if (btwCategorie === "isolatieMix") {
        const materiaal = /(materiaal|isolatieplaat|isolatiemateriaal|pir|pur|glaswol|steenwol|eps|xps|folie|regelwerk|bevestiging)/i.test(tekst);
        return materiaal ? 21 : 9;
      }
      return 21;
    };
    const regels = (bronRegels || []).map((r) => ({ ...r, btw: regelBtw(r) }));
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
      btwCategorie,
    });
    toast("Offerte klaar");
    persist();
  });
  root.querySelectorAll("[data-offerte-btw]").forEach((select) => {
    select.addEventListener("change", () => {
      const [offerteId, indexRaw] = String(select.dataset.offerteBtw || "").split("|");
      const index = Number(indexRaw);
      const offerte = data.offertes.find((o) => o.id === offerteId);
      const regel = offerte?.regels?.[index];
      if (!regel) return;
      regel.btw = Number(select.value) === 9 ? 9 : 21;

      // Nieuwe/open facturen van dezelfde klus bijwerken als ze al bestaan.
      data.facturen
        .filter((f) => f.klus && f.klus === offerte.klus && f.status === "open")
        .forEach((f) => {
          f.regels = offerte.regels.map((r) => ({ ...r }));
          f.bedrag = som(f.regels);
        });

      toast("BTW aangepast naar " + regel.btw + "%");
      persist();
    });
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
      const offerte = data.offertes.find((o) => o.klus === k.id);
      const regels = offerte?.regels?.length
        ? offerte.regels.map((r) => ({ ...r, btw: [0, 9, 21].includes(Number(r.btw)) ? Number(r.btw) : 21 }))
        : [{ tekst: k.title, bedrag: k.begroot, btw: 21 }];
      data.facturen.unshift({
        id: "f" + Date.now(),
        nr: "FAC-" + (880 + data.facturen.length),
        klant: k.klant,
        klus: k.id,
        titel: k.title,
        bedrag: k.begroot,
        regels,
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
      const factuur = data.facturen.find((f) => f.id === btn.dataset.betaald);
      if (!factuur) return;
      factuur.status = "betaald";
      factuur.betaaldOp = iso(new Date());
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
  root.querySelector("[data-book-filter]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    data.boekhouding = { jaar:Number(f.get("year")), kwartaal:String(f.get("quarter")||"all") };
    persist();
  });

  root.querySelector("[data-book-purchase]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const gross = bookNum(f.get("gross"));
    const rate = Number(f.get("vat"));
    const net = rate ? bookRound(gross/(1+rate/100)) : gross;
    const vat = bookRound(gross-net);
    data.inkoop ||= [];
    data.inkoop.unshift({
      id:"bk"+Date.now(),
      dag:String(f.get("date")),
      leverancier:String(f.get("supplier")||"").trim(),
      tekst:String(f.get("text")||"").trim(),
      bedrag:gross,
      bedragInclBtw:gross,
      bedragExclBtw:net,
      btwBedrag:vat,
      btw:rate,
      btwAftrekbaar:f.get("deductible")==="1",
      categorie:String(f.get("category")||"4999"),
      betaaldMet:String(f.get("paidWith")||"Bank"),
      status:String(f.get("status")||"betaald"),
      bron:"handmatig"
    });
    toast("Inkoopboeking bewaard");
    persist();
  });

  root.querySelector("[data-book-export]")?.addEventListener("click", async () => {
    const pack = bookPackageFiles();
    if (window.JSZip) {
      const zip = new window.JSZip();
      Object.entries(pack.files).forEach(([name,content])=>zip.file(name,content));
      const blob = await zip.generateAsync({type:"blob"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Vakento-boekhouderspakket-"+pack.period+".zip";
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),2000);
      toast("Boekhouderspakket is klaar");
    } else {
      downloadBookBlob(pack.files["01-verkoopboek.csv"],"Vakento-"+pack.period+"-verkoopboek.csv");
      toast("ZIP-module niet geladen; verkoopboek los gedownload");
    }
  });

  bindPapier(root, { data, persist, toast });
  bindKantoor(root, { data, persist, toast });
  bindSlim(root, { data, persist, toast });
  bindContacten(root, { data, toast });
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
