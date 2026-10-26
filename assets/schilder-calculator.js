(() => {
  "use strict";

  // The VPS is the authoritative source for free usage. No browser-side quota.
  const LIMIT = 3;
  const LABELS = {
    walls: "Muren schilderen",
    ceilings: "Plafonds schilderen",
    frames: "Kozijnen schilderen",
    doors: "Deuren schilderen",
    rot: "Houtrot herstellen"
  };
  const eur = new Intl.NumberFormat("nl-NL", {style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2});
  const dec = new Intl.NumberFormat("nl-NL", {maximumFractionDigits:2});
  const form = document.getElementById("estimator");
  const result = document.getElementById("result");
  const gate = document.getElementById("member-gate");
  const counter = document.getElementById("remaining");
  const button = document.getElementById("calculate");
  const error = document.getElementById("error");
  if (!form || !result || !counter || !button || !gate) return;
  let used=3, member=false, ready=false, busy=false;
  function update() {
    const remaining = Math.max(0, LIMIT-used);
    counter.textContent = !ready ? "Serververbinding controleren…" :
      member ? "Vakento-lid: onbeperkt rekenen" :
      remaining===0 ? "Je 3 gratis berekeningen zijn gebruikt" :
      "Nog "+remaining+" gratis berekening"+(remaining===1?"":"en");
    gate.hidden = !ready || member || remaining>0;
    button.disabled = !ready || busy || (!member && remaining===0);
    document.querySelectorAll(".work").forEach(work=>{
      work.classList.toggle("selected",work.querySelector('[name="include"]').checked);
    });
  }
  async function consume() {
    const response=await fetch("/api/public-calculators/consume",{
      method:"POST",credentials:"same-origin",cache:"no-store",
      headers:{"Content-Type":"application/json","X-Vakento-Calculator":"1"},
      body:JSON.stringify({calculator:"estimator"})
    });
    const data=await response.json().catch(()=>null);
    if(data && Number.isInteger(data.used)) used=data.used;
    if(response.status===409) return false;
    if(!response.ok || !data || data.allowed!==true) throw Error("Serverregistratie niet beschikbaar. Probeer het later opnieuw.");
    return true;
  }
  function readNumber(parent, name, {requiredPositive=false, integer=false, max=100000000} = {}) {
    const input = name.startsWith("#") ? document.querySelector(name) : parent.querySelector('[name="'+name+'"]');
    if (!input) throw new Error("Een verplicht invoerveld ontbreekt.");
    const raw = input.value.trim().replace(",", ".");
    if (raw === "") throw new Error("Vul alle gekozen werkzaamheden en kosten volledig in.");
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > max || (requiredPositive && n <= 0) || (integer && !Number.isInteger(n))) {
      throw new Error("Controleer de invoer bij '" + (input.closest("fieldset")?.querySelector("legend")?.textContent || input.labels?.[0]?.textContent || name).trim() + "'.");
    }
    return n;
  }
  function createRow(title, hours, liters, labor, materials, extras, overheadPct, markupPct, vatPct) {
    const base = labor + materials + extras;
    const overhead = base * overheadPct / 100;
    const markup = (base + overhead) * markupPct / 100;
    const ex = base + overhead + markup;
    return {title, hours, liters, labor, materials, extras, overhead, markup, ex, vatPct, vat: ex * vatPct / 100};
  }
  function calculation() {
    const rate = readNumber(form, "#hourRate");
    const prepHours = readNumber(form, "#prepHours");
    const overhead = readNumber(form, "#overhead", {max:1000});
    const markup = readNumber(form, "#markup", {max:1000});
    const extras = readNumber(form, "#extras");
    const waste = readNumber(form, "#waste", {max:1000});
    const extrasVat = readNumber(form, "#extrasVat");
    const rows = [];

    for (const work of form.querySelectorAll(".work")) {
      if (!work.querySelector('[name="include"]').checked) continue;
      const kind = work.dataset.kind;
      const qty = readNumber(work,"quantity",{requiredPositive:true,max:100000,integer:["frames","doors","rot"].includes(kind)});
      const laborPerUnit = readNumber(work,"labor",{max:100000});
      const otherPerUnit = readNumber(work,"otherUnit");
      const vat = readNumber(work,"vat");
      if (![9,21].includes(vat)) throw new Error("Kies een btw-tarief van 9% of 21%.");
      let liters=0;
      let paintCost=0;
      if (kind !== "rot") {
        const surface = ["frames","doors"].includes(kind) ? readNumber(work,"surface",{requiredPositive:true}) : 1;
        const coats = readNumber(work,"coats",{requiredPositive:true,integer:true,max:10});
        const coverage = readNumber(work,"coverage",{requiredPositive:true});
        const paintPrice = readNumber(work,"paintPrice");
        liters = qty * surface * coats / coverage * (1 + waste / 100);
        paintCost = liters * paintPrice;
      }
      const hours = qty * laborPerUnit;
      rows.push(createRow(LABELS[kind],hours,liters,hours*rate,paintCost+qty*otherPerUnit,0,overhead,markup,vat));
    }
    if (!rows.length) throw new Error("Vink minimaal één soort werk aan.");
    if (prepHours > 0 || extras > 0) {
      if (![9,21].includes(extrasVat)) throw new Error("Controleer de btw voor overige kosten.");
      rows.push(createRow("Voorbereiding en overige kosten",prepHours,0,prepHours*rate,0,extras,overhead,markup,extrasVat));
    }
    const totals = rows.reduce((out, row) => {
      for (const key of ["hours","liters","labor","materials","extras","overhead","markup","ex","vat"]) out[key] += row[key];
      out["vat"+row.vatPct] += row.vat;
      return out;
    }, {hours:0,liters:0,labor:0,materials:0,extras:0,overhead:0,markup:0,ex:0,vat:0,vat9:0,vat21:0});
    for (const v of Object.values(totals)) {
      if (!Number.isFinite(v) || v > 1000000000000) throw new Error("De totale berekening is te groot. Pas de aantallen aan.");
    }
    return {rows,totals};
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function render(data) {
    const body = document.getElementById("resultRows");
    body.replaceChildren();
    for (const row of data.rows) {
      const tr = document.createElement("tr");
      const columns = [
        row.title,
        dec.format(row.hours),
        row.liters ? dec.format(row.liters)+" L" : "–",
        eur.format(row.ex),
        eur.format(row.vat)+" ("+row.vatPct+"%)",
        eur.format(row.ex + row.vat)
      ];
      columns.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      });
      body.append(tr);
    }
    const t = data.totals;
    setText("sumHours",dec.format(t.hours)+" uur");
    setText("sumPaint",dec.format(t.liters)+" liter");
    setText("sumTotal",eur.format(t.ex+t.vat));
    setText("laborTotal",eur.format(t.labor));
    setText("materialsTotal",eur.format(t.materials));
    setText("extraTotal",eur.format(t.extras));
    setText("overheadTotal",eur.format(t.overhead));
    setText("markupTotal",eur.format(t.markup));
    setText("exVatTotal",eur.format(t.ex));
    setText("vat9Total",eur.format(t.vat9));
    setText("vat21Total",eur.format(t.vat21));
    setText("inclVatTotal",eur.format(t.ex+t.vat));
    result.hidden = false;
    result.scrollIntoView({behavior:"smooth",block:"start"});
  }
  form.addEventListener("change", (e) => {
    if (e.target.matches('[name="include"]')) update();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    error.textContent="";
    if (!member && used>=LIMIT) {update();gate.focus();return;}
    let data;
    try {data=calculation();}
    catch(err){error.textContent=err instanceof Error?err.message:"Controleer de gegevens.";result.hidden=true;return;}
    busy=true;update();
    try {
      if(!member && !await consume()){update();gate.focus();return;}
      render(data);
    }catch(err){error.textContent=err instanceof Error?err.message:"Registratie mislukt.";result.hidden=true;}
    finally{busy=false;update();}
  });
  document.getElementById("printResult")?.addEventListener("click",()=>window.print());
  update();
  Promise.all([
    fetch("/api/me",{credentials:"same-origin",cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch("/api/public-calculators/status",{credentials:"same-origin",cache:"no-store"}).then(r=>{if(!r.ok)throw Error("quota");return r.json();})
  ]).then(([user,quota])=>{
    if(!quota || !Number.isInteger(quota.used)) throw Error("Invalid quota");
    member=!!(user && user.paid===true);
    used=quota.used;ready=true;update();
  }).catch(()=>{counter.textContent="Gratis berekeningen tijdelijk niet beschikbaar. Probeer later opnieuw.";});
})();
