import { me } from "./api.js";

try {
  const user = await me();
  if (!user.paid) {
    location.replace("/#lidworden");
  } else {
    try {
      sessionStorage.setItem("vakento.uid", user.id || "");
      sessionStorage.setItem("vakento.firm", user.name || "");
    } catch (_) {}
    if (user.trial && user.paidUntil) {
      const tot = new Date(user.paidUntil).toLocaleDateString(window.VakentoI18n?.locale || "nl-NL", { day: "numeric", month: "long" });
      const note = document.createElement("p");
      note.className = "trial-bar";
      note.innerHTML =
        (window.VakentoI18n?.t("Gratis tot ") || "Gratis tot ") + tot + (window.VakentoI18n?.t(". Daarna stopt het vanzelf. Betaal je, dan blijft alles staan. ") || ". Daarna stopt het vanzelf. Betaal je, dan blijft alles staan. ") + "<a href=\"account.html\">" + (window.VakentoI18n?.t("Betalen") || "Betalen") + "</a>";
      document.querySelector(".app-bar")?.insertAdjacentElement("afterend", note);
    }
    await import("./app.js?v=offerte4");
  }
} catch (err) {
  window.VakentoHeal?.report?.(err, { kind: "gate-load" });
  const msg = String(err?.message || err || "");
  if (/dynamically imported module|loading chunk|failed to fetch|import/i.test(msg)) {
    window.VakentoHeal?.recover?.(msg);
  } else {
    const stage = document.getElementById("stage");
    if (stage) {
      stage.innerHTML =
        "<div class='card'><p class='warn'>Vakento kon dit onderdeel niet laden.</p><p class='muted'>De fout is opgeslagen in Systeemcontrole.</p><p><a class='btn' href='/diagnose.html'>Open Systeemcontrole</a></p></div>";
    }
  }
}
