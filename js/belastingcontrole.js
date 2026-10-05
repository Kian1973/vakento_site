import { euro } from "./store.js?v=boek1";

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n=v=>{const x=Number(String(v??"").replace(",","."));return Number.isFinite(x)?x:0};
const yearOf=v=>String(v||"").slice(0,4);
const VAT_DEADLINES_2026=[
  {q:"Q1 2026",date:"2026-04-30"},{q:"Q2 2026",date:"2026-07-31"},{q:"Q3 2026",date:"2026-10-31"},{q:"Q4 2026",date:"2027-01-31"}
];

function linesOf(f){return f.regels?.length?f.regels:[{tekst:f.titel,bedrag:f.bedrag,btw:f.btw??21,btwVerlegd:f.btwVerlegd===true}]}
function vatCalc(f){
  return linesOf(f).reduce((a,r)=>{const rev=r.btwVerlegd===true||r.btw==="verlegd";const rate=rev?0:Number(r.btw??21);const base=n(r.bedrag);a.base+=base;if(!rev&&rate===21)a.vat21+=base*.21;if(!rev&&rate===9)a.vat9+=base*.09;if(rev)a.shifted+=base;return a},{base:0,vat21:0,vat9:0,shifted:0});
}
function investmentKia(total){
  if(total<=2900||total>398236)return 0;
  if(total<=71683)return total*.28;
  if(total<=132746)return 20072;
  return Math.max(0,20072-.0756*(total-132746));
}
function nextDeadline(){
  const now=new Date();
  return VAT_DEADLINES_2026.find(d=>new Date(d.date+"T23:59:59")>=now)||VAT_DEADLINES_2026.at(-1);
}

function analyse(data){
  const settings=data.taxSettings||{};
  const year=Number(settings.year||2026);
  const invoices=(data.facturen||[]).filter(f=>yearOf(f.dag)===String(year));
  const vat=invoices.reduce((a,f)=>{const x=vatCalc(f);a.revenue+=x.base;a.vat+=x.vat21+x.vat9;a.shifted+=x.shifted;return a},{revenue:0,vat:0,shifted:0});
  const hours=(data.uren||[]).filter(u=>!u.dag||yearOf(u.dag)===String(year)).reduce((s,u)=>s+n(u.uren),0);
  const invTotal=(data.activa||[]).filter(a=>yearOf(a.date)===String(year)&&n(a.amount)>=450).reduce((s,a)=>s+n(a.amount),0);
  const issues=[];
  invoices.forEach(f=>{
    if(!f.klant)issues.push({level:"warn",text:`${f.nr||"Factuur"} heeft geen gekoppelde klant.`});
    if(!f.dag)issues.push({level:"warn",text:`${f.nr||"Factuur"} heeft geen factuurdatum.`});
    linesOf(f).forEach(r=>{const shifted=r.btwVerlegd===true||r.btw==="verlegd";const rate=shifted?0:Number(r.btw??21);if(!shifted&&![0,9,21].includes(rate))issues.push({level:"bad",text:`${f.nr||"Factuur"} bevat een onbekend btw-tarief (${rate}%).`});});
  });
  if(settings.kor && invoices.some(f=>linesOf(f).some(r=>!(r.btwVerlegd===true||r.btw==="verlegd")&&Number(r.btw??21)>0)))issues.push({level:"bad",text:"KOR staat aan, maar er zijn facturen met berekende btw. Controleer of KOR daadwerkelijk van toepassing is."});
  const receipts=(data.bonnen||[]);
  const purchases=(data.inkoop||[]);
  if(purchases.length>receipts.length)issues.push({level:"warn",text:"Er zijn meer inkoopboekingen dan gescande bonnen. Controleer of alle bewijsstukken aanwezig zijn."});
  if(settings.ibEntrepreneur && hours<1225)issues.push({level:"warn",text:`Vakento telt ${hours.toFixed(1)} geregistreerde uren in ${year}. Voor de gewone zelfstandigenaftrek geldt in beginsel het urencriterium; controleer of je alle ondernemersuren hebt geregistreerd.`});
  return {year,invoices,vat,hours,invTotal,kia:year===2026?investmentKia(invTotal):0,issues,settings};
}

export function viewBelastingcontrole(data){
  const a=analyse(data);const deadline=nextDeadline();
  return `
  <div class="row"><div><p class="kicker">Belastingcontrole</p><h1>Automatische check op je administratie.</h1><p class="muted">Controlehulp voor Nederlandse zzp’ers. Geen aangifte of fiscaal advies: Vakento signaleert opvallende zaken die je zelf of met je boekhouder controleert.</p></div></div>
  <div class="simple-grid">
    <section class="card">
      <p class="kicker">2026 instellingen</p>
      <form class="stack" data-tax-settings>
        <label>Belastingjaar<select name="year"><option value="2026" selected>2026</option></select></label>
        <label class="form-check"><input type="checkbox" name="ibEntrepreneur" ${a.settings.ibEntrepreneur?"checked":""}> Ik ben ondernemer voor de inkomstenbelasting</label>
        <label class="form-check"><input type="checkbox" name="kor" ${a.settings.kor?"checked":""}> Ik doe mee aan de KOR</label>
        <button class="btn" type="submit">Instellingen bewaren</button>
      </form>
    </section>
    <section class="card">
      <p class="kicker">Volgende btw-datum</p><h2>${esc(deadline.q)}</h2><p><strong>${new Date(deadline.date+"T12:00:00").toLocaleDateString("nl-NL",{day:"numeric",month:"long",year:"numeric"})}</strong></p>
      <p class="muted">Voor kwartaalaangifte. Controleer jouw eigen aangiftetijdvak in Mijn Belastingdienst Zakelijk.</p>
    </section>
  </div>
  <div class="simple-more-grid" style="margin-top:16px">
    <div class="simple-more-link"><strong>Omzet ${a.year}</strong><span>${euro(a.vat.revenue)} excl. btw</span></div>
    <div class="simple-more-link"><strong>Btw uit verkoop</strong><span>${euro(a.vat.vat)}</span></div>
    <div class="simple-more-link"><strong>Geregistreerde uren</strong><span>${a.hours.toFixed(1)} uur</span></div>
    <div class="simple-more-link"><strong>KIA-indicatie 2026</strong><span>${a.invTotal?euro(a.kia)+" bij "+euro(a.invTotal)+" kwalificerende investeringen":"Nog geen kwalificerende investeringen gevonden"}</span></div>
  </div>
  <section class="card" style="margin-top:16px">
    <p class="kicker">Controlepunten</p><h2>${a.issues.length?a.issues.length+" aandachtspunt(en)":"Geen directe afwijkingen gevonden"}</h2>
    <div class="list">${a.issues.length?a.issues.map(x=>`<article class="item"><strong class="${x.level==="bad"?"warn":""}">${x.level==="bad"?"Controle nodig":"Nakijken"}</strong><span>${esc(x.text)}</span></article>`).join(""):'<article class="item"><strong>Administratie ziet er logisch uit</strong><span>Dit betekent niet dat de aangifte automatisch fiscaal juist is. Controleer uitzonderingen en persoonlijke omstandigheden.</span></article>'}</div>
  </section>
  <section class="card" style="margin-top:16px">
    <p class="kicker">2026 referentie</p><h2>Regels waar Max en de controle mee rekenen</h2>
    <div class="list">
      <article class="item"><strong>Zelfstandigenaftrek</strong><span>€1.200 als je aan de voorwaarden voldoet. Startersaftrek kan €2.123 extra zijn.</span></article>
      <article class="item"><strong>Mkb-winstvrijstelling</strong><span>12,7% van de winst na ondernemersaftrek.</span></article>
      <article class="item"><strong>KIA</strong><span>Bij kwalificerende investeringen van €2.901 t/m €398.236; bedrijfsmiddelen onder €450 tellen in beginsel niet mee.</span></article>
      <article class="item"><strong>BTW</strong><span>Vakento controleert 0%, 9%, 21% en verlegd, maar bepaalt niet automatisch of het verlaagde tarief juridisch is toegestaan.</span></article>
    </div>
  </section>`;
}

export function bindBelastingcontrole(root,{data,persist,toast}){
  root.querySelector("[data-tax-settings]")?.addEventListener("submit",e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);data.taxSettings={year:Number(f.get("year")||2026),ibEntrepreneur:f.get("ibEntrepreneur")==="on",kor:f.get("kor")==="on"};toast("Belastinginstellingen opgeslagen");persist();
  });
}
