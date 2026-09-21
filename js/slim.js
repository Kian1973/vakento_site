import { euro, klant, klus, iso } from "./store.js?v=open1";

const esc = (v = "") => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const options = (data) => data.klussen.map((k) => `<option value="${k.id}">${esc(k.title)} · ${esc(klant(data, k.klant).name)}</option>`).join("");

function actual(data, k) {
  const hours = data.uren.filter((u) => u.klus === k.id).reduce((n, u) => n + Number(u.uren || 0), 0);
  const purchase = data.inkoop.filter((x) => x.klus === k.id).reduce((n, x) => n + Number(x.bedrag || 0), 0);
  const cost = Number(k.kost || 0) + purchase;
  return { hours, purchase, cost, result: Number(k.begroot || 0) - cost };
}

function checklist(data) {
  const today = iso(new Date());
  const due = data.facturen.filter((f) => f.status === "open");
  return [
    { ok: data.uren.some((u) => u.day === today), text: "Uren van vandaag ingevuld" },
    { ok: data.werkbonnen.some((b) => b.day === today), text: "Werkbon van vandaag gemaakt" },
    { ok: !data.meerwerk.some((m) => m.status === "concept"), text: "Meerwerk naar klant gestuurd" },
    { ok: !due.length, text: "Openstaande facturen gecontroleerd" },
    { ok: data.fotos.some((p) => p.day === today), text: "Voor- of nafoto toegevoegd" },
  ];
}

export function viewSlim(data) {
  data.werkbonnen ||= []; data.meerwerk ||= []; data.fotos ||= []; data.onderhoud ||= []; data.dagnotities ||= [];
  const jobs = options(data);
  const checks = checklist(data);
  const open = data.facturen.filter((f) => f.status === "open");
  return `
  <div class="row">
    <div><p class="kicker">Slim werken</p><h1>Praat. Werk. Klaar.</h1>
    <p class="muted">Van gesproken werknotitie tot werkbon, meerwerk, factuur en onderhoudsafspraak.</p></div>
    <button class="btn" data-finish-day>Maak mijn werkdag af</button>
  </div>

  <div class="smart-grid">
    <section class="card smart-wide">
      <p class="kicker">Vakento Assistent</p><h2>Spreek je werknotitie in</h2>
      <form class="stack" data-voice-note>
        <label>Werknotitie<textarea name="note" rows="4" required placeholder="Vandaag 7,5 uur bij Jansen gewerkt. Vier liter lak gebruikt. Drie uur meerwerk door houtrot."></textarea></label>
        <label>Klus<select name="klus" required><option value="">Kies een klus</option>${jobs}</select></label>
        <div class="actions"><button class="btn btn-ghost" type="button" data-start-speech>🎙 Inspreken</button><button class="btn" type="submit">Verwerk notitie</button></div>
      </form>
      <div class="assistant-result" data-voice-result hidden></div>
    </section>

    <section class="card">
      <p class="kicker">Vandaag</p><h2>Alles binnen handbereik</h2>
      <div class="smart-actions">
        <a class="btn btn-ghost" href="#/uren">Uren boeken</a><a class="btn btn-ghost" href="#/papier">Factuur maken</a>
        <a class="btn btn-ghost" href="#/bord">Planning</a><a class="btn btn-ghost" href="#/cloud">Bestanden</a>
      </div>
    </section>

    <section class="card">
      <p class="kicker">Dagafsluiting</p><h2>Niets vergeten</h2>
      <ul class="check-list">${checks.map((x) => `<li class="${x.ok ? "done" : ""}">${x.ok ? "✓" : "○"} ${x.text}</li>`).join("")}</ul>
    </section>
  </div>

  <div class="grid-2 smart-sections">
    <section class="card">
      <p class="kicker">Digitale werkbon</p><h2>Werk, materiaal en handtekening</h2>
      <form class="stack" data-workorder>
        <label>Klus<select name="klus" required>${jobs}</select></label>
        <label>Werkzaamheden<textarea name="text" rows="3" required></textarea></label>
        <div class="grid-2"><label>Uren<input name="hours" type="number" step=".25" min="0" value="0"></label><label>Materiaal<input name="material" placeholder="4 L lak"></label></div>
        <label>Naam klant voor akkoord<input name="signature" placeholder="Klant tekent/naam"></label>
        <label>Foto’s<input name="photos" type="file" accept="image/*" multiple></label>
        <button class="btn" type="submit">Werkbon bewaren</button>
      </form>
      <div class="mini-list">${data.werkbonnen.slice(0,4).map((b) => `<div><strong>${esc(klus(data,b.klus).title)}</strong><span>${esc(b.day)} · ${esc(b.signature || "nog niet getekend")}</span></div>`).join("") || "<p class='muted'>Nog geen digitale werkbonnen.</p>"}</div>
    </section>

    <section class="card">
      <p class="kicker">Meerwerk</p><h2>Vastleggen en laten goedkeuren</h2>
      <form class="stack" data-extra>
        <label>Klus<select name="klus" required>${jobs}</select></label>
        <label>Omschrijving<textarea name="text" rows="3" required placeholder="Houtrot onderdorpel herstellen"></textarea></label>
        <label>Bedrag excl. btw<input name="amount" type="number" step=".01" min="0" required></label>
        <button class="btn" type="submit">Meerwerk klaarzetten</button>
      </form>
      <div class="mini-list">${data.meerwerk.slice(0,6).map((m) => `<div><strong>${esc(m.text)} · ${euro(m.amount)}</strong><span>${esc(m.status)}</span>${m.status !== "akkoord" ? `<button class="btn btn-ghost" data-approve-extra="${m.id}">Akkoord registreren</button>` : ""}</div>`).join("") || "<p class='muted'>Nog geen meerwerk.</p>"}</div>
    </section>

    <section class="card">
      <p class="kicker">Voor- en nafoto’s</p><h2>Bewijs per klus</h2>
      <form class="stack" data-job-photo>
        <label>Klus<select name="klus" required>${jobs}</select></label>
        <label>Moment<select name="type"><option>Voor</option><option>Tijdens</option><option>Na</option></select></label>
        <label>Omschrijving<input name="text" placeholder="Houtrot links onder"></label>
        <label>Foto<input name="photo" type="file" accept="image/*" required></label>
        <button class="btn" type="submit">Foto toevoegen</button>
      </form>
      <div class="photo-log">${data.fotos.slice(0,6).map((p) => `<figure>${p.src ? `<img src="${p.src}" alt="">` : ""}<figcaption>${esc(p.type)} · ${esc(p.text)}</figcaption></figure>`).join("")}</div>
    </section>

    <section class="card">
      <p class="kicker">Onderhoud</p><h2>De volgende opdracht automatisch onthouden</h2>
      <form class="stack" data-maintenance>
        <label>Klus<select name="klus" required>${jobs}</select></label>
        <label>Opnieuw benaderen op<input name="date" type="date" required></label>
        <label>Notitie<input name="text" placeholder="Buitenschilderwerk controleren"></label>
        <button class="btn" type="submit">Herinnering bewaren</button>
      </form>
      <div class="mini-list">${data.onderhoud.sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6).map((m)=>`<div><strong>${esc(m.date)} · ${esc(klus(data,m.klus).title)}</strong><span>${esc(m.text)}</span></div>`).join("") || "<p class='muted'>Nog geen onderhoudsherinneringen.</p>"}</div>
    </section>
  </div>

  <section class="card smart-section">
    <div class="row"><div><p class="kicker">Begroot tegenover werkelijk</p><h2>Zie verlies voordat het te laat is</h2></div><button class="btn btn-ghost" data-export-accounting>Export boekhouder</button></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Klus</th><th>Uren</th><th>Begroot</th><th>Kosten</th><th>Resultaat</th></tr></thead><tbody>
    ${data.klussen.map((k)=>{const a=actual(data,k);return `<tr><td>${esc(k.title)}</td><td>${a.hours}</td><td>${euro(k.begroot)}</td><td>${euro(a.cost)}</td><td class="${a.result<0?"warn":"ok"}">${euro(a.result)}</td></tr>`;}).join("")}
    </tbody></table></div>
  </section>

  <section class="card smart-section">
    <p class="kicker">Betalingen</p><h2>Openstaande facturen en herinneringen</h2>
    <div class="mini-list">${open.map((f)=>`<div><strong>${esc(f.nr)} · ${euro(f.bedrag)}</strong><span>${esc(f.titel)} · open sinds ${esc(f.dag)}</span><div class="actions"><button class="btn btn-ghost" data-copy-payment="${f.id}">Kopieer betaalbericht</button><button class="btn" data-smart-paid="${f.id}">Markeer betaald</button></div></div>`).join("") || "<p class='ok'>Alles is betaald.</p>"}</div>
  </section>`;
}

const readFile = (file) => new Promise((resolve) => {
  if (!file) return resolve("");
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

function parseVoice(text) {
  const h = text.match(/(\d+(?:[,.]\d+)?)\s*uur/i);
  const liters = [...text.matchAll(/(\d+(?:[,.]\d+)?)\s*(?:liter|l)\s+([^.,]+)/gi)].map((m)=>`${m[1]} L ${m[2].trim()}`);
  const extra = text.match(/(\d+(?:[,.]\d+)?)\s*uur\s*meerwerk/i);
  return { hours: h ? Number(h[1].replace(",",".")) : 0, material: liters.join(", "), extraHours: extra ? Number(extra[1].replace(",",".")) : 0 };
}

export function bindSlim(root, { data, persist, toast }) {
  root.querySelector("[data-start-speech]")?.addEventListener("click", () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast("Spraakherkenning werkt hier niet; typ de notitie.");
    const rec = new SR(); rec.lang = "nl-NL"; rec.interimResults = false;
    rec.onresult = (e) => { root.querySelector("[name=note]").value = e.results[0][0].transcript; };
    rec.onerror = () => toast("Inspreken lukte niet");
    rec.start();
  });
  root.querySelector("[data-voice-note]")?.addEventListener("submit", (e) => {
    e.preventDefault(); const f = new FormData(e.target); const text=String(f.get("note")); const parsed=parseVoice(text); const job=klus(data,f.get("klus"));
    data.dagnotities.unshift({id:"dn"+Date.now(), klus:job.id, text, day:iso(new Date()), ...parsed});
    if(parsed.hours) data.uren.push({id:"u"+Date.now(),person:data.ploeg[0]?.id||"p1",klus:job.id,day:iso(new Date()),uren:parsed.hours,soort:"werk",note:text});
    if(parsed.extraHours) data.meerwerk.unshift({id:"mw"+Date.now(),klus:job.id,text:"Meerwerk uit spraaknotitie",amount:0,status:"concept",day:iso(new Date())});
    const box=root.querySelector("[data-voice-result]"); box.hidden=false; box.innerHTML=`<p class="kicker">Herkend</p><p><strong>${parsed.hours} uur</strong> · ${esc(parsed.material||"geen materiaal herkend")} · ${parsed.extraHours ? parsed.extraHours+" uur meerwerk" : "geen meerwerk herkend"}</p>`;
    toast("Werknotitie verwerkt"); persist();
  });
  root.querySelector("[data-workorder]")?.addEventListener("submit", async(e)=>{
    e.preventDefault(); const f=new FormData(e.target); const files=[...(e.target.photos.files||[])].slice(0,4); const photos=[]; for(const file of files) photos.push(await readFile(file));
    data.werkbonnen.unshift({id:"wb"+Date.now(),klus:f.get("klus"),text:f.get("text"),hours:Number(f.get("hours")),material:f.get("material"),signature:f.get("signature"),photos,day:iso(new Date())});
    toast("Digitale werkbon bewaard"); persist();
  });
  root.querySelector("[data-extra]")?.addEventListener("submit",(e)=>{e.preventDefault();const f=new FormData(e.target);data.meerwerk.unshift({id:"mw"+Date.now(),klus:f.get("klus"),text:f.get("text"),amount:Number(f.get("amount")),status:"concept",day:iso(new Date())});toast("Meerwerk klaar voor akkoord");persist();});
  root.querySelectorAll("[data-approve-extra]").forEach((b)=>b.addEventListener("click",()=>{const m=data.meerwerk.find(x=>x.id===b.dataset.approveExtra);m.status="akkoord";const k=klus(data,m.klus);k.begroot=Number(k.begroot||0)+Number(m.amount||0);toast("Meerwerk akkoord en bij begroting");persist();}));
  root.querySelector("[data-job-photo]")?.addEventListener("submit",async(e)=>{e.preventDefault();const f=new FormData(e.target);const src=await readFile(e.target.photo.files?.[0]);data.fotos.unshift({id:"ph"+Date.now(),klus:f.get("klus"),type:f.get("type"),text:f.get("text"),src,day:iso(new Date())});toast("Foto aan klus toegevoegd");persist();});
  root.querySelector("[data-maintenance]")?.addEventListener("submit",(e)=>{e.preventDefault();const f=new FormData(e.target);data.onderhoud.push({id:"oh"+Date.now(),klus:f.get("klus"),date:f.get("date"),text:f.get("text")});toast("Onderhoud onthouden");persist();});
  root.querySelector("[data-finish-day]")?.addEventListener("click",()=>{const open=checklist(data).filter(x=>!x.ok);alert(open.length ? "Nog doen:\n\n"+open.map(x=>"• "+x.text).join("\n") : "Je werkdag is helemaal bijgewerkt.");});
  root.querySelectorAll("[data-smart-paid]").forEach((b)=>b.addEventListener("click",()=>{data.facturen.find(f=>f.id===b.dataset.smartPaid).status="betaald";toast("Factuur betaald");persist();}));
  root.querySelectorAll("[data-copy-payment]").forEach((b)=>b.addEventListener("click",async()=>{const f=data.facturen.find(x=>x.id===b.dataset.copyPayment);const text=`Beste klant, factuur ${f.nr} van ${euro(f.bedrag)} staat nog open. Wilt u deze alstublieft voldoen? Met vriendelijke groet, ${data.firm}.`;await navigator.clipboard.writeText(text);toast("Betaalbericht gekopieerd");}));
  root.querySelector("[data-export-accounting]")?.addEventListener("click",()=>{const rows=["type;nummer;datum;omschrijving;bedrag;status",...data.facturen.map(f=>["factuur",f.nr,f.dag,f.titel,f.bedrag,f.status].join(";")),...data.inkoop.map(x=>["inkoop","",x.dag,x.leverancier+" "+(x.tekst||""),x.bedrag,"betaald"].join(";"))];const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([rows.join("\n")],{type:"text/csv"}));a.download="vakento-boekhouding.csv";a.click();});
}
