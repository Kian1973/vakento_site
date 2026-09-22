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

let pending2fa = null;

async function bindAuth(form, mode) {
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = form.querySelector("[data-err]");
    if (err) err.hidden = true;
    const f = new FormData(form);
    try {
      const out = await api(mode === "login" ? "/api/login" : "/api/register", {
        name: f.get("name"),
        email: f.get("email"),
        password: f.get("password"),
      });

      if (mode === "login" && out?.requires2fa) {
        pending2fa = {
          email: String(f.get("email") || ""),
          challenge: out.challenge || "",
        };
        form.hidden = true;
        const two = document.querySelector("[data-login-2fa]");
        if (two) {
          two.hidden = false;
          two.querySelector('[name="code"]')?.focus();
        }
        return;
      }

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


const login2fa = document.querySelector("[data-login-2fa]");
login2fa?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = login2fa.querySelector("[data-2fa-login-err]");
  if (err) err.hidden = true;
  const formData = new FormData(login2fa);
  const code = String(formData.get("code") || "").trim();
  const trustDevice = formData.get("trustDevice") === "1";
  try {
    await api("/api/login/2fa", {
      email: pending2fa?.email || "",
      challenge: pending2fa?.challenge || "",
      code,
      trustDevice,
      trustDays: trustDevice ? 30 : 0,
      client: /app\.html$/i.test(location.pathname) || window.matchMedia?.("(display-mode: standalone)")?.matches ? "app" : "browser",
    });
    pending2fa = null;
    await afterAuth();
  } catch (ex) {
    showErr(err, ex.message || "Verificatiecode is niet geldig.");
  }
});

document.querySelector("[data-login-2fa-cancel]")?.addEventListener("click", () => {
  pending2fa = null;
  if (login2fa) login2fa.hidden = true;
  const form = document.querySelector("[data-login]");
  if (form) form.hidden = false;
});

async function refresh2faStatus() {
  const box = document.querySelector("[data-2fa-status]");
  if (!box) return;
  try {
    const out = await api("/api/2fa/status", null, "GET");
    if (out.enabled) {
      box.innerHTML = '<p class="ok"><strong>2FA is ingeschakeld.</strong> Je account gebruikt Google Authenticator.</p><button class="btn btn-ghost" type="button" data-2fa-disable>2FA uitschakelen</button>';
      box.querySelector("[data-2fa-disable]")?.addEventListener("click", async () => {
        const code = prompt("Open Google Authenticator en vul de 6-cijferige code in om 2FA uit te schakelen.");
        if (!code) return;
        try {
          await api("/api/2fa/disable", { code });
          location.reload();
        } catch (ex) {
          alert(ex.message || "2FA uitschakelen is niet gelukt.");
        }
      });
    } else {
      box.innerHTML = '<p class="warn"><strong>2FA staat nog uit.</strong> Schakel Google Authenticator in voor extra beveiliging.</p><button class="btn" type="button" data-2fa-start>Google Authenticator instellen</button>';
      box.querySelector("[data-2fa-start]")?.addEventListener("click", async () => {
        try {
          const out = await api("/api/2fa/setup", {});
          document.querySelector("[data-2fa-secret]").textContent = out.secret || "";
          document.querySelector("[data-2fa-label]").textContent = out.label || "Vakento";
          document.querySelector("[data-2fa-setup]").hidden = false;
        } catch (ex) {
          alert(ex.message || "2FA instellen is niet gelukt.");
        }
      });
    }
  } catch (ex) {
    box.innerHTML = '<p class="warn">Beveiligingsstatus kon niet worden geladen.</p>';
  }
}

document.querySelector("[data-2fa-copy]")?.addEventListener("click", async () => {
  const secret = document.querySelector("[data-2fa-secret]")?.textContent || "";
  if (secret) await navigator.clipboard.writeText(secret);
});

document.querySelector("[data-2fa-setup-cancel]")?.addEventListener("click", () => {
  const el = document.querySelector("[data-2fa-setup]");
  if (el) el.hidden = true;
});

document.querySelector("[data-2fa-enable]")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const err = form.querySelector("[data-2fa-enable-err]");
  if (err) err.hidden = true;
  const code = String(new FormData(form).get("code") || "").trim();
  try {
    const out = await api("/api/2fa/enable", { code });
    const codes = out.recoveryCodes || [];
    document.querySelector("[data-2fa-setup]").hidden = true;
    const rec = document.querySelector("[data-2fa-recovery]");
    if (rec) {
      rec.hidden = false;
      rec.querySelector("[data-2fa-recovery-codes]").textContent = codes.join("\n");
    }
    refresh2faStatus();
  } catch (ex) {
    showErr(err, ex.message || "De verificatiecode is niet geldig.");
  }
});

document.querySelector("[data-2fa-copy-recovery]")?.addEventListener("click", async () => {
  const text = document.querySelector("[data-2fa-recovery-codes]")?.textContent || "";
  if (text) await navigator.clipboard.writeText(text);
});

refresh2faStatus();
