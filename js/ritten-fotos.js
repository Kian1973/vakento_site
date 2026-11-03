const e = (v) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const kmFmt = (v) => Number(v || 0).toLocaleString("nl-NL",{maximumFractionDigits:1});
const folder = "Rittenregistratie";
const imageUrl = (path) => "/api/cloud/bestand?pad=" + encodeURIComponent(path);
function csv(rows) {
  return "\uFEFF" + rows.map(row => row.map(x => '"' + String(x ?? "").replace(/"/g,'""') + '"').join(";")).join("\r\n");
}
function download(rows) {
  const url=URL.createObjectURL(new Blob([csv(rows)],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="vakento-ritten.csv";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function dateToday() {
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
function cloudStatus(res) { return res.ok; }
async function ensureFolder() {
  const check=await fetch("/api/cloud?pad="+encodeURIComponent(folder),{credentials:"include",cache:"no-store"});
  if(cloudStatus(check))return;
  const create=await fetch("/api/cloud/map",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({pad:"",naam:folder})});
  if (!create.ok) {
    const verify=await fetch("/api/cloud?pad="+encodeURIComponent(folder),{credentials:"include",cache:"no-store"});
    if(!verify.ok)throw new Error("Vakento-cloudmap voor ritfoto's niet beschikbaar.");
  }
}
async function uploadPhoto(file,id,which) {
  if(!file) return "";
  if(!file.type.startsWith("image/"))throw new Error("Gebruik een foto, geen ander bestand.");
  if(file.size>8*1024*1024)throw new Error("Foto groter dan 8 MB. Maak een kleinere foto.");
  await ensureFolder();
  const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":file.type==="image/heic"?"heic":"jpg";
  const name=id+"-"+which+"."+ext;
  const qs=new URLSearchParams({pad:folder,naam:name});
  const res=await fetch("/api/cloud/upload?"+qs,{method:"POST",credentials:"include",body:file});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(body.error || "Foto opslaan mislukt.");
  return folder+"/"+name;
}
function readKm(form,name) {
  const raw=String(form.get(name)||"").trim().replace(",",".");
  if(!/^\d+(\.\d)?$/.test(raw))return null;
  const n=Number(raw);
  return Number.isFinite(n)&&n>=0&&n<10000000?n:null;
}
function photoLink(path,label) {
  return path ? '<a class="btn btn-ghost" target="_blank" rel="noopener" href="'+e(imageUrl(path))+'">'+label+'</a>' : "";
}
export function viewRittenFotos(data) {
  const ritten=[...(data.ritten||[])].sort((a,b)=>String(b.datum||"").localeCompare(String(a.datum||"")));
  const open=ritten.filter(r=>r.status==="bezig");
  const done=ritten.filter(r=>r.status!=="bezig");
  const total=done.reduce((sum,r)=>sum+(Number(r.km)||0),0);
  const openHtml=open.map(r=>
    '<article class="card" style="margin-top:12px"><h3>'+e(r.van)+' · '+e(r.datum)+'</h3>'+
    '<p>Beginstand: <strong>'+kmFmt(r.beginstand)+' km</strong> '+photoLink(r.fotoBegin,"Bekijk beginfoto")+'</p>'+
    '<form class="stack" data-rit-eind="'+e(r.id)+'">'+
    '<label>Eindstand op de teller<input name="eindstand" type="number" min="0" max="9999999" step="1" inputmode="numeric" required></label>'+
    '<label>Foto van de eindstand<input name="fotoEind" type="file" accept="image/*" capture="environment" required></label>'+
    '<label>Bestemming<input name="naar" maxlength="140" placeholder="Waar ben je aangekomen?" required></label>'+
    '<button class="btn" type="submit">Rit afronden</button></form></article>'
  ).join("");
  const doneHtml=done.map(r=>
    '<article class="item"><strong>'+e(r.datum)+' · '+kmFmt(r.km)+' km</strong>'+
    '<span>'+e(r.van)+' → '+e(r.naar)+' · '+e(r.doel||"")+'</span>'+
    (r.beginstand!=null&&r.eindstand!=null?'<span>Teller: '+kmFmt(r.beginstand)+' → '+kmFmt(r.eindstand)+'</span>':'')+
    '<div class="actions">'+photoLink(r.fotoBegin,"Beginfoto")+photoLink(r.fotoEind,"Eindfoto")+
    '<button class="btn btn-ghost" type="button" data-rit-verwijder="'+e(r.id)+'">Verwijderen</button></div></article>'
  ).join("");
  return '<div class="row"><div><p class="kicker">Rittenregistratie</p><h1>Kilometerstanden fotograferen</h1>'+
    '<p class="muted">1. Maak bij vertrek een foto. 2. Vul je kilometerstand in. 3. Maak bij aankomst een tweede foto. Vakento rekent het verschil uit.</p></div></div>'+
    '<div class="stat"><span>Totaal afgeronde ritten</span><b>'+kmFmt(total)+' km</b></div>'+
    '<section class="card" style="margin-top:16px"><h2>Nieuwe rit starten</h2>'+
    '<form class="stack" data-rit-start>'+
    '<label>Datum<input name="datum" type="date" value="'+dateToday()+'" required></label>'+
    '<label>Vertrekplaats<input name="van" maxlength="140" placeholder="Bijvoorbeeld Winterswijk" required></label>'+
    '<label>Reden van de rit<input name="doel" maxlength="180" placeholder="Bijvoorbeeld klantbezoek" required></label>'+
    '<label>Beginstand op de teller<input name="beginstand" type="number" min="0" max="9999999" step="1" inputmode="numeric" required></label>'+
    '<label>Foto van de beginstand<input name="fotoBegin" type="file" accept="image/*" capture="environment" required></label>'+
    '<button class="btn" type="submit">Begin rit bewaren</button></form>'+
    '<p class="muted">De kilometerstand vul je zelf in. De foto wordt veilig bewaard in je Vakento-cloud; Vakento leest de cijfers nog niet automatisch uit de foto.</p></section>'+
    '<section style="margin-top:22px"><h2>Nog af te ronden ('+open.length+')</h2>'+
    (openHtml||'<p class="muted">Geen openstaande ritten.</p>')+'</section>'+
    '<section style="margin-top:22px"><div class="row"><h2>Afgeronde ritten</h2>'+
    '<button class="btn btn-ghost" type="button" data-ritten-export '+(done.length?"":"disabled")+'>Download CSV</button></div>'+
    '<div class="list">'+(doneHtml||'<p class="muted">Nog geen afgeronde ritten.</p>')+'</div></section>'+
    '<p class="muted">Voor fiscale rittenadministratie kan meer informatie nodig zijn. Controleer je eigen registratievereisten. Oude, eerder ingevoerde ritten blijven zichtbaar.</p>';
}
export function bindRittenFotos(root,{data,persist,toast}) {
  root.querySelector("[data-rit-start]")?.addEventListener("submit",async event=>{
    event.preventDefault();
    const form=event.currentTarget;const button=form.querySelector('[type="submit"]');
    const f=new FormData(form);const start=readKm(f,"beginstand");
    const datum=String(f.get("datum")||""),van=String(f.get("van")||"").trim(),doel=String(f.get("doel")||"").trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(datum)||start===null||!van||!doel){toast("Controleer datum, plaats en beginstand.");return;}
    const id="rit-"+Date.now()+"-"+Math.random().toString(36).slice(2,9);
    button.disabled=true;button.textContent="Foto en rit opslaan…";
    try {
      const fotoBegin=await uploadPhoto(f.get("fotoBegin"),id,"begin");
      data.ritten ||= [];
      data.ritten.push({id,datum,van,doel,beginstand:start,fotoBegin,status:"bezig"});
      persist();toast("Rit gestart. Eindstand kun je later toevoegen.");
    } catch(error) {toast(error.message||"Kon rit niet bewaren.");button.disabled=false;button.textContent="Begin rit bewaren";}
  });
  root.querySelectorAll("[data-rit-eind]").forEach(form=>form.addEventListener("submit",async event=>{
    event.preventDefault();const f=new FormData(form),end=readKm(f,"eindstand");
    const rit=(data.ritten||[]).find(x=>x.id===form.dataset.ritEind&&x.status==="bezig");
    if(!rit||end===null||end<=Number(rit.beginstand)||!String(f.get("naar")||"").trim()){toast("Controleer bestemming en eindstand.");return;}
    const button=form.querySelector('[type="submit"]');button.disabled=true;button.textContent="Rit afronden…";
    try{
      const fotoEind=await uploadPhoto(f.get("fotoEind"),rit.id,"eind");
      rit.fotoEind=fotoEind;rit.eindstand=end;rit.naar=String(f.get("naar")).trim();
      rit.km=Math.round((end-Number(rit.beginstand))*10)/10;rit.status="afgerond";
      persist();toast("Rit afgerond: "+kmFmt(rit.km)+" km");
    } catch(error){toast(error.message||"Kon rit niet afronden.");button.disabled=false;button.textContent="Rit afronden";}
  }));
  root.querySelectorAll("[data-rit-verwijder]").forEach(button=>button.addEventListener("click",()=>{
    if(!confirm("Rit verwijderen? Foto's blijven in je cloud totdat je ze daar verwijdert."))return;
    data.ritten=(data.ritten||[]).filter(x=>x.id!==button.dataset.ritVerwijder);
    persist();toast("Rit verwijderd");
  }));
  root.querySelector("[data-ritten-export]")?.addEventListener("click",()=>{
    download([["Datum","Van","Naar","Reden","Beginstand","Eindstand","Kilometers","Foto vertrek","Foto aankomst"],
      ...(data.ritten||[]).filter(x=>x.status!=="bezig").map(r=>[r.datum,r.van,r.naar,r.doel,r.beginstand??"",r.eindstand??"",r.km,r.fotoBegin||"",r.fotoEind||""])]);
  });
}
