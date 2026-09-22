import { api, euro, gb, me } from "./api.js";

function $(s) {
  return document.querySelector(s);
}

function showErr(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

function dag(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
}

function wisLokaal(uid) {
  try {
    if (uid) localStorage.removeItem("vakento.v3." + uid);
    localStorage.removeItem("vakento.v3");
    sessionStorage.removeItem("vakento.uid");
    sessionStorage.removeItem("vakento.firm");
  } catch (_) {}
}

async function pay(sku) {
  const checkout = await api("/api/pay", { sku });
  location.href = checkout.checkoutUrl;
}

async function afterAuth() {
  const user = await me();
  if (user.paid) {
    location.replace("werk.html");
    return;
  }
  location.replace("/#inloggen");
}

async function bindAuth(form, mode) {
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = form.querySelector("[data-err]");
    err.hidden = true;
    const f = new FormData(form);
    try {
      await api(mode === "login" ? "/api/login" : "/api/register", {
        name: f.get("name"),
        email: f.get("email"),
        password: f.get("password"),
      });
      await afterAuth();
    } catch (ex) {
      showErr(err, ex.message);
    }
  });
}

document.querySelectorAll("[data-buy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      const user = await me();
      if (!user.email) {
        location.hash = "#account";
        return;
      }
      await pay(btn.getAttribute("data-buy"));
    } catch (ex) {
      alert(ex.message);
    }
  });
});

bindAuth($("[data-register]"), "register");
bindAuth($("[data-login]"), "login");

const accountLoginOnly = /account\.html$/i.test(location.pathname) && !document.querySelector("[data-me]");
if (accountLoginOnly) {
  const user = await me();
  if (user?.email && user?.paid) location.replace("werk.html");
}


const box = $("[data-me]");
const loginView = $("[data-login-view]");
const accountView = $("[data-account-view]");
if (box || loginView || accountView) {
  const user = await me();
  if (!user.email) {
    if (loginView) loginView.hidden = false;
    if (accountView) accountView.hidden = true;
    if (box) box.innerHTML = "<p class='muted'>Nog niet ingelogd.</p>";
  } else {
    if (loginView) loginView.hidden = true;
    if (accountView) accountView.hidden = false;
    const pct = user.quotaBytes ? Math.min(100, Math.round((user.usedBytes / user.quotaBytes) * 100)) : 0;
    const stand = user.trial
      ? "Gratis tot " + dag(user.paidUntil) + ". Daarna stopt het vanzelf. Betaal je, dan blijft alles staan."
      : user.paid
        ? "Betaald tot " + dag(user.paidUntil)
        : "Gestopt";
    box.innerHTML = `
      <p><strong>${user.name}</strong> · ${user.email}</p>
      <p class="${user.paid ? "ok" : "warn"}">${stand}</p>
      <p>Cloud: ${gb(user.usedBytes)} GB van ${gb(user.quotaBytes)} GB (${user.freeGb} GB in het pakket + ${user.extraGb} GB extra)</p>
      <div class="bar"><i style="width:${pct}%"></i></div>
      ${user.paid ? '<p><a class="btn" href="werk.html">Naar de werkplaats</a></p>' : ""}
      ${user.trial ? '<p><button class="btn" type="button" data-buy-now>Betalen, werkplaats houden</button></p>' : ""}
      ${user.admin ? '<p><a class="btn" href="admin.html">Admin: alles zien</a></p>' : ""}
      <p><a class="btn btn-ghost" href="/logout.html?v=2">Uitloggen</a></p>
      ${user.admin ? "" : '<p><button class="btn btn-ghost" type="button" data-stop>Stoppen en account wissen</button></p>'}`;
    box.querySelector("[data-buy-now]")?.addEventListener("click", async () => {
      try {
        await pay("werkplaats");
      } catch (ex) {
        alert(ex.message);
      }
    });
    box.querySelector("[data-stop]")?.addEventListener("click", async () => {
      if (!confirm("Stoppen wist je account en alle klussen. Dit kan niet terug. Doorgaan?")) return;
      const uid = user.id;
      await api("/api/stop", {});
      wisLokaal(uid);
      location.href = "/#abonnementen";
    });
  }
}

const paidBox = $("[data-paid]");
if (paidBox) {
  const params = new URLSearchParams(location.search);
  const token = params.get("token") || params.get("orderID") || "";
  try {
    await api("/api/pay/confirm", token ? { token } : {});
  } catch (_) {}
  const user = await me();
  paidBox.innerHTML = user.everPaid && user.paid
    ? `<h1>Betaling binnen. Alles blijft staan.</h1><p>Je cloud: ${gb(user.usedBytes)} / ${gb(user.quotaBytes)} GB.</p><p><a class="btn" href="werk.html">Open de werkplaats</a></p>`
    : `<h1>Even wachten.</h1><p>iDEAL via Mollie is nog niet bevestigd. Ververs over een paar seconden.</p><p><a class="btn" href="account.html">Naar account</a></p>`;
}


const forgotOpen = $("[data-forgot-open]");
const forgotForm = $("[data-forgot]");
const forgotCancel = $("[data-forgot-cancel]");
const loginForm = $("[data-login]");

forgotOpen?.addEventListener("click", () => {
  if (loginForm) loginForm.hidden = true;
  if (forgotForm) forgotForm.hidden = false;
  const loginEmail = loginForm?.querySelector('[name="email"]')?.value || "";
  const forgotEmail = forgotForm?.querySelector('[name="email"]');
  if (forgotEmail && loginEmail) forgotEmail.value = loginEmail;
  forgotEmail?.focus();
});

forgotCancel?.addEventListener("click", () => {
  if (forgotForm) forgotForm.hidden = true;
  if (loginForm) loginForm.hidden = false;
});

forgotForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = forgotForm.querySelector("[data-forgot-msg]");
  const f = new FormData(forgotForm);
  if (msg) msg.hidden = true;
  try {
    await api("/api/password/forgot", { email: f.get("email") });
    if (msg) {
      msg.textContent = "Als dit e-mailadres bij Vakento bekend is, ontvang je zo een herstellink.";
      msg.hidden = false;
    }
  } catch (ex) {
    if (msg) {
      msg.textContent = ex.message || "Herstellink versturen is niet gelukt.";
      msg.hidden = false;
    }
  }
});


document.querySelector("[data-mailbox-create]")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const msg = form.querySelector("[data-mailbox-msg]");
  const localpart = String(new FormData(form).get("localpart") || "").trim().toLowerCase();
  if (msg) msg.hidden = true;
  if (!/^[a-z0-9._-]{2,40}$/.test(localpart)) {
    if (msg) {
      msg.textContent = "Kies 2 tot 40 letters, cijfers, punten, streepjes of underscores.";
      msg.hidden = false;
    }
    return;
  }
  try {
    const out = await api("/api/mailbox/create", { localpart });
    if (msg) {
      msg.textContent = "Aangemaakt: " + (out.email || (localpart + "@vakento.nl"));
      msg.hidden = false;
    }
  } catch (ex) {
    if (msg) {
      msg.textContent = ex.message || "E-mailadres aanmaken is niet gelukt.";
      msg.hidden = false;
    }
  }
});
