import { api } from "./api.js";
import { save } from "./store.js?v=open1";

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function num(c, index) {
  return String(c.klantnr || c.customerNumber || (1001 + index));
}

function normalize(c = {}) {
  return {
    id: String(c.id || ""),
    entityType: c.entityType || c.entity_type || "bedrijf",
    type: c.type || c.contactType || c.contact_type || "klant",
    name: c.name || c.companyName || c.company_name || "",
    contact: c.contact || c.contactPerson || c.contact_person || "",
    email: c.email || "",
    factuurEmail: c.factuurEmail || c.invoiceEmail || c.invoice_email || "",
    tel: c.tel || c.phone || "",
    adres: c.adres || c.address || "",
    postcode: c.postcode || c.postalCode || c.postal_code || "",
    plaats: c.plaats || c.city || "",
    land: c.land || c.country || "Nederland",
    kvk: c.kvk || c.kvkNumber || c.kvk_number || "",
    btw: c.btw || c.vatNumber || c.vat_number || "",
    oin: c.oin || "",
    klantnr: c.klantnr || c.customerNumber || c.customer_number || "",
    betaaltermijn: Number(c.betaaltermijn || c.paymentTermDays || c.payment_term_days || 30),
    notitie: c.notitie || c.notes || "",
  };
}

function payloadFrom(form) {
  const f = new FormData(form);
  return {
    entityType: String(f.get("entityType") || "bedrijf"),
    type: String(f.get("type") || "klant"),
    name: String(f.get("name") || "").trim(),
    contact: String(f.get("contact") || "").trim(),
    email: String(f.get("email") || "").trim(),
    factuurEmail: String(f.get("factuurEmail") || "").trim(),
    tel: String(f.get("tel") || "").trim(),
    adres: String(f.get("adres") || "").trim(),
    postcode: String(f.get("postcode") || "").trim(),
    plaats: String(f.get("plaats") || "").trim(),
    land: String(f.get("land") || "Nederland").trim(),
    kvk: String(f.get("kvk") || "").trim(),
    btw: String(f.get("btw") || "").trim(),
    oin: String(f.get("oin") || "").trim(),
    klantnr: String(f.get("klantnr") || "").trim(),
    betaaltermijn: Number(f.get("betaaltermijn") || 30),
    notitie: String(f.get("notitie") || "").trim(),
  };
}

function rowsHtml(contacts = []) {
  if (!contacts.length) {
    return '<tr><td colspan="7"><p class="muted">Nog geen contacten. Voeg je eerste klant of leverancier toe.</p></td></tr>';
  }
  return contacts.map((ct, index) => {
    const c = normalize(ct);
    const search = [c.name,c.contact,c.email,c.factuurEmail,c.plaats,c.tel,c.klantnr,c.kvk,c.btw,c.type]
      .filter(Boolean).join(" ").toLowerCase();
    return `<tr data-contact-row data-id="${esc(c.id)}" data-type="${esc(c.type)}" data-search="${esc(search)}">
      <td><strong>${esc(num(c,index))}</strong></td>
      <td><strong>${esc(c.name || "Naamloos contact")}</strong>${c.contact ? `<small class="muted contact-sub">${esc(c.contact)}</small>` : ""}</td>
      <td><span class="contact-pill">${c.type === "leverancier" ? "Leverancier" : "Klant"}</span></td>
      <td>${esc(c.plaats)}</td>
      <td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}</td>
      <td>${c.tel ? `<a href="tel:${esc(c.tel)}">${esc(c.tel)}</a>` : ""}</td>
      <td class="num"><button class="btn btn-ghost" type="button" data-contact-edit="${esc(c.id)}">Bewerken</button></td>
    </tr>`;
  }).join("");
}

export function viewContacten(data) {
  const contacten = data.klanten || [];
  return `
    <div class="row contacts-head">
      <div>
        <p class="kicker">Relaties</p>
        <h1>Contacten</h1>
        <p class="muted">Klanten en leveranciers centraal opgeslagen. Op laptop en telefoon hetzelfde.</p>
      </div>
      <div class="actions">
        <label class="btn btn-ghost" style="cursor:pointer">Importeer CSV<input type="file" accept=".csv,text/csv" data-contact-import hidden></label>
        <button class="btn btn-ghost" type="button" data-contact-export>Exporteer CSV</button>
        <button class="btn" type="button" data-contact-new>+ Nieuw contact</button>
      </div>
    </div>

    <div class="card contacts-db-state" data-contacts-db-state>
      <strong>Contactendatabase</strong>
      <span class="muted">Verbinden met de Vakento database…</span>
    </div>

    <div class="contacts-summary">
      <button type="button" class="contact-filter active" data-contact-type="">Alle</button>
      <button type="button" class="contact-filter" data-contact-type="klant">Klanten</button>
      <button type="button" class="contact-filter" data-contact-type="leverancier">Leveranciers</button>
    </div>

    <div class="card contacts-toolbar">
      <label class="contacts-search">Zoeken
        <input type="search" data-contact-search placeholder="Naam, e-mail, plaats, telefoon, klantnummer…">
      </label>
    </div>

    <div class="card contacts-table-wrap">
      <table class="table contacts-table">
        <thead><tr><th>Nr.</th><th>Contact</th><th>Type</th><th>Plaats</th><th>E-mail</th><th>Telefoon</th><th></th></tr></thead>
        <tbody data-contact-list>${rowsHtml(contacten)}</tbody>
      </table>
    </div>

    <dialog class="contact-dialog" data-contact-dialog>
      <form class="contact-form" data-contact-form>
        <input type="hidden" name="id">
        <div class="contact-dialog-head">
          <div><p class="kicker">Contact</p><h2 data-contact-title>Nieuw contact</h2></div>
          <button class="btn btn-ghost" type="button" data-contact-close>Sluiten</button>
        </div>

        <div class="contact-choice-grid">
          <fieldset>
            <legend>Bedrijf of particulier?</legend>
            <label><input type="radio" name="entityType" value="bedrijf" checked> Bedrijf</label>
            <label><input type="radio" name="entityType" value="particulier"> Particulier</label>
          </fieldset>
          <fieldset>
            <legend>Type contact</legend>
            <label><input type="radio" name="type" value="klant" checked> Klant</label>
            <label><input type="radio" name="type" value="leverancier"> Leverancier</label>
          </fieldset>
        </div>

        <div class="contact-grid">
          <label class="wide">Naam / bedrijfsnaam *<input name="name" required maxlength="160"></label>
          <label>Contactpersoon<input name="contact" maxlength="160"></label>
          <label>E-mailadres<input name="email" type="email" maxlength="190"></label>
          <label class="wide">Adres<input name="adres" maxlength="190"></label>
          <label>Postcode<input name="postcode" maxlength="20"></label>
          <label>Plaats<input name="plaats" maxlength="120"></label>
          <label>Land<input name="land" maxlength="100" value="Nederland"></label>
          <label>KvK-nummer<input name="kvk" maxlength="32"></label>
          <label>Btw-nummer<input name="btw" maxlength="40"></label>
          <label>Telefoonnummer<input name="tel" maxlength="50"></label>
          <label>OIN<input name="oin" maxlength="50"></label>
          <label>Klantnummer<input name="klantnr" maxlength="40"></label>
          <label>Factuur e-mail<input name="factuurEmail" type="email" maxlength="190"></label>
          <label>Betaaltermijn
            <select name="betaaltermijn"><option value="14">14 dagen</option><option value="30" selected>30 dagen</option><option value="60">60 dagen</option></select>
          </label>
          <label class="wide">Notitie / vrije velden<textarea name="notitie" rows="3" maxlength="2000"></textarea></label>
        </div>

        <div class="contact-form-actions">
          <button class="btn btn-ghost" type="button" data-contact-delete hidden>Verwijderen</button>
          <span class="contact-form-spacer"></span>
          <button class="btn btn-ghost" type="button" data-contact-close>Annuleren</button>
          <button class="btn" type="submit">Opslaan</button>
        </div>
      </form>
    </dialog>
  `;
}

export function bindContacten(root, { data, toast }) {
  const list = root.querySelector("[data-contact-list]");
  if (!list) return;

  const state = root.querySelector("[data-contacts-db-state]");
  const dialog = root.querySelector("[data-contact-dialog]");
  const form = root.querySelector("[data-contact-form]");

  const setState = (text, ok = true) => {
    if (!state) return;
    state.querySelector("span").textContent = text;
    state.classList.toggle("warn", !ok);
  };

  const renderRows = () => {
    list.innerHTML = rowsHtml(data.klanten || []);
    bindEditButtons();
    applyFilter();
  };

  const cache = () => {
    try { save(data); } catch (_) {}
  };

  const syncFromDatabase = async () => {
    try {
      const out = await api("/api/contacts", null, "GET");
      const rows = out.contacts || out.contacten || [];
      const remote = rows.map(normalize);
      const local = (data.klanten || []).map(normalize);

      // Eerste synchronisatie: staat de server nog leeg maar zijn er lokaal al
      // contacten, zet die dan eerst veilig over naar de centrale database.
      if (!remote.length && local.length) {
        const migrated = [];
        for (const contact of local) {
          const payload = { ...contact };
          delete payload.id;
          try {
            const saved = await api("/api/contacts", payload, "POST");
            migrated.push(normalize(saved.contact || saved));
          } catch (_) {}
        }
        if (migrated.length) {
          data.klanten = migrated;
          cache();
          renderRows();
          setState(migrated.length + " bestaande contacten naar de Vakento database overgezet.");
          return;
        }
      }

      data.klanten = remote;
      cache();
      renderRows();
      setState(data.klanten.length + " contacten veilig opgeslagen in Vakento.");
    } catch (err) {
      setState("Database nog niet bereikbaar. Contacten worden tijdelijk lokaal getoond.", false);
    }
  };

  const openContact = (ct = null) => {
    if (!dialog || !form) return;
    const c = ct ? normalize(ct) : null;
    form.reset();
    form.elements.id.value = c?.id || "";
    form.elements.name.value = c?.name || "";
    form.elements.contact.value = c?.contact || "";
    form.elements.email.value = c?.email || "";
    form.elements.adres.value = c?.adres || "";
    form.elements.postcode.value = c?.postcode || "";
    form.elements.plaats.value = c?.plaats || "";
    form.elements.land.value = c?.land || "Nederland";
    form.elements.kvk.value = c?.kvk || "";
    form.elements.btw.value = c?.btw || "";
    form.elements.tel.value = c?.tel || "";
    form.elements.oin.value = c?.oin || "";
    form.elements.klantnr.value = c?.klantnr || String(1001 + (data.klanten || []).length);
    form.elements.factuurEmail.value = c?.factuurEmail || "";
    form.elements.betaaltermijn.value = String(c?.betaaltermijn || 30);
    form.elements.notitie.value = c?.notitie || "";
    const entity = form.querySelector(`[name="entityType"][value="${c?.entityType || "bedrijf"}"]`);
    if (entity) entity.checked = true;
    const type = form.querySelector(`[name="type"][value="${c?.type || "klant"}"]`);
    if (type) type.checked = true;
    root.querySelector("[data-contact-title]").textContent = c ? "Contact bewerken" : "Nieuw contact";
    root.querySelector("[data-contact-delete]").hidden = !c;
    dialog.showModal();
  };

  const bindEditButtons = () => {
    root.querySelectorAll("[data-contact-edit]").forEach((btn) => {
      btn.onclick = () => {
        const ct = (data.klanten || []).find((x) => String(x.id) === String(btn.dataset.contactEdit));
        if (ct) openContact(ct);
      };
    });
  };

  root.querySelector("[data-contact-new]")?.addEventListener("click", () => openContact());
  root.querySelectorAll("[data-contact-close]").forEach((btn) => btn.addEventListener("click", () => dialog?.close()));

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = payloadFrom(form);
    if (!payload.name) return;
    const id = String(form.elements.id.value || "");
    try {
      const out = id
        ? await api("/api/contacts/" + encodeURIComponent(id), payload, "PUT")
        : await api("/api/contacts", payload, "POST");
      const saved = normalize(out.contact || out);
      if (id) {
        const i = data.klanten.findIndex((x) => String(x.id) === id);
        if (i >= 0) data.klanten[i] = saved;
      } else {
        data.klanten.unshift(saved);
      }
      cache();
      renderRows();
      dialog.close();
      toast(id ? "Contact bijgewerkt" : "Contact toegevoegd");
      setState(data.klanten.length + " contacten veilig opgeslagen in Vakento.");
    } catch (err) {
      setState(err.message || "Opslaan in database mislukt.", false);
      toast("Contact kon niet in de database worden opgeslagen");
    }
  });

  root.querySelector("[data-contact-delete]")?.addEventListener("click", async () => {
    const id = String(form?.elements.id.value || "");
    if (!id) return;
    const linked = data.klussen.some((k) => String(k.klant) === id) ||
      data.offertes.some((o) => String(o.klant) === id) ||
      data.facturen.some((f) => String(f.klant) === id);
    if (linked) return toast("Contact is gekoppeld aan een opdracht, offerte of factuur.");
    const ct = data.klanten.find((x) => String(x.id) === id);
    if (!confirm("Contact verwijderen: " + (ct?.name || "") + "?")) return;
    try {
      await api("/api/contacts/" + encodeURIComponent(id), {}, "DELETE");
      data.klanten = data.klanten.filter((x) => String(x.id) !== id);
      cache();
      renderRows();
      dialog.close();
      toast("Contact verwijderd");
    } catch (err) {
      toast(err.message || "Verwijderen mislukt");
    }
  });

  const applyFilter = () => {
    const q = String(root.querySelector("[data-contact-search]")?.value || "").trim().toLowerCase();
    const type = root.querySelector(".contact-filter.active")?.dataset.contactType || "";
    root.querySelectorAll("[data-contact-row]").forEach((row) => {
      row.hidden = !((!type || row.dataset.type === type) && (!q || (row.dataset.search || "").includes(q)));
    });
  };

  root.querySelector("[data-contact-search]")?.addEventListener("input", applyFilter);
  root.querySelectorAll("[data-contact-type]").forEach((btn) => btn.addEventListener("click", () => {
    root.querySelectorAll("[data-contact-type]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    applyFilter();
  }));

  root.querySelector("[data-contact-export]")?.addEventListener("click", () => {
    const headers = ["Klantnummer","Type","Naam","Contactpersoon","E-mail","Telefoon","Adres","Postcode","Plaats","Land","KvK","BTW","OIN","Factuur e-mail","Betaaltermijn","Notitie"];
    const rows = (data.klanten || []).map((raw,index) => {
      const c = normalize(raw);
      return [c.klantnr || (1001+index),c.type,c.name,c.contact,c.email,c.tel,c.adres,c.postcode,c.plaats,c.land,c.kvk,c.btw,c.oin,c.factuurEmail,c.betaaltermijn,c.notitie];
    });
    const cell = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const csv = "\uFEFF" + [headers,...rows].map((r) => r.map(cell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    const a = document.createElement("a");
    a.href = url; a.download = "vakento-contacten.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  root.querySelector("[data-contact-import]")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return toast("Geen contacten gevonden");
    const delimiter = lines[0].includes(";") ? ";" : ",";
    const clean = (s) => String(s || "").trim().replace(/^"|"$/g, "").replace(/""/g, '"');
    const headers = lines[0].split(delimiter).map((v) => clean(v).toLowerCase());
    let added = 0;
    for (const line of lines.slice(1)) {
      const vals = line.split(delimiter).map(clean);
      const get = (...names) => {
        for (const n of names) {
          const i = headers.indexOf(n);
          if (i >= 0) return vals[i] || "";
        }
        return "";
      };
      const name = get("naam","bedrijfsnaam","contact");
      if (!name) continue;
      const payload = {
        entityType:"bedrijf",
        type:(get("type") || "klant").toLowerCase().includes("lever") ? "leverancier" : "klant",
        name,
        contact:get("contactpersoon"), email:get("e-mail","email"), tel:get("telefoon","telefoonnummer"),
        adres:get("adres"), postcode:get("postcode"), plaats:get("plaats"), land:get("land") || "Nederland",
        kvk:get("kvk","kvk-nummer"), btw:get("btw","btw-nummer"), oin:get("oin"), klantnr:get("klantnummer"),
        factuurEmail:get("factuur e-mail"), betaaltermijn:Number(get("betaaltermijn") || 30), notitie:get("notitie")
      };
      try {
        const out = await api("/api/contacts", payload, "POST");
        data.klanten.push(normalize(out.contact || out));
        added++;
      } catch (_) {}
    }
    cache(); renderRows(); toast(added + " contacten geïmporteerd");
  });

  bindEditButtons();
  syncFromDatabase();
}
