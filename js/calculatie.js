import { euro, iso } from "./store.js?v=boek1";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n = (v) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? Math.max(0, x) : 0;
};
const r2 = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;

function calcValues(x={}) {
  const hours=n(x.hours), rate=n(x.rate), material=n(x.material), subcontract=n(x.subcontract), travel=n(x.travel);
  const overheadPct=n(x.overheadPct), profitPct=n(x.profitPct), vat=[0,9,21].includes(Number(x.vat))?Number(x.vat):21;
  const labor=hours*rate;
  const direct=labor+material+subcontract+travel;
  const overhead=direct*(overheadPct/100);
  const cost=direct+overhead;
  const profit=cost*(profitPct/100);
  const saleEx=cost+profit;
  const vatAmount=saleEx*(vat/100);
  return {hours,rate,material,subcontract,travel,overheadPct,profitPct,vat,labor,direct,overhead,cost,profit,saleEx,vatAmount,saleIncl:saleEx+vatAmount,margin:saleEx?profit/saleEx*100:0};
}

function optionCustomers(data, selected=""){
  return ['<option value="">Geen klant gekozen</option>'].concat((data.klanten||[]).map(c=>`<option value="${esc(c.id)}" ${c.id===selected?"selected":""}>${esc(c.name)}</option>`)).join("");
}

export function viewCalculatie(data) {
  const saved=(data.calculaties||[]);
  const d=data.calculatieDraft||{title:"",customer:"",hours:8,rate:65,material:0,subcontract:0,travel:0,overheadPct:10,profitPct:20,vat:21};
  const v=calcValues(d);
  return `
  <div class="row"><div><p class="kicker">Calculatie</p><h1>Van kostprijs naar verkoopprijs.</h1><p class="muted">Reken uren, materiaal, onderaanneming, reis, overhead, winst en btw door. Sla de berekening op of maak er meteen een offerte van.</p></div></div>

  <div class="simple-grid" style="align-items:start">
    <form class="card stack" data-calc-form>
      <label>Naam calculatie<input name="title" value="${esc(d.title||"")}" placeholder="Bijv. schilderwerk woning" required></label>
      <label>Klant<select name="customer">${optionCustomers(data,d.customer)}</select></label>
      <div class="grid-2">
        <label>Uren<input name="hours" type="number" step="0.25" min="0" value="${esc(d.hours)}"></label>
        <label>Uurtarief excl. btw<input name="rate" type="number" step="0.01" min="0" value="${esc(d.rate)}"></label>
        <label>Materiaal excl. btw<input name="material" type="number" step="0.01" min="0" value="${esc(d.material)}"></label>
        <label>Onderaanneming<input name="subcontract" type="number" step="0.01" min="0" value="${esc(d.subcontract)}"></label>
        <label>Reis/overige kosten<input name="travel" type="number" step="0.01" min="0" value="${esc(d.travel)}"></label>
        <label>Overhead %<input name="overheadPct" type="number" step="0.1" min="0" value="${esc(d.overheadPct)}"></label>
        <label>Winstopslag %<input name="profitPct" type="number" step="0.1" min="0" value="${esc(d.profitPct)}"></label>
        <label>BTW<select name="vat"><option value="21" ${Number(d.vat)===21?"selected":""}>21%</option><option value="9" ${Number(d.vat)===9?"selected":""}>9%</option><option value="0" ${Number(d.vat)===0?"selected":""}>0%</option></select></label>
      </div>
      <div class="actions"><button class="btn" type="submit">Calculatie opslaan</button><button class="btn btn-ghost" type="button" data-calc-quote>Maak offerte</button></div>
    </form>

    <section class="card" data-calc-result>
      <p class="kicker">Uitkomst</p><h2>${euro(v.saleIncl)}</h2>
      <div class="list">
        <article class="item"><span>Loon</span><strong>${euro(v.labor)}</strong></article>
        <article class="item"><span>Directe kosten</span><strong>${euro(v.direct)}</strong></article>
        <article class="item"><span>Overhead</span><strong>${euro(v.overhead)}</strong></article>
        <article class="item"><span>Kostprijs</span><strong>${euro(v.cost)}</strong></article>
        <article class="item"><span>Winst</span><strong>${euro(v.profit)}</strong></article>
        <article class="item"><span>Verkoop excl. btw</span><strong>${euro(v.saleEx)}</strong></article>
        <article class="item"><span>BTW ${v.vat}%</span><strong>${euro(v.vatAmount)}</strong></article>
        <article class="item"><span>Verkoop incl. btw</span><strong>${euro(v.saleIncl)}</strong></article>
        <article class="item"><span>Marge op verkoop</span><strong>${v.margin.toFixed(1)}%</strong></article>
      </div>
    </section>
  </div>

  <section class="card" style="margin-top:16px">
    <div class="row"><div><p class="kicker">Bewaard</p><h2>Calculaties</h2></div></div>
    <div class="list">${saved.length?saved.map(x=>{const z=calcValues(x);return `<article class="item"><strong>${esc(x.title)}</strong><span>${esc((data.klanten||[]).find(c=>c.id===x.customer)?.name||"Geen klant")} · kost ${euro(z.cost)} · verkoop ${euro(z.saleEx)} excl.</span><div class="actions"><button class="btn btn-ghost" data-calc-load="${esc(x.id)}">Open</button><button class="btn btn-ghost" data-calc-delete="${esc(x.id)}">Verwijder</button></div></article>`}).join(""):'<article class="item">Nog geen calculaties opgeslagen.</article>'}</div>
  </section>`;
}

function readForm(form){
  const f=new FormData(form);
  return {title:String(f.get("title")||"").trim(),customer:String(f.get("customer")||""),hours:n(f.get("hours")),rate:n(f.get("rate")),material:n(f.get("material")),subcontract:n(f.get("subcontract")),travel:n(f.get("travel")),overheadPct:n(f.get("overheadPct")),profitPct:n(f.get("profitPct")),vat:Number(f.get("vat")||21)};
}

function nextOfferNumber(data){
  const max=(data.offertes||[]).reduce((m,o)=>{const z=String(o.nr||"").match(/(\d+)$/);return Math.max(m,z?Number(z[1]):0)},1039);
  return "OFF-"+Math.max(1040,max+1);
}

export function bindCalculatie(root,{data,persist,toast}){
  const form=root.querySelector("[data-calc-form]");
  const sync=()=>{ if(!form)return; data.calculatieDraft=readForm(form); };
  form?.addEventListener("input",sync);
  form?.addEventListener("change",sync);
  form?.addEventListener("submit",e=>{
    e.preventDefault(); const d=readForm(form); if(!d.title)return;
    data.calculaties ||= [];
    data.calculaties.unshift({...d,id:"calc-"+Date.now(),createdAt:new Date().toISOString()});
    data.calculatieDraft=d; toast("Calculatie opgeslagen"); persist();
  });
  root.querySelector("[data-calc-quote]")?.addEventListener("click",()=>{
    if(!form)return; const d=readForm(form); if(!d.title){toast("Geef de calculatie eerst een naam");return;}
    const z=calcValues(d); data.offertes ||= [];
    const regels=[
      {tekst:"Arbeid ("+d.hours+" uur)",bedrag:r2(z.labor),btw:d.vat},
      ...(d.material?[{tekst:"Materialen",bedrag:r2(d.material),btw:d.vat}]:[]),
      ...(d.subcontract?[{tekst:"Onderaanneming",bedrag:r2(d.subcontract),btw:d.vat}]:[]),
      ...(d.travel?[{tekst:"Reis en overige kosten",bedrag:r2(d.travel),btw:d.vat}]:[]),
      ...(z.overhead?[{tekst:"Overhead",bedrag:r2(z.overhead),btw:d.vat}]:[]),
      ...(z.profit?[{tekst:"Opslag / winst",bedrag:r2(z.profit),btw:d.vat}]:[])
    ];
    const nr=nextOfferNumber(data);
    data.offertes.unshift({id:"o"+Date.now(),nr,klant:d.customer,titel:d.title,bedrag:r2(z.saleEx),regels,status:"concept",dag:iso(new Date()),bron:"calculatie"});
    toast("Offerte "+nr+" aangemaakt"); persist(); setTimeout(()=>{location.hash="#/offertes"},0);
  });
  root.querySelectorAll("[data-calc-load]").forEach(b=>b.addEventListener("click",()=>{const x=(data.calculaties||[]).find(v=>v.id===b.dataset.calcLoad);if(x){data.calculatieDraft={...x};persist();}}));
  root.querySelectorAll("[data-calc-delete]").forEach(b=>b.addEventListener("click",()=>{data.calculaties=(data.calculaties||[]).filter(v=>v.id!==b.dataset.calcDelete);persist();}));
}
