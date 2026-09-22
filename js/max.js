(() => {
  if (window.__vakentoMaxLoaded) return;
  window.__vakentoMaxLoaded = true;

  const KB = [
    {
      keys: ["contact", "contacten", "klant", "leverancier", "relatie", "adresboek"],
      title: "Contacten",
      answer: "In Contacten bewaar je klanten en leveranciers centraal met naam, contactpersoon, e-mail, telefoon, adres, KvK, btw-nummer, klantnummer en betaaltermijn. De contacten zijn bedoeld om op laptop en telefoon gelijk te blijven.",
      href: "/werk.html#/contacten",
      link: "Open Contacten"
    },
    {
      keys: ["offerte", "offertes", "prijsopgave", "calculatie", "aanbieding"],
      title: "Offertes",
      answer: "Vakento kan offertes opbouwen vanuit klant- en opdrachtgegevens. Je kunt regels, bedragen en btw per regel gebruiken. AI kan helpen een offerte uit een omschrijving op te zetten.",
      href: "/werk.html#/papier",
      link: "Open Offertes"
    },
    {
      keys: ["factuur", "facturen", "rekening", "factureren", "betaling", "betaald"],
      title: "Facturen",
      answer: "Vanuit een opdracht kun je een factuur maken. Vakento kan 9% en 21% btw naast elkaar verwerken, openstaande facturen tonen en betalingen als ontvangen markeren.",
      href: "/werk.html#/papier",
      link: "Open Facturen"
    },
    {
      keys: ["btw", "9%", "9 procent", "21%", "21 procent", "schilder", "isolatie", "stukadoor", "behangen"],
      title: "BTW 9% en 21%",
      answer: "Vakento ondersteunt 9% en 21% btw per offerteregel. Er zijn categorieën voor onder andere schilderwerk, stukadoren, behangen, schoonmaak en isolatie. Bij isolatie kan arbeid op 9% en materiaal op 21% worden gesplitst. Controleer altijd of de wettelijke voorwaarden voor het gekozen tarief gelden.",
      href: "/werk.html#/papier",
      link: "Naar BTW in Offertes"
    },
    {
      keys: ["bon", "bonnen", "bon scannen", "scan", "ocr", "inkoopbon", "boekhouding"],
      title: "Bonnen scannen",
      answer: "Met de mobiele Vakento-app kun je een bon fotograferen. Vakento leest bongegevens uit en bewaart de scan voor de administratie. Bonnen en boekhoudgegevens kunnen daarna worden geëxporteerd voor de boekhouder.",
      href: "/app.html#bon",
      link: "Open Bon scannen"
    },
    {
      keys: ["boekhouder", "csv", "export", "boekhouding export", "accountant", "boekhoudpakket"],
      title: "Export voor de boekhouder",
      answer: "Vakento kan administratieve gegevens als CSV exporteren. Denk aan facturen, inkopen en gescande bonnen. Het doel is een leesbaar bestand dat de boekhouder verder kan verwerken.",
      href: "/werk.html#/geld",
      link: "Open Financieel overzicht"
    },
    {
      keys: ["cloud", "bestand", "bestanden", "opslag", "map", "mappen", "document"],
      title: "Vakento Cloud",
      answer: "In de Vakento Cloud bewaar je documenten, bonnen, werkfoto's en andere bestanden. Zo blijven bestanden bij je werk en hoef je niet te zoeken tussen losse telefoons en computers.",
      href: "/werk.html#/cloud",
      link: "Open Cloud"
    },
    {
      keys: ["werkfoto", "foto", "camera", "voor foto", "na foto", "schade", "oplevering"],
      title: "Werkfoto's",
      answer: "Met de app maak je foto's op locatie en sla je ze op bij de juiste opdracht. Je kunt foto's gebruiken voor voor-, tijdens- en na-situaties, schade, materiaal of oplevering.",
      href: "/app.html#werkfoto",
      link: "Open Werkfoto"
    },
    {
      keys: ["camera toestemming", "camera werkt", "toestemming", "camera"],
      title: "Camera",
      answer: "De mobiele app gebruikt de telefooncamera voor bonnen en werkfoto's. Als de camera niet opent, controleer dan in de browser- of telefooninstellingen of vakento.nl cameratoegang heeft.",
      href: "/app.html",
      link: "Open mobiele app"
    },
    {
      keys: ["planning", "bord", "week", "weekbord", "inplannen", "agenda"],
      title: "Planning",
      answer: "Het Weekbord laat zien wie wanneer op welke opdracht staat. Je kunt opdrachten per dag plannen en de AI-assistent vrije plekken laten helpen vullen.",
      href: "/werk.html#/bord",
      link: "Open Planning"
    },
    {
      keys: ["uren", "urenregistratie", "tijd", "werktijd", "uren boeken"],
      title: "Urenregistratie",
      answer: "Je boekt uren direct op een opdracht en medewerker. Daardoor kun je later vergelijken hoeveel tijd een opdracht werkelijk kostte.",
      href: "/werk.html#/uren",
      link: "Open Uren"
    },
    {
      keys: ["winst", "resultaat", "marge", "kosten", "omzet", "begroot", "werkelijk"],
      title: "Winst en inzicht",
      answer: "Vakento kan begrote bedragen, kosten, uren en resultaat per opdracht naast elkaar zetten. Zo zie je sneller waar marge verloren gaat.",
      href: "/werk.html#/winst",
      link: "Open Winst"
    },
    {
      keys: ["ai", "brein", "slim", "assistent", "automatisch", "spraak", "inspreken"],
      title: "AI en Slim werken",
      answer: "Vakento heeft slimme hulp voor onder andere offertes, planning, werknotities en dagafsluiting. In Slim werken kun je bijvoorbeeld een werknotitie inspreken en daar uren, materiaal of meerwerk uit halen.",
      href: "/werk.html#/slim",
      link: "Open Slim werken"
    },
    {
      keys: ["werkbon", "digitale werkbon", "handtekening", "oplevering"],
      title: "Digitale werkbon",
      answer: "In Slim werken kun je een digitale werkbon maken met werkzaamheden, uren, materiaal, foto's en de naam van de klant voor akkoord.",
      href: "/werk.html#/slim",
      link: "Open Werkbon"
    },
    {
      keys: ["meerwerk", "extra werk", "akkoord"],
      title: "Meerwerk",
      answer: "Vakento kan meerwerk apart vastleggen met omschrijving en bedrag. Na akkoord kan het bedrag worden meegenomen in de begroting van de opdracht.",
      href: "/werk.html#/slim",
      link: "Open Meerwerk"
    },
    {
      keys: ["onderhoud", "herinnering", "terugkomen", "vervolgwerk"],
      title: "Onderhoudsherinneringen",
      answer: "Vakento kan onthouden wanneer je een klant of opdracht opnieuw wilt benaderen, bijvoorbeeld voor onderhoud of periodieke controle.",
      href: "/werk.html#/slim",
      link: "Open Onderhoud"
    },
    {
      keys: ["mail", "email", "e-mail", "@vakento.nl", "mailbox", "outlook"],
      title: "Vakento e-mail",
      answer: "Vakento is voorbereid op een eigen naam@vakento.nl-adres. Pro heeft de mogelijkheid voor een eigen Vakento-adres; Pro+ is bedoeld voor uitgebreidere mailboxfuncties zoals extra opslag en gebruik als mailbox.",
      href: "/werk.html#/post",
      link: "Open E-mail"
    },
    {
      keys: ["pro", "pro+", "pro plus", "abonnement", "pakket", "prijs", "lidmaatschap"],
      title: "Pro en Pro+",
      answer: "Vakento werkt met Pro en Pro+. De kern is bedrijfsbeheer: klanten, opdrachten, offertes, facturen, uren, bonnen, cloud en slimme hulp. Pro+ is bedoeld voor uitgebreidere functies zoals een ruimere e-mailbox en extra mailmogelijkheden.",
      href: "/#abonnementen",
      link: "Bekijk abonnementen"
    },
    {
      keys: ["mobiele app", "app", "telefoon", "android", "iphone", "ios", "installeren"],
      title: "Vakento op je telefoon",
      answer: "Vakento heeft een mobiele webapp die je op Android en iPhone kunt openen en aan het beginscherm kunt toevoegen. Vanuit de app kun je onder andere bonnen scannen, werkfoto's maken, Cloud openen en naar je werkplaats gaan.",
      href: "/app.html",
      link: "Open mobiele app"
    },
    {
      keys: ["systeemcontrole", "fout", "fouten", "werkt niet", "probleem", "herstel", "cache"],
      title: "Systeemcontrole",
      answer: "Vakento heeft een Systeemcontrole die internet, browseropslag, API en app-cache controleert. Bij bepaalde laadproblemen probeert Vakento automatisch te herstellen.",
      href: "/diagnose.html",
      link: "Open Systeemcontrole"
    },
    {
      keys: ["privacy", "veilig", "beveiliging", "gegevens"],
      title: "Gegevens en beveiliging",
      answer: "Vakento koppelt accountgegevens en onderdelen aan de ingelogde gebruiker. Voor serverfuncties hoort iedere API-route te controleren welke gebruiker is ingelogd voordat gegevens worden gelezen of gewijzigd.",
      href: "/account.html",
      link: "Open Mijn account"
    }
  ];

  const GENERAL = "Ik ben Max, de Vakento-hulp. Vraag me bijvoorbeeld hoe je een offerte maakt, bonnen scant, contacten beheert, 9% btw gebruikt, uren boekt, bestanden in de Cloud zet of de mobiele app gebruikt.";

  const css = document.createElement("style");
  css.textContent = `
    .max-launcher{position:fixed;right:22px;bottom:22px;z-index:99990;border:0;border-radius:999px;background:#1e5aa6;color:#fff;box-shadow:0 12px 34px rgba(17,35,58,.28);padding:13px 17px;font:700 15px/1 system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;gap:9px}
    .max-launcher .max-dot{width:26px;height:26px;border-radius:50%;background:#fff;color:#1e5aa6;display:grid;place-items:center;font-weight:900}
    .max-panel{position:fixed;right:22px;bottom:82px;z-index:99991;width:min(390px,calc(100vw - 24px));height:min(620px,calc(100vh - 120px));background:#fff;border:1px solid #dfe6ef;border-radius:20px;box-shadow:0 24px 70px rgba(17,35,58,.28);display:none;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#152033}
    .max-panel.open{display:grid;grid-template-rows:auto 1fr auto}
    .max-head{padding:15px 16px;background:#1e5aa6;color:#fff;display:flex;align-items:center;gap:10px}
    .max-avatar{width:38px;height:38px;border-radius:50%;background:#fff;color:#1e5aa6;display:grid;place-items:center;font-weight:900;font-size:18px}
    .max-head div:nth-child(2){flex:1}
    .max-head strong{display:block}.max-head small{opacity:.86}
    .max-close{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}
    .max-messages{padding:14px;overflow:auto;background:#f6f9fc;display:flex;flex-direction:column;gap:10px}
    .max-msg{max-width:88%;padding:11px 13px;border-radius:15px;font-size:14px;line-height:1.45;white-space:pre-wrap}
    .max-msg.bot{align-self:flex-start;background:#fff;border:1px solid #e3e9f0}
    .max-msg.user{align-self:flex-end;background:#1e5aa6;color:#fff}
    .max-msg a{color:#1e5aa6;font-weight:700;text-decoration:none}.max-msg.user a{color:#fff}
    .max-quick{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
    .max-quick button{border:1px solid #cfd9e6;background:#fff;border-radius:999px;padding:7px 9px;font:600 12px system-ui;cursor:pointer;color:#1e5aa6}
    .max-form{display:flex;gap:8px;padding:12px;background:#fff;border-top:1px solid #e3e9f0}
    .max-form input{flex:1;min-width:0;border:1px solid #cfd9e6;border-radius:12px;padding:11px 12px;font:14px system-ui}
    .max-form button{border:0;border-radius:12px;background:#1e5aa6;color:#fff;padding:0 15px;font-weight:700;cursor:pointer}
    .max-thinking{opacity:.65;font-style:italic}
    @media(max-width:700px){
      .max-launcher{right:12px;bottom:82px}
      .max-panel{right:12px;bottom:140px;height:min(560px,calc(100vh - 170px))}
    }
  `;
  document.head.appendChild(css);

  const launcher = document.createElement("button");
  launcher.className = "max-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open Max");
  launcher.innerHTML = '<span class="max-dot">M</span><span>Vraag Max</span>';

  const panel = document.createElement("section");
  panel.className = "max-panel";
  panel.setAttribute("aria-label", "Max Vakento hulp");
  panel.innerHTML = `
    <div class="max-head">
      <div class="max-avatar">M</div>
      <div><strong>Max</strong><small>Vakento-hulp</small></div>
      <button class="max-close" type="button" aria-label="Sluiten">×</button>
    </div>
    <div class="max-messages" data-max-messages></div>
    <form class="max-form" data-max-form>
      <input name="q" autocomplete="off" placeholder="Vraag iets over Vakento..." aria-label="Vraag aan Max">
      <button type="submit">Stuur</button>
    </form>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  const messages = panel.querySelector("[data-max-messages]");
  const input = panel.querySelector('input[name="q"]');

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function addMsg(text, who="bot", extra="") {
    const div = document.createElement("div");
    div.className = "max-msg " + who + (extra ? " " + extra : "");
    div.innerHTML = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function norm(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9@%+ -]/g, " ");
  }

  function localAnswer(q) {
    const nq = norm(q);
    let best = null;
    let score = 0;
    for (const item of KB) {
      let s = 0;
      for (const key of item.keys) {
        const nk = norm(key);
        if (nq.includes(nk)) s += Math.max(2, nk.split(" ").length + 1);
        for (const part of nk.split(" ")) {
          if (part.length > 3 && nq.includes(part)) s += 1;
        }
      }
      if (s > score) { score = s; best = item; }
    }
    return score >= 2 ? best : null;
  }

  function formatAnswer(item) {
    if (!item) return escapeHtml(GENERAL);
    return '<strong>' + escapeHtml(item.title) + '</strong><br>' +
      escapeHtml(item.answer) +
      (item.href ? '<br><br><a href="' + escapeHtml(item.href) + '">' + escapeHtml(item.link || "Open dit onderdeel") + ' →</a>' : "");
  }

  const KNOWLEDGE = KB.map(x => x.title + ": " + x.answer).join("\n");

  async function askServer(question, fallback) {
    try {
      const res = await fetch("/api/brein", {
        method:"POST",
        credentials:"include",
        cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          task:"vraag",
          local:{tekst:fallback?.answer || GENERAL},
          context:{
            vraag:question,
            rol:"Je bent Max, de helpchat van Vakento. Antwoord alleen over de mogelijkheden en het gebruik van Vakento. Wees kort, duidelijk en praktisch. Verzin geen functies die niet in de kennis staan.",
            vakento:KNOWLEDGE
          }
        })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data.tekst || data.answer || data.antwoord || "";
      return text ? String(text) : null;
    } catch (_) {
      return null;
    }
  }

  async function answer(q) {
    addMsg(escapeHtml(q), "user");
    const local = localAnswer(q);
    const pending = addMsg("Max zoekt het even voor je…", "bot", "max-thinking");

    const ai = await askServer(q, local);
    pending.remove();

    if (ai) {
      addMsg(escapeHtml(ai).replace(/\n/g,"<br>") + (local?.href ? '<br><br><a href="' + escapeHtml(local.href) + '">' + escapeHtml(local.link || "Open dit onderdeel") + ' →</a>' : ""));
    } else {
      addMsg(formatAnswer(local));
    }
  }

  launcher.addEventListener("click", () => {
    panel.classList.add("open");
    launcher.style.display = "none";
    input.focus();
    if (!messages.childElementCount) {
      addMsg('<strong>Hoi, ik ben Max.</strong><br>' + escapeHtml(GENERAL));
      const quick = document.createElement("div");
      quick.className = "max-quick";
      ["Bonnen scannen","Offerte maken","9% btw","Contacten","Mobiele app","Pro en Pro+"].forEach(label => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.onclick = () => answer(label);
        quick.appendChild(b);
      });
      messages.appendChild(quick);
    }
  });

  panel.querySelector(".max-close").addEventListener("click", () => {
    panel.classList.remove("open");
    launcher.style.display = "";
  });

  panel.querySelector("[data-max-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    answer(q);
  });
})();
