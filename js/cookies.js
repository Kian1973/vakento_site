const KEY = "vakento.cookie.v1";

function hideBar(bar) {
  bar.remove();
  document.body.classList.remove("has-cookie-bar");
}

function choose(value, bar) {
  try {
    localStorage.setItem(KEY, value);
  } catch (_) {}
  hideBar(bar);
}

function mount() {
  try {
    if (localStorage.getItem(KEY)) return;
  } catch (_) {}
  const bar = document.createElement("div");
  bar.className = "cookie-bar";
  bar.id = "cookie-bar";
  bar.setAttribute("role", "dialog");
  bar.setAttribute("aria-labelledby", "cookie-title");
  bar.innerHTML = `
    <div class="cookie-inner">
      <div>
        <p class="cookie-title" id="cookie-title">Cookies op Vakento</p>
        <p>We gebruiken alleen wat nodig is: inloggen (sessiecookie) en je werkplaats op dit toestel. Geen tracking of reclame. <a href="cookies.html">Meer over cookies</a></p>
      </div>
      <div class="cookie-actions">
        <button class="btn btn-ghost" type="button" data-cookie="needed">Alleen noodzakelijk</button>
        <button class="btn" type="button" data-cookie="all">Akkoord</button>
      </div>
    </div>`;
  document.body.appendChild(bar);
  document.body.classList.add("has-cookie-bar");
  bar.querySelector('[data-cookie="needed"]').addEventListener("click", () => choose("needed", bar));
  bar.querySelector('[data-cookie="all"]').addEventListener("click", () => choose("all", bar));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
