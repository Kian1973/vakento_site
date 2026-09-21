import { api, gb } from "./api.js";

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function inWerk() {
  return /werk\.html/i.test(location.pathname);
}

export function currentPad() {
  if (inWerk()) {
    const q = location.hash.split("?")[1] || "";
    return new URLSearchParams(q).get("pad") || "";
  }
  return new URLSearchParams(location.search).get("pad") || "";
}

function goPad(pad) {
  if (inWerk()) {
    const next = pad ? "#/cloud?pad=" + encodeURIComponent(pad) : "#/cloud";
    if (location.hash === next) {
      mountCloud(document.querySelector("[data-cloud-app]"));
      return;
    }
    location.hash = next;
    return;
  }
  const u = new URL(location.href);
  if (pad) u.searchParams.set("pad", pad);
  else u.searchParams.delete("pad");
  history.pushState({}, "", u);
  mountCloud(document.querySelector("[data-cloud-app]"));
}

function crumbs(pad) {
  const parts = String(pad || "").split("/").filter(Boolean);
  let acc = "";
  const bits = [`<a href="#" data-goto="">Cloud</a>`];
  for (const p of parts) {
    acc = acc ? acc + "/" + p : p;
    bits.push(`<a href="#" data-goto="${esc(acc)}">${esc(p)}</a>`);
  }
  return bits.join(" <span class='muted'>/</span> ");
}

function maat(n) {
  const x = Number(n || 0);
  if (x < 1024) return x + " B";
  if (x < 1024 * 1024) return (x / 1024).toFixed(0) + " kB";
  if (x < 1024 * 1024 * 1024) return (x / (1024 * 1024)).toFixed(1) + " MB";
  return gb(x) + " GB";
}

export function viewCloud() {
  return `
    <div class="row">
      <div>
        <p class="kicker">Cloud</p>
        <h1>Mappen op de server. Open overal.</h1>
        <p class="muted">Staat niet op je telefoon. Inloggen op vakento.nl is genoeg, waar je ook bent. Of deel een map met een link.</p>
      </div>
    </div>
    <div data-cloud-app></div>`;
}

export async function mountCloud(root) {
  if (!root) return;
  const pad = currentPad();
  root.innerHTML = `<p class="muted">Cloud laden…</p>`;
  let data;
  try {
    data = await api("/api/cloud?pad=" + encodeURIComponent(pad), null, "GET");
  } catch (ex) {
    root.innerHTML = `<p class="warn">${esc(ex.message)}</p>`;
    return;
  }
  const pct = data.quotaBytes ? Math.min(100, Math.round((data.usedBytes / data.quotaBytes) * 100)) : 0;
  root.innerHTML = `
    <div class="card cloud-head">
      <p class="cloud-crumbs">${crumbs(pad)}</p>
      <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <p class="muted">${gb(data.usedBytes)} GB van ${gb(data.quotaBytes)} GB</p>
      <div class="actions" style="margin-top:12px">
        <form data-map class="cloud-inline">
          <input name="naam" required placeholder="Nieuwe map" maxlength="80">
          <button class="btn" type="submit">Map maken</button>
        </form>
        <label class="btn btn-ghost">Bestanden erin<input type="file" data-up multiple hidden></label>
        ${
          data.deelUrl
            ? `<button class="btn btn-ghost" type="button" data-copy="${esc(data.deelUrl)}">Kopieer deellink</button>
               <button class="btn btn-ghost" type="button" data-stop>Stop delen</button>`
            : `<button class="btn btn-ghost" type="button" data-deel>Deel deze map</button>`
        }
      </div>
    </div>
    <div class="list" style="margin-top:14px">
      ${
        data.items.length
          ? data.items
              .map(
                (it) => `<article class="item cloud-row">
                  <button type="button" class="cloud-open" data-open="${esc(it.pad)}" data-soort="${it.soort}">
                    <strong>${it.soort === "map" ? "Map" : "Bestand"} · ${esc(it.name)}</strong>
                    <span class="muted">${maat(it.bytes)}</span>
                  </button>
                  <button type="button" class="btn btn-ghost" data-wis="${esc(it.pad)}" data-naam="${esc(it.name)}">Weg</button>
                </article>`
              )
              .join("")
          : `<article class="item"><strong>Lege map</strong><span class="muted">Maak een map of zet er bestanden in. Daarna open je die vanaf elke telefoon of pc.</span></article>`
      }
    </div>`;

  root.querySelectorAll("[data-goto]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      goPad(a.getAttribute("data-goto") || "");
    });
  });
  root.querySelector("[data-map]")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const naam = new FormData(e.target).get("naam");
    try {
      const out = await api("/api/cloud/map", { pad, naam });
      goPad(out.pad);
    } catch (ex) {
      toast(ex.message);
    }
  });
  root.querySelector("[data-up]")?.addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    for (const file of files) {
      try {
        const q = new URLSearchParams({ pad, naam: file.name });
        const res = await fetch("/api/cloud/upload?" + q, {
          method: "POST",
          credentials: "include",
          body: file,
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(out.error || "Upload mislukt");
      } catch (ex) {
        toast(file.name + ": " + ex.message);
      }
    }
    goPad(pad);
  });
  root.querySelector("[data-deel]")?.addEventListener("click", async () => {
    try {
      const out = await api("/api/cloud/delen", { pad });
      await navigator.clipboard?.writeText(out.url);
      toast("Deellink gekopieerd. Iedereen met de link kan de map openen.");
      goPad(pad);
    } catch (ex) {
      toast(ex.message);
    }
  });
  root.querySelector("[data-copy]")?.addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(e.currentTarget.getAttribute("data-copy") || "");
      toast("Link gekopieerd.");
    } catch {
      toast("Kopieer de link zelf uit de adresbalk na delen.");
    }
  });
  root.querySelector("[data-stop]")?.addEventListener("click", async () => {
    try {
      await api("/api/cloud/delen-stop", { pad });
      toast("Deellink uit.");
      goPad(pad);
    } catch (ex) {
      toast(ex.message);
    }
  });
  root.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("data-open") || "";
      if (btn.getAttribute("data-soort") === "map") {
        goPad(next);
        return;
      }
      window.open("/api/cloud/bestand?pad=" + encodeURIComponent(next), "_blank", "noopener");
    });
  });
  root.querySelectorAll("[data-wis]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const naam = btn.getAttribute("data-naam") || "";
      if (!confirm("Weg: " + naam + "?")) return;
      try {
        await api("/api/cloud", { pad: btn.getAttribute("data-wis") }, "DELETE");
        goPad(pad);
      } catch (ex) {
        toast(ex.message);
      }
    });
  });
}

export async function mountDeel(root) {
  const t = new URLSearchParams(location.search).get("t") || "";
  const pad = new URLSearchParams(location.search).get("pad") || "";
  if (!t) {
    root.innerHTML = `<p class="warn">Geen deellink.</p>`;
    return;
  }
  let data;
  try {
    data = await api("/api/cloud/openbaar?t=" + encodeURIComponent(t) + "&pad=" + encodeURIComponent(pad), null, "GET");
  } catch (ex) {
    root.innerHTML = `<section class="card"><h1>Map niet te openen</h1><p class="muted">${esc(ex.message)}</p></section>`;
    return;
  }
  const parent = pad.includes("/") ? pad.split("/").slice(0, -1).join("/") : "";
  root.innerHTML = `
    <p class="kicker">${esc(data.zaak)}</p>
    <h1>${esc(data.naam)}</h1>
    <p class="muted">Alleen kijken. Bestanden openen in je browser, overal ter wereld.</p>
    ${pad ? `<p style="margin:12px 0"><a class="btn btn-ghost" href="delen.html?t=${esc(t)}${parent ? "&pad=" + encodeURIComponent(parent) : ""}">Terug</a></p>` : ""}
    <div class="list" style="margin-top:16px">
      ${
        data.items.length
          ? data.items
              .map((it) => {
                if (it.soort === "map") {
                  const href = "delen.html?t=" + encodeURIComponent(t) + "&pad=" + encodeURIComponent(it.pad);
                  return `<a class="item cloud-row" href="${href}"><strong>Map · ${esc(it.name)}</strong><span class="muted">${maat(it.bytes)}</span></a>`;
                }
                const href = "/api/cloud/openbaar/bestand?t=" + encodeURIComponent(t) + "&pad=" + encodeURIComponent(it.pad);
                return `<a class="item cloud-row" href="${href}" target="_blank" rel="noopener"><strong>Bestand · ${esc(it.name)}</strong><span class="muted">${maat(it.bytes)}</span></a>`;
              })
              .join("")
          : `<article class="item"><strong>Lege map</strong></article>`
      }
    </div>`;
}

if (document.querySelector("[data-cloud-app]") && !inWerk()) {
  mountCloud(document.querySelector("[data-cloud-app]"));
  window.addEventListener("popstate", () => mountCloud(document.querySelector("[data-cloud-app]")));
}
