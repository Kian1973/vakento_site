import { me, logout } from "./api.js";

try {
  const user = await me();
  if (!user.paid) {
    location.replace("/#lidworden");
  } else {
    try {
      sessionStorage.setItem("vakento.uid", user.id || "");
      sessionStorage.setItem("vakento.firm", user.name || "");
    } catch (_) {}
    const logoutButton = document.querySelector("[data-logout]");
    logoutButton?.addEventListener("click", async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = "Uitloggen…";
      await logout();
      location.replace("/account.html?uitgelogd=1");
    });
    if (user.trial && user.paidUntil) {
      const tot = new Date(user.paidUntil).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
      const note = document.createElement("p");
      note.className = "trial-bar";
      note.innerHTML =
        "Gratis tot " + tot + ". Daarna stopt het vanzelf. Betaal je, dan blijft alles staan. <a href=\"account.html\">Betalen</a>";
      document.querySelector(".app-bar")?.insertAdjacentElement("afterend", note);
    }
    await import("./app.js?v=gallery1");
  }
} catch (err) {
  const stage = document.getElementById("stage");
  if (stage) {
    stage.innerHTML =
      "<p class='warn'>De werkplaats laadde niet. Vernieuw de pagina of log opnieuw in.</p>";
  }
}
