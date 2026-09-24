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
  return new Date(iso).toLocaleDateString(window.VakentoI18n?.locale || "nl-NL", { day: "numeric", month: "long" });
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
    const submit = form.querySelector('button[type="submit"]');
    if (err) err.hidden = true;
    if (submit) {
      submit.disabled = true;
      submit.dataset.originalText = submit.textContent;
      submit.textContent = mode === "login" ? "Inloggen…" : "Account maken…";
    }
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
      if (submit) {
        submit.disabled = false;
        submit.textContent = submit.dataset.originalText || (mode === "login" ? "Inloggen" : "Account maken en beginnen");
      }
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
    : `<h1>Even wachten.</h1><p>De betaling via iDEAL of PayPal is nog niet bevestigd. Ververs over een paar seconden.</p><p><a class="btn" href="account.html">Naar account</a></p>`;
}


function setAuthMode(mode) {
  const safe = mode === "register" ? "register" : "login";
  document.querySelectorAll("[data-auth-mode]").forEach((btn) => {
    const active = btn.dataset.authMode === safe;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.authPanel !== safe;
  });
  const forgot = $("[data-forgot]");
  if (forgot) forgot.hidden = true;
  try {
    const url = new URL(location.href);
    url.searchParams.set("mode", safe);
    history.replaceState(null, "", url);
  } catch (_) {}
  const first = document.querySelector(`[data-auth-panel="${safe}"] input`);
  setTimeout(() => first?.focus(), 0);
}

document.querySelectorAll("[data-auth-mode]").forEach((btn) => {
  btn.addEventListener("click", () => setAuthMode(btn.dataset.authMode));
});
document.querySelectorAll("[data-go-login]").forEach((btn) => {
  btn.addEventListener("click", () => setAuthMode("login"));
});
document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = btn.closest(".password-row")?.querySelector("input");
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "Verberg" : "Toon";
  });
});

const requestedMode = new URLSearchParams(location.search).get("mode");
if (requestedMode === "register") setAuthMode("register");
else setAuthMode("login");

const forgotOpen = $("[data-forgot-open]");
const forgotForm = $("[data-forgot]");
const forgotCancel = $("[data-forgot-cancel]");
const loginForm = $("[data-login]");

forgotOpen?.addEventListener("click", () => {
  document.querySelectorAll("[data-auth-panel]").forEach((panel) => panel.hidden = true);
  if (forgotForm) forgotForm.hidden = false;
  const loginEmail = loginForm?.querySelector('[name="email"]')?.value || "";
  const forgotEmail = forgotForm?.querySelector('[name="email"]');
  if (forgotEmail && loginEmail) forgotEmail.value = loginEmail;
  forgotEmail?.focus();
});

forgotCancel?.addEventListener("click", () => {
  if (forgotForm) forgotForm.hidden = true;
  setAuthMode("login");
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
