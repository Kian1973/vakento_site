import { api, euro, gb, me } from "./api.js";

const login = document.querySelector("[data-login]");
const board = document.querySelector("[data-board]");
const err = document.querySelector("[data-err]");

function memberState(u) {
  if (u.admin) return "admin";
  if (u.trial) return "trial";
  if (u.paid) return "active";
  return "inactive";
}

function rowUser(u) {
  const plan = u.planSku === "proplus" ? "proplus" : "werkplaats";
  const state = memberState(u);
  const stateLabel = state === "trial" ? "Proefperiode" : state === "active" ? "Actief" : state === "admin" ? "Admin" : "Niet actief";
  const paidUntil = u.paidUntil ? new Date(u.paidUntil).toLocaleDateString("nl-NL") : "—";
  return `<tr data-member-row data-state="${state}" data-search="${String((u.name || "") + " " + (u.email || "")).toLowerCase()}">
    <td><strong>${u.name || "Naam onbekend"}</strong></td>
    <td><span class="member-email">${u.email || "—"}</span></td>
    <td><span class="member-status ${state}">${stateLabel}</span></td>
    <td>${plan === "proplus" ? "Pro+" : "Pro"}</td>
    <td>${paidUntil}</td>
    <td>${gb(u.usedBytes)} / ${gb(u.quotaBytes)} GB</td>
    <td>${u.admin ? "admin" : "lid"}</td>
    <td>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select data-plan="${u.id}">
          <option value="werkplaats" ${plan === "werkplaats" ? "selected" : ""}>Pro</option>
          <option value="proplus" ${plan === "proplus" ? "selected" : ""}>Pro+</option>
        </select>
        <input data-months="${u.id}" type="number" min="1" max="1200" value="1" style="width:78px" aria-label="Aantal maanden">
        <button class="btn btn-ghost" data-membership="${u.id}">Toepassen</button>
        <button class="btn btn-ghost" data-gb="${u.id}">+1 GB</button>
      </div>
    </td>
  </tr>`;
}

async function teken(data) {
  login.hidden = true;
  board.hidden = false;
  document.querySelector("[data-stats]").innerHTML = `
    <div class="stat-grid">
      <div class="stat"><span class="muted">Leden</span><b>${data.leden}</b></div>
      <div class="stat"><span class="muted">Betaald</span><b>${data.betaald}</b></div>
      <div class="stat"><span class="muted">Omzet iDEAL</span><b>${euro(data.omzet)}</b></div>
      <div class="stat"><span class="muted">Mollie / AI</span><b>${data.health.mollie ? (data.health.mollieLive ? "live iDEAL" : "test iDEAL") : "sleutel ontbreekt"} / ${data.health.ai ? "AI aan" : "AI uit"}</b></div>
    </div>`;
  document.querySelector("[data-users]").innerHTML = data.users.map(rowUser).join("") || "<tr><td colspan=\"8\">Nog geen leden.</td></tr>";
  applyMemberFilter();
  document.querySelector("[data-pay]").innerHTML =
    data.payments
      .map((p) => `<tr><td>${p.id}</td><td>${p.sku}</td><td>${euro(p.amount)}</td><td>${p.status}</td></tr>`)
      .join("") || "<tr><td>Nog geen betalingen.</td></tr>";
  board.querySelectorAll("[data-membership]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const id = btn.dataset.membership;
      const plan = board.querySelector(`[data-plan="${id}"]`).value;
      const months = Number(board.querySelector(`[data-months="${id}"]`).value);
      await api("/api/admin/lidmaatschap", { userId: id, plan, months });
      await laad();
    })
  );
  board.querySelectorAll("[data-gb]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await api("/api/admin/gb", { userId: btn.dataset.gb, extraGb: 1 });
      await laad();
    })
  );
}

async function laad() {
  const data = await api("/api/admin", null, "GET");
  await teken(data);
}

login?.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.hidden = true;
  const f = new FormData(login);
  try {
    const user = await api("/api/login", { email: f.get("email"), password: f.get("password") });
    if (!user.admin) {
      err.textContent = "Dit account is geen baas.";
      err.hidden = false;
      return;
    }
    await laad();
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
  }
});

document.querySelector("[data-reg]")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.hidden = true;
  const f = new FormData(e.target);
  try {
    const user = await api("/api/register", {
      name: f.get("name") || "Baas",
      email: f.get("email"),
      password: f.get("password"),
    });
    if (!user.admin) {
      err.textContent = "Eerste account of hallo@leukonline.nl wordt baas.";
      err.hidden = false;
      return;
    }
    await laad();
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
  }
});

const who = await me();
if (who.admin) {
  try {
    await laad();
  } catch {
    login.hidden = false;
  }
}


const addMember = document.querySelector("[data-add-member]");
const addMemberMsg = document.querySelector("[data-add-member-msg]");
addMember?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (addMemberMsg) addMemberMsg.hidden = true;
  const f = new FormData(addMember);
  try {
    await api("/api/admin/lid", {
      name: f.get("name"),
      email: f.get("email"),
      password: f.get("password"),
      plan: f.get("plan"),
      months: Number(f.get("months")),
    });
    addMember.reset();
    addMember.querySelector('[name="months"]').value = "12";
    if (addMemberMsg) {
      addMemberMsg.textContent = "Lid toegevoegd.";
      addMemberMsg.hidden = false;
    }
    await laad();
  } catch (ex) {
    if (addMemberMsg) {
      addMemberMsg.textContent = ex.message;
      addMemberMsg.hidden = false;
    }
  }
});


const memberSearch = document.querySelector("[data-member-search]");
const memberFilter = document.querySelector("[data-member-filter]");

function applyMemberFilter() {
  const query = String(memberSearch?.value || "").trim().toLowerCase();
  const filter = memberFilter?.value || "all";
  let visible = 0;

  document.querySelectorAll("[data-member-row]").forEach((row) => {
    const text = row.dataset.search || "";
    const state = row.dataset.state || "inactive";
    const matchesQuery = !query || text.includes(query);
    const matchesFilter =
      filter === "all" ||
      (filter === "admin" ? state === "admin" : state === filter);
    row.hidden = !(matchesQuery && matchesFilter);
    if (!row.hidden) visible++;
  });

  const count = document.querySelector("[data-member-count]");
  if (count) count.textContent = String(visible);
}

memberSearch?.addEventListener("input", applyMemberFilter);
memberFilter?.addEventListener("change", applyMemberFilter);
