(() => {
  const LOG_KEY = "vakento.heal.log";
  const LAST_KEY = "vakento.heal.last";
  const RECOVERY_COOLDOWN = 45000;

  function now() { return new Date().toISOString(); }

  function readLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); }
    catch { return []; }
  }

  function writeLog(items) {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(items.slice(-50))); }
    catch (_) {}
  }

  function report(error, meta = {}) {
    const message = String(error?.message || error || "Onbekende fout");
    const entry = {
      at: now(),
      message: message.slice(0, 800),
      stack: String(error?.stack || "").slice(0, 3000),
      page: location.pathname + location.hash,
      online: navigator.onLine,
      ...meta,
    };
    const items = readLog();
    items.push(entry);
    writeLog(items);
    return entry;
  }

  function banner(text, actionText, action) {
    let el = document.querySelector("[data-vakento-heal-banner]");
    if (!el) {
      el = document.createElement("div");
      el.dataset.vakentoHealBanner = "1";
      el.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#121826;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.25);font:14px/1.4 system-ui,sans-serif;display:flex;gap:10px;align-items:center";
      document.body.appendChild(el);
    }
    el.innerHTML = "";
    const span = document.createElement("span");
    span.style.flex = "1";
    span.textContent = text;
    el.appendChild(span);
    if (actionText && action) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = actionText;
      btn.style.cssText = "border:0;border-radius:8px;padding:8px 11px;cursor:pointer;font-weight:700";
      btn.onclick = action;
      el.appendChild(btn);
    }
  }

  async function clearCaches() {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("vakento-")).map((k) => caches.delete(k)));
  }

  async function updateServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.update().catch(() => {})));
  }

  function canRecover() {
    try {
      const last = Number(sessionStorage.getItem(LAST_KEY) || 0);
      return !last || Date.now() - last > RECOVERY_COOLDOWN;
    } catch {
      return true;
    }
  }

  function markRecovery() {
    try { sessionStorage.setItem(LAST_KEY, String(Date.now())); }
    catch (_) {}
  }

  async function recover(reason = "automatisch herstel", options = {}) {
    report(reason, { kind: "recovery" });

    if (!navigator.onLine) {
      banner("Vakento is offline. Je gegevens blijven staan; herstel gaat verder zodra internet terug is.");
      return false;
    }

    if (!canRecover() && !options.force) {
      banner("Vakento heeft al geprobeerd te herstellen. Open Systeemcontrole als het probleem blijft.", "Systeemcontrole", () => {
        location.href = "/diagnose.html";
      });
      return false;
    }

    markRecovery();
    banner("Vakento herstelt zichzelf… oude cache wordt opgeruimd.");

    try { await clearCaches(); } catch (_) {}
    try { await updateServiceWorker(); } catch (_) {}

    if (options.reload !== false) {
      const u = new URL(location.href);
      u.searchParams.set("hersteld", Date.now().toString(36));
      location.replace(u.toString());
    }
    return true;
  }

  async function health() {
    const result = {
      online: navigator.onLine,
      storage: false,
      api: false,
      serviceWorker: "serviceWorker" in navigator,
      cacheCount: 0,
    };

    try {
      const k = "vakento.heal.test";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      result.storage = true;
    } catch (_) {}

    try {
      const res = await fetch("/api/me?t=" + Date.now(), {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      result.api = res.ok;
      result.apiStatus = res.status;
    } catch (err) {
      result.apiError = String(err?.message || err);
    }

    try {
      if ("caches" in window) result.cacheCount = (await caches.keys()).length;
    } catch (_) {}

    return result;
  }

  function looksRecoverable(message) {
    return /failed to fetch|dynamically imported module|loading chunk|script error|unexpected token '<'|networkerror|importing a module/i.test(message);
  }

  addEventListener("error", (event) => {
    const err = event.error || new Error(event.message || "Scriptfout");
    const entry = report(err, { kind: "window-error" });
    if (looksRecoverable(entry.message)) recover(entry.message);
  });

  addEventListener("unhandledrejection", (event) => {
    const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason || "Promise fout"));
    const entry = report(reason, { kind: "unhandled-rejection" });
    if (looksRecoverable(entry.message)) recover(entry.message);
  });

  addEventListener("offline", () => banner("Geen internet. Vakento blijft waar mogelijk werken en probeert later opnieuw."));
  addEventListener("online", () => {
    const el = document.querySelector("[data-vakento-heal-banner]");
    if (el) el.remove();
  });

  window.VakentoHeal = {
    report,
    recover,
    health,
    logs: readLog,
    clearLogs: () => writeLog([]),
  };
})();
