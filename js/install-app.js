let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.querySelectorAll("[data-install-app]").forEach((b) => b.hidden = false);
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  document.querySelectorAll("[data-install-msg]").forEach((el) => {
    el.textContent = "Vakento is geïnstalleerd.";
    el.hidden = false;
  });
});
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-install-app]");
  if (!btn) return;
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    return;
  }
  const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const msg = document.querySelector("[data-install-msg]");
  if (msg) {
    msg.hidden = false;
    msg.textContent = isiOS
      ? "iPhone/iPad: tik in Safari op Delen en daarna op 'Zet op beginscherm'."
      : "Open deze pagina in Chrome of Safari en kies 'Installeren' / 'Zet op beginscherm'.";
  }
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}