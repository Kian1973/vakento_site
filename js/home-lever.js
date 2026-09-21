import { LEVERANCIERS, alleArtikelen } from "./leveranciers.js?v=lev2";

function geld(n) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
}

const root = document.getElementById("lev-home");
if (root) {
  let filter = "";
  let q = "";

  function rijen() {
    return alleArtikelen().filter((a) => {
      if (filter && a.leverancier !== filter) return false;
      if (q && !`${a.naam} ${a.leverancier} ${a.tak}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function tabel(lijst) {
    return `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Leverancier</th><th>Artikel</th><th>Eh</th><th class="money">Richtprijs</th></tr></thead>
          <tbody>
            ${lijst
              .map(
                (a) => `<tr>
                  <td>${a.leverancier}<br><span class="muted">${a.tak}</span></td>
                  <td>${a.naam}</td>
                  <td>${a.eenheid}</td>
                  <td class="money">${geld(a.prijs)}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <p class="muted lev-count">${lijst.length} artikelen · excl. btw · ter indicatie</p>`;
  }

  root.innerHTML = `
    <div class="lev-tools">
      <div>
        <p class="kicker" style="margin-bottom:8px">Leverancier</p>
        <div class="lev-chips">
          <button type="button" class="lev-chip on" data-lev="">Alle</button>
          ${LEVERANCIERS.map((l) => `<button type="button" class="lev-chip" data-lev="${l.naam}">${l.naam}</button>`).join("")}
        </div>
      </div>
      <label>Zoeken<input type="search" name="q" placeholder="YMvK, gips, dakpan…"></label>
    </div>
    <div data-lev-tabel>${tabel(rijen())}</div>`;

  const uit = root.querySelector("[data-lev-tabel]");
  function teken() {
    uit.innerHTML = tabel(rijen());
    root.querySelectorAll(".lev-chip").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.lev === filter);
    });
  }

  root.querySelectorAll("[data-lev]").forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.lev;
      teken();
    });
  });
  root.querySelector("input[name=q]")?.addEventListener("input", (e) => {
    q = e.target.value.toLowerCase();
    teken();
  });
}
