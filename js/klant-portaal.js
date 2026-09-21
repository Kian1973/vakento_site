import { load, klant, person, euro } from "./store.js?v=open1";
import { papierVan, esc } from "./papier.js?v=open1";

const STAPPEN = [
  { id: "offerte", label: "Offerte" },
  { id: "ingepland", label: "Ingepland" },
  { id: "bezig", label: "Aan het werk" },
  { id: "klaar", label: "Opgeleverd" },
];

const STATUS = {
  offerte: "Offerte",
  ingepland: "Ingepland",
  bezig: "Aan het werk",
  klaar: "Opgeleverd",
};

function dag(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y) return esc(iso);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function som(regels) {
  return (regels || []).reduce((a, r) => a + Number(r.bedrag || 0), 0);
}

function renderUnknown(box) {
  box.innerHTML = `
    <div class="portal-empty card">
      <p class="kicker">Kluspagina</p>
      <h1>Deze link klopt niet.</h1>
      <p class="lede">Vraag je vakman om de pagina van deze klus opnieuw te sturen. Er is geen account nodig.</p>
    </div>`;
}

function render(box, data, k) {
  const c = klant(data, k.klant) || { name: "Klant" };
  const p = papierVan(data);
  const idx = Math.max(0, STAPPEN.findIndex((s) => s.id === k.status));
  const offertes = (data.offertes || []).filter((o) => o.klus === k.id);
  const facturen = (data.facturen || []).filter((f) => f.klant === k.klant && f.titel && (f.titel.includes(k.title) || f.klus === k.id));
  const factAlt = facturen.length ? facturen : (data.facturen || []).filter((f) => f.klant === k.klant).slice(0, 3);
  const bonnen = (data.bonnen || []).filter((b) => b.klus === k.id);
  const ploeg = (k.people || []).map((id) => person(id)).filter(Boolean);
  const logo = p.logo
    ? `<img class="portal-logo" src="${p.logo}" alt="${esc(data.firm)}">`
    : `<span class="mark">${esc((data.firm || "V").slice(0, 1))}</span>`;
  const tel = p.tel || c.tel || "";
  const mail = p.mail || "";

  box.innerHTML = `
    <header class="portal-brand">
      <div class="portal-brand-row">
        ${logo}
        <div>
          <p class="kicker">Jouw klus</p>
          <p class="portal-firm">${esc(data.firm)}</p>
        </div>
      </div>
    </header>

    <section class="portal-hero">
      <div class="portal-hero-top">
        <span class="portal-badge">${esc(STATUS[k.status] || k.status)}</span>
        <span class="muted">${esc(c.name)}${c.plaats ? " · " + esc(c.plaats) : ""}</span>
      </div>
      <h1>${esc(k.title)}</h1>
      <ol class="portal-steps">
        ${STAPPEN.map(
          (s, i) =>
            `<li class="${i < idx ? "done" : i === idx ? "now" : ""}"><span>${i + 1}</span>${esc(s.label)}</li>`
        ).join("")}
      </ol>
    </section>

    <div class="portal-grid">
      <article class="card">
        <p class="kicker">Planning</p>
        <h3>Wanneer we komen</h3>
        <p class="portal-dates"><strong>${dag(k.start)}</strong> tot <strong>${dag(k.einde)}</strong></p>
        <p class="muted">Datum kan een dag schuiven. Bel bij spoed.</p>
      </article>
      <article class="card">
        <p class="kicker">Ploeg</p>
        <h3>Wie er staat</h3>
        ${
          ploeg.length
            ? `<ul class="portal-people">${ploeg.map((x) => `<li><strong>${esc(x.name)}</strong><span>${esc(x.role)}</span></li>`).join("")}</ul>`
            : `<p class="muted">Ploeg volgt zodra de klus ingepland is.</p>`
        }
      </article>
    </div>

    ${
      offertes.length
        ? `<section class="card portal-block">
            <p class="kicker">Offerte</p>
            <h3>Wat is afgesproken</h3>
            ${offertes
              .map((o) => {
                const excl = som(o.regels);
                return `<div class="portal-offer">
                  <div class="portal-offer-head"><strong>${esc(o.nr)}</strong><span class="pill">${esc(o.status)}</span></div>
                  <table class="table"><tbody>
                    ${(o.regels || []).map((r) => `<tr><td>${esc(r.tekst)}</td><td class="money">${esc(euro(r.bedrag))}</td></tr>`).join("")}
                    <tr><td>Excl. btw</td><td class="money"><strong>${esc(euro(excl))}</strong></td></tr>
                  </tbody></table>
                  ${o.risico ? `<p class="muted" style="margin-top:10px">${esc(o.risico)}</p>` : ""}
                </div>`;
              })
              .join("")}
          </section>`
        : ""
    }

    ${
      factAlt.length
        ? `<section class="card portal-block">
            <p class="kicker">Rekening</p>
            <h3>Betalingen</h3>
            <ul class="portal-bills">
              ${factAlt
                .map(
                  (f) =>
                    `<li><span>${esc(f.nr)} · ${esc(f.titel)}</span><strong>${esc(euro(f.bedrag))}</strong><em class="${f.status === "open" ? "warn" : "ok"}">${f.status === "open" ? "Open" : "Ontvangen"}</em></li>`
                )
                .join("")}
            </ul>
          </section>`
        : ""
    }

    ${
      bonnen.length
        ? `<section class="card portal-block">
            <p class="kicker">Werk</p>
            <h3>Wat er is gedaan</h3>
            ${bonnen
              .map(
                (b) => `<article class="portal-bon">
                  <p>${esc(b.tekst)}</p>
                  ${
                    b.photos?.length
                      ? `<div class="photos">${b.photos.map((src) => `<img src="${src}" alt="Foto van de klus">`).join("")}</div>`
                      : ""
                  }
                </article>`
              )
              .join("")}
          </section>`
        : `<section class="card portal-block"><p class="kicker">Werk</p><h3>Nog geen rapport</h3><p class="muted">Foto’s en toelichting komen hier zodra de ploeg een werkbon zet.</p></section>`
    }

    <section class="card portal-contact">
      <p class="kicker">Contact</p>
      <h3>${esc(data.firm)}</h3>
      <p class="muted">${esc([p.adres, p.postcode, p.plaats].filter(Boolean).join(" · "))}</p>
      <div class="actions" style="margin-top:14px">
        ${tel ? `<a class="btn" href="tel:${esc(tel.replace(/\s/g, ""))}">Bellen</a>` : ""}
        ${mail ? `<a class="btn btn-ghost" href="mailto:${esc(mail)}">Mailen</a>` : ""}
      </div>
    </section>

    <p class="portal-note">Alleen deze klus. Geen inloggen. Pagina van ${esc(data.firm)} via Vakento.</p>
  `;
}

const box = document.getElementById("box");
const token = new URLSearchParams(location.search).get("t");
const data = load();
const k = (data.klussen || []).find((x) => x.token === token);
if (!k) renderUnknown(box);
else {
  document.title = k.title + " | " + (data.firm || "Vakento");
  render(box, data, k);
}
