import { euro, klant, iso } from "./store.js?v=boekplus1";

const n = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};
const round = (v) => Math.round((n(v) + Number.EPSILON) * 100) / 100;
const esc = (v) => String(v ?? "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function invoiceCalc(f) {
  const rows = (f.regels?.length ? f.regels : [{ bedrag:f.bedrag, btw:f.btw ?? 21 }])
    .map(r => ({ amount:n(r.bedrag), vat:[0,9,21].includes(Number(r.btw)) ? Number(r.btw) : 21 }));
  const ex = round(rows.reduce((s,r)=>s+r.amount,0));
  const vat = round(rows.reduce((s,r)=>s+r.amount*r.vat/100,0));
  return { ex, vat, gross:round(ex+vat) };
}

function purchaseCalc(x) {
  const gross = n(x.bedragInclBtw || x.bedrag);
  const rate = [0,9,21].includes(Number(x.btw)) ? Number(x.btw) : null;
  let net = n(x.bedragExclBtw);
  let vat = n(x.btwBedrag);
  if (!net && gross && rate !== null) net = rate ? round(gross/(1+rate/100)) : gross;
  if (!vat && gross && net) vat = round(gross-net);
  return { gross:round(gross || net+vat), net:round(net || gross-vat), vat:round(vat) };
}

function onDate(value) {
  const d = new Date(String(value || "") + (String(value || "").length === 10 ? "T12:00:00" : ""));
  return Number.isFinite(d.getTime()) ? d : null;
}

function assetBookValue(asset, atDate) {
  const start = onDate(asset.date);
  if (!start) return { depreciation:0, book:n(asset.amount), monthly:0 };
  const cost = Math.max(0,n(asset.amount));
  const residual = Math.max(0,Math.min(cost,n(asset.residual)));
  const monthsTotal = Math.max(1,Math.round(n(asset.years || 5)*12));
  const monthly = (cost-residual)/monthsTotal;
  const months = Math.max(0,Math.min(monthsTotal,
    (atDate.getFullYear()-start.getFullYear())*12 + (atDate.getMonth()-start.getMonth()) + (atDate.getDate()>=start.getDate()?1:0)
  ));
  const depreciation = Math.min(cost-residual,round(monthly*months));
  return { depreciation, book:round(cost-depreciation), monthly:round(monthly) };
}

function yearDepreciation(asset, year) {
  const prev = assetBookValue(asset, new Date(year-1,11,31)).depreciation;
  const curr = assetBookValue(asset, new Date(year,11,31)).depreciation;
  return Math.max(0,round(curr-prev));
}

function totals(data, year) {
  const sales=(data.facturen||[]).filter(f=>String(f.dag||"").startsWith(String(year)));
  const purchases=(data.inkoop||[]).filter(x=>String(x.dag||x.datum||"").startsWith(String(year)));
  const revenue=round(sales.reduce((s,f)=>s+invoiceCalc(f).ex,0));
  const salesVat=round(sales.reduce((s,f)=>s+invoiceCalc(f).vat,0));
  const costs=round(purchases.reduce((s,x)=>s+purchaseCalc(x).net,0));
  const inputVat=round(purchases.reduce((s,x)=>s+(x.btwAftrekbaar===true?purchaseCalc(x).vat:0),0));
  const depreciation=round((data.activa||[]).reduce((s,a)=>s+yearDepreciation(a,year),0));
  const result=round(revenue-costs-depreciation);
  const openReceivables=round((data.facturen||[])
    .filter(f=>f.status==="open" && String(f.dag||"").slice(0,4)<=String(year))
    .reduce((s,f)=>s+invoiceCalc(f).gross,0));
  const openPayables=round((data.inkoop||[])
    .filter(x=>x.status==="open" && String(x.dag||x.datum||"").slice(0,4)<=String(year))
    .reduce((s,x)=>s+purchaseCalc(x).gross,0));
  const fixedAssets=round((data.activa||[]).reduce((s,a)=>s+assetBookValue(a,new Date(year,11,31)).book,0));
  const bankOpening=n(data.boekhoudingPlus?.bankOpeningBalance);
  const bank=round(bankOpening+(data.bankMutaties||[])
    .filter(x=>String(x.date||"").slice(0,4)<=String(year))
    .reduce((s,x)=>s+n(x.amount),0));
  const vatBalance=round(salesVat-inputVat);
  const bankAsset=Math.max(0,bank);
  const bankDebt=Math.max(0,-bank);
  const vatAsset=Math.max(0,-vatBalance);
  const vatDebt=Math.max(0,vatBalance);
  const assets=round(bankAsset+openReceivables+fixedAssets+vatAsset);
  const liabilities=round(bankDebt+openPayables+vatDebt);
  const equity=round(assets-liabilities);
  return {sales,purchases,revenue,salesVat,costs,inputVat,depreciation,result,openReceivables,openPayables,fixedAssets,bank,vatBalance,bankAsset,bankDebt,vatAsset,vatDebt,assets,liabilities,equity};
}

function nextDate(date, frequency) {
  const d=onDate(date)||new Date();
  if(frequency==="quarter") d.setMonth(d.getMonth()+3);
  else if(frequency==="year") d.setFullYear(d.getFullYear()+1);
  else d.setMonth(d.getMonth()+1);
  return iso(d);
}

function parseMoney(v) {
  let s=String(v??"").trim().replace(/\s/g,"").replace(/€/g,"");
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",")>s.lastIndexOf(".")) s=s.replace(/\./g,"").replace(",",".");
    else s=s.replace(/,/g,"");
  } else if (s.includes(",")) s=s.replace(/\./g,"").replace(",",".");
  return Number(s)||0;
}

function parseDate(v) {
  const s=String(v??"").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
  if(m) return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");
  const d=new Date(s);
  return Number.isFinite(d.getTime())?iso(d):"";
}

function csvRows(text) {
  const first=(text.split(/\r?\n/)[0]||"");
  const delimiter=(first.split(";").length>=first.split(",").length)?";":",";
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted && text[i+1]==='"'){cell+='"';i++;} else quoted=!quoted;
    } else if(ch===delimiter && !quoted){row.push(cell);cell="";}
    else if((ch==="\n"||ch==="\r")&&!quoted){
      if(ch==="\r"&&text[i+1]==="\n") i++;
      row.push(cell); if(row.some(x=>String(x).trim()!=="")) rows.push(row); row=[];cell="";
    } else cell+=ch;
  }
  row.push(cell); if(row.some(x=>String(x).trim()!=="")) rows.push(row);
  return rows;
}

function normalizeHeader(v){return String(v??"").replace(/^\uFEFF/,"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"");}

function importBankCsv(text) {
  const rows=csvRows(text);
  if(rows.length<2) return [];
  const headers=rows[0].map(normalizeHeader);
  const pick=(names)=>headers.findIndex(h=>names.includes(h));
  const dateIdx=pick(["datum","date","boekdatum","transactiedatum","valutadatum"]);
  const descIdx=pick(["omschrijving","description","mededelingen","naamtegenpartij","tegenpartij","details","omschrijving1"]);
  const amountIdx=pick(["bedrag","amount","bedrageur","transactiebedrag"]);
  const debitIdx=pick(["af","debit","debet"]);
  const creditIdx=pick(["bij","credit","creditbedrag"]);
  if(dateIdx<0 || (amountIdx<0 && debitIdx<0 && creditIdx<0)) return [];
  return rows.slice(1).map((r,idx)=>{
    const amount=amountIdx>=0?parseMoney(r[amountIdx]):round(parseMoney(r[creditIdx])-parseMoney(r[debitIdx]));
    const date=parseDate(r[dateIdx]);
    const description=descIdx>=0?String(r[descIdx]||"").trim():"Bankmutatie";
    return {id:"bank-"+Date.now()+"-"+idx,date,description,amount,status:"open"};
  }).filter(x=>x.date && x.amount);
}

function findMatch(data, tx) {
  if(n(tx.amount)<=0 || tx.invoiceId) return null;
  const candidates=(data.facturen||[]).filter(f=>f.status==="open" && Math.abs(invoiceCalc(f).gross-n(tx.amount))<0.03);
  if(candidates.length===1) return candidates[0];
  if(candidates.length>1){
    const desc=String(tx.description||"").toLowerCase();
    const named=candidates.filter(f=>desc.includes(String(klant(data,f.klant)?.name||"").toLowerCase()));
    if(named.length===1) return named[0];
  }
  return null;
}

function audit(data, action, detail="") {
  data.auditLog ||= [];
  data.auditLog.unshift({id:"log-"+Date.now()+"-"+Math.random(),at:new Date().toISOString(),action,detail});
  data.auditLog=data.auditLog.slice(0,250);
}

export function viewBoekhoudingPlus(data) {
  data.boekhoudingPlus ||= {};
  const year=Number(data.boekhoudingPlus.year||new Date().getFullYear());
  const t=totals(data,year);
  const assets=data.activa||[];
  const recurring=data.periodiekeFacturen||[];
  const bank=(data.bankMutaties||[]).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,30);
  const logs=(data.auditLog||[]).slice(0,25);
  const yearOptions=Array.from({length:5},(_,i)=>new Date().getFullYear()-i).map(y=>`<option value="${y}" ${y===year?"selected":""}>${y}</option>`).join("");

  return `
  <div class="row">
    <div>
      <p class="kicker">Boekhouding Plus</p>
      <h1>Meer boekhouden, zonder het moeilijk te maken.</h1>
      <p class="muted">Balans, resultaat, activa, periodieke facturen en bankmatching. De fiscale aangifte blijft pas definitief na controle en koppeling met externe diensten.</p>
    </div>
  </div>

  <form class="card stack" data-bp-year style="margin-bottom:16px">
    <label>Boekjaar<select name="year">${yearOptions}</select></label>
  </form>

  <div class="stat-grid">
    <div class="stat"><span class="muted">Omzet excl. btw</span><b>${euro(t.revenue)}</b></div>
    <div class="stat"><span class="muted">Kosten excl. btw</span><b>${euro(t.costs)}</b></div>
    <div class="stat"><span class="muted">Afschrijvingen</span><b>${euro(t.depreciation)}</b></div>
    <div class="stat"><span class="muted">Resultaat</span><b class="${t.result<0?"warn":"ok"}">${euro(t.result)}</b></div>
  </div>

  <div class="grid-2" style="margin-top:16px">
    <section class="card">
      <p class="kicker">Resultatenrekening</p>
      <h2>${year}</h2>
      <table class="table"><tbody>
        <tr><td>Omzet</td><td class="money">${euro(t.revenue)}</td></tr>
        <tr><td>Inkoop en kosten</td><td class="money">-${euro(t.costs)}</td></tr>
        <tr><td>Afschrijvingen</td><td class="money">-${euro(t.depreciation)}</td></tr>
        <tr><th>Resultaat</th><th class="money">${euro(t.result)}</th></tr>
      </tbody></table>
    </section>
    <section class="card">
      <p class="kicker">Conceptbalans</p>
      <h2>31-12-${year}</h2>
      <table class="table"><tbody>
        <tr><td>Bank</td><td class="money">${euro(t.bankAsset)}</td></tr>
        <tr><td>Debiteuren</td><td class="money">${euro(t.openReceivables)}</td></tr>
        <tr><td>Bedrijfsmiddelen</td><td class="money">${euro(t.fixedAssets)}</td></tr>
        <tr><td>BTW te ontvangen</td><td class="money">${euro(t.vatAsset)}</td></tr>
        <tr><th>Totaal activa</th><th class="money">${euro(t.assets)}</th></tr>
        <tr><td>Bank / roodstand</td><td class="money">${euro(t.bankDebt)}</td></tr>
        <tr><td>Crediteuren</td><td class="money">${euro(t.openPayables)}</td></tr>
        <tr><td>BTW te betalen</td><td class="money">${euro(t.vatDebt)}</td></tr>
        <tr><td>Eigen vermogen / sluitpost</td><td class="money">${euro(t.equity)}</td></tr>
      </tbody></table>
      <p class="muted">Concept: een definitieve balans vereist beginsaldi, volledige bankmutaties en fiscale controle.</p>
    </section>
  </div>

  <section class="card" style="margin-top:16px">
    <div class="row"><div><p class="kicker">Bedrijfsmiddelen</p><h2>Activa & afschrijvingen</h2></div></div>
    <form class="stack" data-asset-form>
      <div class="grid-2">
        <label>Omschrijving<input name="name" required placeholder="Bijv. bedrijfsbus"></label>
        <label>Aankoopdatum<input name="date" type="date" required></label>
        <label>Aanschafwaarde excl. btw<input name="amount" type="number" step="0.01" min="0" required></label>
        <label>Restwaarde<input name="residual" type="number" step="0.01" min="0" value="0"></label>
        <label>Afschrijven in jaren<input name="years" type="number" step="1" min="1" value="5" required></label>
      </div>
      <button class="btn" type="submit">Bedrijfsmiddel toevoegen</button>
    </form>
    <div class="table-wrap" style="margin-top:14px"><table class="table">
      <thead><tr><th>Bedrijfsmiddel</th><th>Aanschaf</th><th>Afschrijving ${year}</th><th>Boekwaarde</th><th></th></tr></thead>
      <tbody>${assets.length?assets.map(a=>`<tr><td>${esc(a.name)}<br><span class="muted">${esc(a.date)}</span></td><td class="money">${euro(n(a.amount))}</td><td class="money">${euro(yearDepreciation(a,year))}</td><td class="money">${euro(assetBookValue(a,new Date(year,11,31)).book)}</td><td><button class="btn btn-ghost" data-asset-delete="${esc(a.id)}">Verwijderen</button></td></tr>`).join(""):'<tr><td colspan="5">Nog geen bedrijfsmiddelen.</td></tr>'}</tbody>
    </table></div>
  </section>

  <section class="card" style="margin-top:16px">
    <div class="row"><div><p class="kicker">Automatiseren</p><h2>Periodieke facturen</h2></div></div>
    <form class="stack" data-recurring-form>
      <div class="grid-2">
        <label>Klant<select name="customer" required><option value="">Kies klant</option>${(data.klanten||[]).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select></label>
        <label>Omschrijving<input name="title" required placeholder="Bijv. maandabonnement"></label>
        <label>Bedrag excl. btw<input name="amount" type="number" step="0.01" min="0" required></label>
        <label>BTW<select name="vat"><option value="21">21%</option><option value="9">9%</option><option value="0">0%</option></select></label>
        <label>Herhalen<select name="frequency"><option value="month">Maandelijks</option><option value="quarter">Per kwartaal</option><option value="year">Jaarlijks</option></select></label>
        <label>Volgende factuur<input name="next" type="date" required></label>
      </div>
      <button class="btn" type="submit">Periodieke factuur opslaan</button>
    </form>
    <div class="list" style="margin-top:14px">${recurring.length?recurring.map(r=>`<article class="item"><strong>${esc(r.title)} · ${euro(n(r.amount))}</strong><span>${esc(klant(data,r.customer)?.name)} · volgende: ${esc(r.next)} · ${r.frequency==="month"?"maandelijks":r.frequency==="quarter"?"per kwartaal":"jaarlijks"}</span><div class="actions"><button class="btn" data-recurring-generate="${esc(r.id)}">Maak factuur nu</button><button class="btn btn-ghost" data-recurring-delete="${esc(r.id)}">Verwijderen</button></div></article>`).join(""):'<article class="item">Nog geen periodieke facturen.</article>'}</div>
  </section>

  <section class="card" style="margin-top:16px">
    <div class="row"><div><p class="kicker">Bank</p><h2>Bankbestand & automatisch matchen</h2></div><button class="btn btn-ghost" type="button" data-bank-auto>Koppel duidelijke matches</button></div>
    <p class="muted">Je kunt nu al CSV-bankmutaties importeren. Een echte live bankkoppeling komt via een PSD2/Open Banking-provider.</p>
    <label>Bank CSV<input type="file" accept=".csv,text/csv" data-bank-file></label>
    <div class="table-wrap" style="margin-top:14px"><table class="table">
      <thead><tr><th>Datum</th><th>Omschrijving</th><th>Bedrag</th><th>Match</th></tr></thead>
      <tbody>${bank.length?bank.map(tx=>{const m=findMatch(data,tx);const linked=(data.facturen||[]).find(f=>f.id===tx.invoiceId);return `<tr><td>${esc(tx.date)}</td><td>${esc(tx.description)}</td><td class="money">${euro(n(tx.amount))}</td><td>${linked?`<span class="ok">${esc(linked.nr)} gekoppeld</span>`:m?`<button class="btn btn-ghost" data-bank-match="${esc(tx.id)}|${esc(m.id)}">Koppel ${esc(m.nr)}</button>`:'<span class="muted">Geen duidelijke match</span>'}</td></tr>`}).join(""):'<tr><td colspan="4">Nog geen bankmutaties geïmporteerd.</td></tr>'}</tbody>
    </table></div>
  </section>

  <section class="card" style="margin-top:16px">
    <p class="kicker">Aansluitingen</p><h2>Wat klaarstaat voor de volgende stap</h2>
    <div class="simple-more-grid">
      <div class="simple-more-link"><strong>Live bankkoppeling</strong><span>Provider/API nog koppelen.</span></div>
      <div class="simple-more-link"><strong>BTW & ICP indienen</strong><span>Overheidskoppeling nog aansluiten.</span></div>
      <div class="simple-more-link"><strong>Peppol</strong><span>Access point/provider nog koppelen.</span></div>
      <div class="simple-more-link"><strong>Accountanttoegang</strong><span>Serverrollen en rechten nog activeren.</span></div>
      <div class="simple-more-link"><strong>Meerdere administraties</strong><span>Gescheiden serveropslag nog toevoegen.</span></div>
    </div>
  </section>

  <section class="card" style="margin-top:16px">
    <p class="kicker">Instellingen</p><h2>Administratie & accountant</h2>
    <form class="stack" data-bp-settings>
      <label>Naam administratie<input name="administrationName" value="${esc(data.boekhoudingPlus?.administrationName||data.firm||"")}"></label>
      <label>Accountant e-mail<input name="accountantEmail" type="email" value="${esc(data.boekhoudingPlus?.accountantEmail||"")}" placeholder="boekhouder@kantoor.nl"></label>
      <label>Beginsaldo bank<input name="bankOpeningBalance" type="number" step="0.01" value="${esc(data.boekhoudingPlus?.bankOpeningBalance||0)}"></label>
      <button class="btn" type="submit">Instellingen bewaren</button>
    </form>
  </section>

  <section class="card" style="margin-top:16px">
    <p class="kicker">Controle</p><h2>Logboek</h2>
    <div class="list">${logs.length?logs.map(l=>`<article class="item"><strong>${esc(l.action)}</strong><span>${new Date(l.at).toLocaleString(window.VakentoI18n?.locale||"nl-NL")} ${l.detail?"· "+esc(l.detail):""}</span></article>`).join(""):'<article class="item">Nog geen wijzigingen gelogd.</article>'}</div>
  </section>`;
}

export function bindBoekhoudingPlus(root,{data,persist,toast}) {
  root.querySelector("[data-bp-year]")?.addEventListener("change",e=>{
    data.boekhoudingPlus ||= {};
    data.boekhoudingPlus.year=Number(new FormData(e.currentTarget).get("year"));
    persist();
  });

  root.querySelector("[data-asset-form]")?.addEventListener("submit",e=>{
    e.preventDefault(); const f=new FormData(e.currentTarget);
    data.activa ||= [];
    data.activa.push({id:"asset-"+Date.now(),name:String(f.get("name")||"").trim(),date:String(f.get("date")||""),amount:n(f.get("amount")),residual:n(f.get("residual")),years:Math.max(1,n(f.get("years")||5))});
    audit(data,"Bedrijfsmiddel toegevoegd",String(f.get("name")||"")); toast("Bedrijfsmiddel toegevoegd"); persist();
  });
  root.querySelectorAll("[data-asset-delete]").forEach(b=>b.addEventListener("click",()=>{
    const a=(data.activa||[]).find(x=>x.id===b.dataset.assetDelete);
    data.activa=(data.activa||[]).filter(x=>x.id!==b.dataset.assetDelete);
    audit(data,"Bedrijfsmiddel verwijderd",a?.name||""); persist();
  }));

  root.querySelector("[data-recurring-form]")?.addEventListener("submit",e=>{
    e.preventDefault(); const f=new FormData(e.currentTarget);
    data.periodiekeFacturen ||= [];
    data.periodiekeFacturen.push({id:"rec-"+Date.now(),customer:String(f.get("customer")),title:String(f.get("title")||"").trim(),amount:n(f.get("amount")),vat:Number(f.get("vat")||21),frequency:String(f.get("frequency")||"month"),next:String(f.get("next")||""),active:true});
    audit(data,"Periodieke factuur toegevoegd",String(f.get("title")||"")); toast("Periodieke factuur opgeslagen"); persist();
  });
  root.querySelectorAll("[data-recurring-delete]").forEach(b=>b.addEventListener("click",()=>{
    const x=(data.periodiekeFacturen||[]).find(r=>r.id===b.dataset.recurringDelete);
    data.periodiekeFacturen=(data.periodiekeFacturen||[]).filter(r=>r.id!==b.dataset.recurringDelete);
    audit(data,"Periodieke factuur verwijderd",x?.title||""); persist();
  }));
  root.querySelectorAll("[data-recurring-generate]").forEach(b=>b.addEventListener("click",()=>{
    const r=(data.periodiekeFacturen||[]).find(x=>x.id===b.dataset.recurringGenerate); if(!r)return;
    const nr="FAC-"+(880+(data.facturen||[]).length);
    data.facturen ||= [];
    data.facturen.unshift({id:"f"+Date.now(),nr,klant:r.customer,titel:r.title,bedrag:n(r.amount),regels:[{tekst:r.title,bedrag:n(r.amount),btw:Number(r.vat||21)}],status:"open",dag:iso(new Date()),periodiek:r.id});
    r.next=nextDate(r.next||iso(new Date()),r.frequency);
    audit(data,"Periodieke factuur aangemaakt",nr+" · "+r.title); toast("Factuur "+nr+" aangemaakt"); persist();
  }));

  root.querySelector("[data-bank-file]")?.addEventListener("change",async e=>{
    const file=e.currentTarget.files?.[0]; if(!file)return;
    const rows=importBankCsv(await file.text());
    if(!rows.length){toast("Geen herkenbare bankmutaties gevonden");return;}
    data.bankMutaties ||= [];
    let added=0;
    for(const tx of rows){
      const dup=data.bankMutaties.some(x=>x.date===tx.date && x.description===tx.description && Math.abs(n(x.amount)-n(tx.amount))<0.001);
      if(!dup){data.bankMutaties.push(tx);added++;}
    }
    audit(data,"Bankbestand geïmporteerd",added+" nieuwe mutaties"); toast(added+" bankmutaties toegevoegd"); persist();
  });

  const doMatch=(txId,invoiceId)=>{
    const tx=(data.bankMutaties||[]).find(x=>x.id===txId);
    const f=(data.facturen||[]).find(x=>x.id===invoiceId);
    if(!tx||!f)return false;
    tx.invoiceId=f.id; tx.status="matched"; f.status="betaald"; f.betaaldOp=tx.date;
    audit(data,"Bankmutatie gekoppeld",f.nr+" · "+euro(n(tx.amount))); return true;
  };

  root.querySelectorAll("[data-bank-match]").forEach(b=>b.addEventListener("click",()=>{
    const [txId,invoiceId]=String(b.dataset.bankMatch||"").split("|");
    if(doMatch(txId,invoiceId)){toast("Betaling gekoppeld");persist();}
  }));
  root.querySelector("[data-bank-auto]")?.addEventListener("click",()=>{
    let count=0;
    for(const tx of (data.bankMutaties||[])){const f=findMatch(data,tx); if(f && doMatch(tx.id,f.id)) count++;}
    toast(count?count+" betaling(en) automatisch gekoppeld":"Geen duidelijke matches gevonden"); if(count)persist();
  });

  root.querySelector("[data-bp-settings]")?.addEventListener("submit",e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);
    data.boekhoudingPlus ||= {};
    data.boekhoudingPlus.administrationName=String(f.get("administrationName")||"").trim();
    data.boekhoudingPlus.accountantEmail=String(f.get("accountantEmail")||"").trim();
    data.boekhoudingPlus.bankOpeningBalance=n(f.get("bankOpeningBalance"));
    audit(data,"Boekhoudinstellingen gewijzigd",data.boekhoudingPlus.administrationName);
    toast("Instellingen opgeslagen");persist();
  });
}
