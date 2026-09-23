import { api } from "./api.js";

const state = {
  files: [],
  batch: "",
  analysis: null,
  busy: false,
};

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function sizeLabel(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " kB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

function batchId() {
  if (state.batch) return state.batch;
  const rnd = Math.random().toString(36).slice(2, 10);
  state.batch = "rompslomp-" + Date.now() + "-" + rnd;
  return state.batch;
}

function summaryCards(a = {}) {
  const s = a.summary || {};
  const cards = [
    ["Contacten", s.contacts ?? s.contacten ?? 0],
    ["Facturen", s.invoices ?? s.facturen ?? 0],
    ["Uitgaven", s.expenses ?? s.uitgaven ?? 0],
    ["Uren", s.hours ?? s.uren ?? 0],
    ["Artikelen", s.products ?? s.artikelen ?? 0],
    ["Bestanden", s.documents ?? s.bestanden ?? state.files.length],
  ];
  return cards.map(([label, value]) =>
    `<div class="stat"><span>${esc(label)}</span><b>${esc(value)}</b></div>`
  ).join("");
}

function fileRows() {
  if (!state.files.length) {
    return '<article class="item"><strong>Nog geen bestanden gekozen</strong><span>Download eerst je exports uit Rompslomp en voeg ze hier toe.</span></article>';
  }
  return state.files.map((file, index) => `
    <article class="item">
      <div>
        <strong>${esc(file.name)}</strong>
        <span>${sizeLabel(file.size)} · ${esc(file.type || "bestand")}</span>
      </div>
      <button class="btn btn-ghost" type="button" data-rompslomp-remove="${index}">Verwijderen</button>
    </article>
  `).join("");
}

function analysisHtml() {
  if (!state.analysis) return "";
  const a = state.analysis;
  const warnings = Array.isArray(a.warnings) ? a.warnings : [];
  const duplicates = a.duplicates || {};
  const duplicateTotal = Object.values(duplicates).reduce((n, x) => n + Number(x || 0), 0);

  return `
    <section class="card" style="margin-top:18px" data-rompslomp-analysis>
      <div class="row">
        <div>
          <p class="kicker">Controle vóór importeren</p>
          <h2>Dit heeft Vakento gevonden</h2>
          <p class="muted">Er is nog niets definitief geïmporteerd.</p>
        </div>
      </div>
      <div class="stat-grid" style="margin-top:14px">${summaryCards(a)}</div>
      ${duplicateTotal ? `<p class="warn" style="margin-top:14px">${duplicateTotal} mogelijke dubbele records gevonden. Deze worden bij de import niet blind overschreven.</p>` : ""}
      ${warnings.length ? `
        <div class="card" style="margin-top:14px;padding:14px">
          <strong>Controlepunten</strong>
          <ul>${warnings.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        </div>` : ""}
      <label style="display:flex;gap:10px;align-items:flex-start;margin-top:18px">
        <input type="checkbox" data-rompslomp-confirm>
        <span>Ik heb de aantallen gecontroleerd. Bestaande Vakento-gegevens mogen niet worden overschreven.</span>
      </label>
      <div class="actions" style="margin-top:14px">
        <button class="btn" type="button" data-rompslomp-import disabled>Importeer naar Vakento</button>
        <button class="btn btn-ghost" type="button" data-rompslomp-reset>Opnieuw beginnen</button>
      </div>
      <p class="muted" data-rompslomp-result hidden style="margin-top:12px"></p>
    </section>
  `;
}

export function viewRompslomp() {
  return `
    <div class="row">
      <div>
        <p class="kicker">Overstappen</p>
        <h1>Overstappen van Rompslomp</h1>
        <p class="muted">Neem je contacten, facturen, uitgaven, uren, artikelen en administratie mee naar Vakento.</p>
      </div>
    </div>

    <section class="card">
      <div class="row">
        <div>
          <p class="kicker">Stap 1</p>
          <h2>Voeg je Rompslomp-exports toe</h2>
          <p class="muted">Je kunt meerdere bestanden tegelijk kiezen. Ondersteund: CSV, XLS, XLSX, XML, ZIP en PDF.</p>
        </div>
        <label class="btn" style="cursor:pointer">
          Bestanden kiezen
          <input type="file" data-rompslomp-files multiple accept=".csv,.xls,.xlsx,.xml,.zip,.pdf,text/csv,application/xml,application/pdf" hidden>
        </label>
      </div>

      <div class="list" data-rompslomp-file-list style="margin-top:14px">${fileRows()}</div>

      <div class="card" style="margin-top:16px;padding:14px">
        <strong>Wat Vakento doet</strong>
        <p class="muted" style="margin-top:6px">De bestanden worden eerst veilig op de VPS gezet en geanalyseerd. Pas na jouw controle wordt er geïmporteerd. Bestaande Vakento-data blijft staan.</p>
      </div>

      <div class="actions" style="margin-top:16px">
        <button class="btn" type="button" data-rompslomp-analyse ${state.files.length ? "" : "disabled"}>Analyseer bestanden</button>
        <span class="muted" data-rompslomp-status></span>
      </div>
    </section>

    <section class="card" style="margin-top:18px">
      <p class="kicker">Wat kun je meenemen?</p>
      <div class="grid-2">
        <div><strong>Relaties</strong><p class="muted">Klanten en leveranciers, adressen, e-mail, KvK en btw-nummers.</p></div>
        <div><strong>Verkoop</strong><p class="muted">Facturen, factuurnummers, datums, bedragen, btw en betaalstatus.</p></div>
        <div><strong>Inkoop</strong><p class="muted">Uitgaven, leveranciers en waar mogelijk de originele bon of bijlage.</p></div>
        <div><strong>Uren & artikelen</strong><p class="muted">Urenregistratie en product- of dienstenlijsten wanneer die in de export aanwezig zijn.</p></div>
      </div>
    </section>

    <div data-rompslomp-analysis-host>${analysisHtml()}</div>
  `;
}

async function uploadFile(file, batch) {
  const q = new URLSearchParams({ batch, naam: file.name });
  const res = await fetch("/api/import/rompslomp/upload?" + q.toString(), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Size": String(file.size || 0),
    },
    body: file,
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || (file.name + " kon niet worden geüpload"));
  return out;
}

export function bindRompslomp(root, { persist, toast }) {
  const input = root.querySelector("[data-rompslomp-files]");
  const list = root.querySelector("[data-rompslomp-file-list]");
  const analyse = root.querySelector("[data-rompslomp-analyse]");
  const status = root.querySelector("[data-rompslomp-status]");
  const host = root.querySelector("[data-rompslomp-analysis-host]");

  const rerenderFiles = () => {
    if (list) list.innerHTML = fileRows();
    if (analyse) analyse.disabled = !state.files.length || state.busy;
    bindRemove();
  };

  const bindAnalysis = () => {
    const confirmBox = root.querySelector("[data-rompslomp-confirm]");
    const importBtn = root.querySelector("[data-rompslomp-import]");
    confirmBox?.addEventListener("change", () => {
      if (importBtn) importBtn.disabled = !confirmBox.checked || state.busy;
    });

    root.querySelector("[data-rompslomp-reset]")?.addEventListener("click", () => {
      state.files = [];
      state.analysis = null;
      state.batch = "";
      state.busy = false;
      if (host) host.innerHTML = "";
      rerenderFiles();
      if (status) status.textContent = "";
    });

    importBtn?.addEventListener("click", async () => {
      if (!state.analysis || !confirmBox?.checked || state.busy) return;
      state.busy = true;
      importBtn.disabled = true;
      const result = root.querySelector("[data-rompslomp-result]");
      if (result) {
        result.hidden = false;
        result.textContent = "Importeren…";
      }
      try {
        const out = await api("/api/import/rompslomp/import", {
          batch: state.batch,
          archiveOriginals: true,
          overwriteExisting: false,
        });
        if (result) {
          result.textContent = out.message || "Import voltooid. Je Rompslomp-gegevens staan nu in Vakento.";
          result.classList.remove("warn");
          result.classList.add("ok");
        }
        toast("Rompslomp-import voltooid");
        try { await persist?.(); } catch (_) {}
      } catch (err) {
        if (result) {
          result.textContent = err.message || "Importeren is niet gelukt.";
          result.classList.add("warn");
        }
      } finally {
        state.busy = false;
      }
    });
  };

  const bindRemove = () => {
    root.querySelectorAll("[data-rompslomp-remove]").forEach((btn) => {
      btn.onclick = () => {
        state.files.splice(Number(btn.dataset.rompslompRemove), 1);
        state.analysis = null;
        state.batch = "";
        if (host) host.innerHTML = "";
        rerenderFiles();
      };
    });
  };

  input?.addEventListener("change", () => {
    const incoming = [...(input.files || [])];
    input.value = "";
    for (const file of incoming) {
      if (!state.files.some((x) => x.name === file.name && x.size === file.size)) state.files.push(file);
    }
    state.analysis = null;
    state.batch = "";
    if (host) host.innerHTML = "";
    rerenderFiles();
  });

  analyse?.addEventListener("click", async () => {
    if (!state.files.length || state.busy) return;
    state.busy = true;
    analyse.disabled = true;
    const batch = batchId();
    if (status) status.textContent = "Bestanden veilig naar de VPS sturen…";
    try {
      for (let i = 0; i < state.files.length; i++) {
        if (status) status.textContent = `Upload ${i + 1} van ${state.files.length}: ${state.files[i].name}`;
        await uploadFile(state.files[i], batch);
      }
      if (status) status.textContent = "Bestanden analyseren…";
      state.analysis = await api("/api/import/rompslomp/analyse", { batch });
      if (host) host.innerHTML = analysisHtml();
      bindAnalysis();
      if (status) status.textContent = "Analyse klaar. Controleer de aantallen hieronder.";
    } catch (err) {
      if (status) status.textContent = err.message || "De Rompslomp-importservice op de VPS is nog niet bereikbaar.";
      toast("Importservice niet bereikbaar");
    } finally {
      state.busy = false;
      analyse.disabled = !state.files.length;
    }
  });

  bindRemove();
  bindAnalysis();

  api("/api/import/rompslomp/status", null, "GET").catch(() => null);
}
