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
  location.replace("prijzen.html#account");
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

const box = $("[data-me]");
if (box) {
  const user = await me();
  if (!user.email) {
    if (/account\.html$/i.test(location.pathname)) {
      location.replace("prijzen.html#account");
    } else {
      box.innerHTML = "<p class='muted'>Nog niet ingelogd.</p>";
    }
  } else {
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
      <p><button class="btn btn-ghost" type="button" data-out>Uitloggen</button></p>
      ${user.admin ? "" : '<p><button class="btn btn-ghost" type="button" data-stop>Stoppen en account wissen</button></p>'}`;
    box.querySelector("[data-out]")?.addEventListener("click", async () => {
      await api("/api/logout", {});
      location.reload();
    });
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
      location.href = "prijzen.html";
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
