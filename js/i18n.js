(() => {
  const SUPPORTED = ["nl", "en", "de", "pl"];

  const dictionaries = {
    en: {
      "Werkplaats | Vakento":"Workspace | Vakento",
      "Werkplaats":"Workspace",
      "Overzicht":"Overview",
      "Planning":"Planning",
      "Klussen":"Jobs",
      "Relaties":"Contacts",
      "Contacten":"Contacts",
      "Ploeg":"Team",
      "Administratie":"Administration",
      "Offertes & facturen":"Quotes & invoices",
      "Inkoop":"Purchases",
      "Uren":"Hours",
      "Boekhouding":"Bookkeeping",
      "Winst":"Profit",
      "Openstaand":"Outstanding",
      "Werk":"Work",
      "Artikelen & prijzen":"Items & prices",
      "Calculatie":"Estimates",
      "Taken":"Tasks",
      "Materiaal":"Materials",
      "Cloud":"Cloud",
      "Slim":"Smart",
      "AI-assistent":"AI assistant",
      "Slim werken":"Work smarter",
      "Overstappen":"Migration",
      "Overstappen van Rompslomp":"Migrate from Rompslomp",
      "Mijn account":"My account",
      "Vakento app":"Vakento app",
      "Systeemcontrole":"System check",
      "Uitloggen":"Log out",
      "Menu":"Menu",
      "Account":"Account",
      "Mijn Vakento":"My Vakento",
      "Bon scannen":"Scan receipt",
      "Uren boeken":"Log hours",
      "Laden…":"Loading…",
      "Facturen":"Invoices",
      "Vakento App":"Vakento App",
      "Online":"Online",
      "Alles van je abonnement bij de hand.":"Everything in your subscription at hand.",
      "Werk, administratie, bonnen, cloud en slimme ondersteuning vanaf je telefoon.":"Work, administration, receipts, cloud and smart support from your phone.",
      "Maak een foto van je kassabon en laat Vakento hem automatisch uitlezen.":"Take a photo of your receipt and let Vakento read it automatically.",
      "Camera":"Camera",
      "Hoofdmenu":"Main menu",
      "Belangrijkste onderdelen":"Main features",
      "Vandaag":"Today",
      "Dagoverzicht":"Daily overview",
      "Werk & ploeg":"Work & team",
      "Alle dossiers":"All jobs",
      "Papierwerk":"Paperwork",
      "Registreren":"Log",
      "Automatisch uitlezen":"Read automatically",
      "Werkfoto's":"Job photos",
      "Naar klusmap":"To job folder",
      "5 GB opslag":"5 GB storage",
      "Omzet & kosten":"Revenue & costs",
      "Slimmer werken":"Work smarter",
      "Abonnement & app":"Subscription & app",
      "Scan bon automatisch":"Scan receipt automatically",
      "Foto maken → uitlezen → direct opslaan":"Take photo → read → save",
      "Datum":"Date",
      "Leverancier":"Supplier",
      "Totaal incl. btw":"Total incl. VAT",
      "BTW inbegrepen":"VAT included",
      "Nog bepalen":"To be determined",
      "Bedrag excl. btw":"Amount excl. VAT",
      "BTW uit totaal":"VAT from total",
      "Betaald met":"Paid with",
      "Niet opgegeven":"Not specified",
      "Zakelijke rekening":"Business account",
      "Pin / betaalpas":"Debit card",
      "Creditcard":"Credit card",
      "Contant":"Cash",
      "Privé voorgeschoten":"Paid privately",
      "Notitie":"Note",
      "Gegevens corrigeren en opnieuw opslaan":"Correct details and save again",
      "Voor de boekhouder":"For the accountant",
      "Export boekhouder":"Accountant export",
      "Deel complete boekhouding met boekhouder":"Share complete bookkeeping with accountant",
      "Op de klus":"On the job",
      "Werkfoto maken":"Take job photo",
      "Naam klus / klant":"Job / customer name",
      "Soort foto":"Photo type",
      "Voor aanvang":"Before start",
      "Tijdens werk":"During work",
      "Na oplevering":"After completion",
      "Schade / aandachtspunt":"Damage / attention point",
      "Maak werkfoto":"Take job photo",
      "Camera achterzijde":"Rear camera",
      "Foto naar klusmap":"Save photo to job folder",
      "Recent":"Recent",
      "Net opgeslagen":"Recently saved",
      "Nog niets opgeslagen via deze telefoon.":"Nothing saved from this phone yet.",
      "Bon":"Receipt",
      "Foto":"Photo",
      "Mijn account | Vakento":"My account | Vakento",
      "Naar Vakento":"Go to Vakento",
      "Direct naar je eigen Vakento.":"Go straight to your own Vakento.",
      "E-mail":"Email",
      "Wachtwoord":"Password",
      "Wachtwoord vergeten?":"Forgot password?",
      "Wachtwoord herstellen":"Reset password",
      "Vul je e-mailadres in. Je ontvangt een link om een nieuw wachtwoord te kiezen.":"Enter your email address. You will receive a link to choose a new password.",
      "Herstellink versturen":"Send reset link",
      "Terug naar inloggen":"Back to login",
      "Je Vakento-account":"Your Vakento account",
      "Account laden…":"Loading account…",
      "Vakento op je telefoon":"Vakento on your phone",
      "Open Vakento app":"Open Vakento app",
      "Installeer app op telefoon":"Install app on phone"
    },
    de: {
      "Werkplaats | Vakento":"Arbeitsbereich | Vakento",
      "Werkplaats":"Arbeitsbereich",
      "Overzicht":"Übersicht",
      "Planning":"Planung",
      "Klussen":"Aufträge",
      "Relaties":"Kontakte",
      "Contacten":"Kontakte",
      "Ploeg":"Team",
      "Administratie":"Verwaltung",
      "Offertes & facturen":"Angebote & Rechnungen",
      "Inkoop":"Einkauf",
      "Uren":"Stunden",
      "Boekhouding":"Buchhaltung",
      "Winst":"Gewinn",
      "Openstaand":"Offen",
      "Werk":"Arbeit",
      "Artikelen & prijzen":"Artikel & Preise",
      "Calculatie":"Kalkulation",
      "Taken":"Aufgaben",
      "Materiaal":"Material",
      "Cloud":"Cloud",
      "Slim":"Smart",
      "AI-assistent":"KI-Assistent",
      "Slim werken":"Clever arbeiten",
      "Overstappen":"Umziehen",
      "Overstappen van Rompslomp":"Von Rompslomp wechseln",
      "Mijn account":"Mein Konto",
      "Vakento app":"Vakento App",
      "Systeemcontrole":"Systemprüfung",
      "Uitloggen":"Abmelden",
      "Menu":"Menü",
      "Account":"Konto",
      "Mijn Vakento":"Mein Vakento",
      "Bon scannen":"Beleg scannen",
      "Uren boeken":"Stunden buchen",
      "Laden…":"Laden…",
      "Facturen":"Rechnungen",
      "Vakento App":"Vakento App",
      "Online":"Online",
      "Alles van je abonnement bij de hand.":"Alles aus deinem Abo griffbereit.",
      "Werk, administratie, bonnen, cloud en slimme ondersteuning vanaf je telefoon.":"Arbeit, Verwaltung, Belege, Cloud und smarte Unterstützung auf deinem Smartphone.",
      "Maak een foto van je kassabon en laat Vakento hem automatisch uitlezen.":"Fotografiere deinen Beleg und lass Vakento ihn automatisch auslesen.",
      "Camera":"Kamera",
      "Hoofdmenu":"Hauptmenü",
      "Belangrijkste onderdelen":"Wichtigste Funktionen",
      "Vandaag":"Heute",
      "Dagoverzicht":"Tagesübersicht",
      "Werk & ploeg":"Arbeit & Team",
      "Alle dossiers":"Alle Aufträge",
      "Papierwerk":"Dokumente",
      "Registreren":"Erfassen",
      "Automatisch uitlezen":"Automatisch auslesen",
      "Werkfoto's":"Arbeitsfotos",
      "Naar klusmap":"Zum Auftragsordner",
      "5 GB opslag":"5 GB Speicher",
      "Omzet & kosten":"Umsatz & Kosten",
      "Slimmer werken":"Cleverer arbeiten",
      "Abonnement & app":"Abo & App",
      "Scan bon automatisch":"Beleg automatisch scannen",
      "Foto maken → uitlezen → direct opslaan":"Foto → auslesen → speichern",
      "Datum":"Datum",
      "Leverancier":"Lieferant",
      "Totaal incl. btw":"Gesamt inkl. MwSt.",
      "BTW inbegrepen":"MwSt. enthalten",
      "Nog bepalen":"Noch festlegen",
      "Bedrag excl. btw":"Betrag exkl. MwSt.",
      "BTW uit totaal":"MwSt. aus Gesamtbetrag",
      "Betaald met":"Bezahlt mit",
      "Niet opgegeven":"Nicht angegeben",
      "Zakelijke rekening":"Geschäftskonto",
      "Pin / betaalpas":"Debitkarte",
      "Creditcard":"Kreditkarte",
      "Contant":"Bar",
      "Privé voorgeschoten":"Privat vorgestreckt",
      "Notitie":"Notiz",
      "Gegevens corrigeren en opnieuw opslaan":"Daten korrigieren und erneut speichern",
      "Voor de boekhouder":"Für den Steuerberater",
      "Export boekhouder":"Buchhaltungs-Export",
      "Deel complete boekhouding met boekhouder":"Komplette Buchhaltung teilen",
      "Op de klus":"Beim Auftrag",
      "Werkfoto maken":"Arbeitsfoto machen",
      "Naam klus / klant":"Auftrag / Kunde",
      "Soort foto":"Fotoart",
      "Voor aanvang":"Vor Beginn",
      "Tijdens werk":"Während der Arbeit",
      "Na oplevering":"Nach Abschluss",
      "Schade / aandachtspunt":"Schaden / Hinweis",
      "Maak werkfoto":"Arbeitsfoto machen",
      "Camera achterzijde":"Rückkamera",
      "Foto naar klusmap":"Foto im Auftragsordner speichern",
      "Recent":"Zuletzt",
      "Net opgeslagen":"Gerade gespeichert",
      "Nog niets opgeslagen via deze telefoon.":"Noch nichts über dieses Smartphone gespeichert.",
      "Bon":"Beleg",
      "Foto":"Foto",
      "Mijn account | Vakento":"Mein Konto | Vakento",
      "Naar Vakento":"Zu Vakento",
      "Direct naar je eigen Vakento.":"Direkt zu deinem Vakento.",
      "E-mail":"E-Mail",
      "Wachtwoord":"Passwort",
      "Wachtwoord vergeten?":"Passwort vergessen?",
      "Wachtwoord herstellen":"Passwort zurücksetzen",
      "Vul je e-mailadres in. Je ontvangt een link om een nieuw wachtwoord te kiezen.":"Gib deine E-Mail-Adresse ein. Du erhältst einen Link für ein neues Passwort.",
      "Herstellink versturen":"Link senden",
      "Terug naar inloggen":"Zurück zur Anmeldung",
      "Je Vakento-account":"Dein Vakento-Konto",
      "Account laden…":"Konto wird geladen…",
      "Vakento op je telefoon":"Vakento auf deinem Smartphone",
      "Open Vakento app":"Vakento App öffnen",
      "Installeer app op telefoon":"App auf Smartphone installieren"
    },
    pl: {
      "Werkplaats | Vakento":"Panel pracy | Vakento",
      "Werkplaats":"Panel pracy",
      "Overzicht":"Przegląd",
      "Planning":"Planowanie",
      "Klussen":"Zlecenia",
      "Relaties":"Kontakty",
      "Contacten":"Kontakty",
      "Ploeg":"Zespół",
      "Administratie":"Administracja",
      "Offertes & facturen":"Oferty i faktury",
      "Inkoop":"Zakupy",
      "Uren":"Godziny",
      "Boekhouding":"Księgowość",
      "Winst":"Zysk",
      "Openstaand":"Należności",
      "Werk":"Praca",
      "Artikelen & prijzen":"Pozycje i ceny",
      "Calculatie":"Kalkulacja",
      "Taken":"Zadania",
      "Materiaal":"Materiały",
      "Cloud":"Chmura",
      "Slim":"Smart",
      "AI-assistent":"Asystent AI",
      "Slim werken":"Pracuj mądrzej",
      "Overstappen":"Migracja",
      "Overstappen van Rompslomp":"Przenieś dane z Rompslomp",
      "Mijn account":"Moje konto",
      "Vakento app":"Aplikacja Vakento",
      "Systeemcontrole":"Kontrola systemu",
      "Uitloggen":"Wyloguj",
      "Menu":"Menu",
      "Account":"Konto",
      "Mijn Vakento":"Moje Vakento",
      "Bon scannen":"Skanuj paragon",
      "Uren boeken":"Dodaj godziny",
      "Laden…":"Ładowanie…",
      "Facturen":"Faktury",
      "Vakento App":"Aplikacja Vakento",
      "Online":"Online",
      "Alles van je abonnement bij de hand.":"Cały abonament zawsze pod ręką.",
      "Werk, administratie, bonnen, cloud en slimme ondersteuning vanaf je telefoon.":"Praca, administracja, paragony, chmura i inteligentna pomoc na telefonie.",
      "Maak een foto van je kassabon en laat Vakento hem automatisch uitlezen.":"Zrób zdjęcie paragonu, a Vakento automatycznie odczyta dane.",
      "Camera":"Aparat",
      "Hoofdmenu":"Menu główne",
      "Belangrijkste onderdelen":"Najważniejsze funkcje",
      "Vandaag":"Dzisiaj",
      "Dagoverzicht":"Plan dnia",
      "Werk & ploeg":"Praca i zespół",
      "Alle dossiers":"Wszystkie zlecenia",
      "Papierwerk":"Dokumenty",
      "Registreren":"Rejestruj",
      "Automatisch uitlezen":"Odczytaj automatycznie",
      "Werkfoto's":"Zdjęcia z pracy",
      "Naar klusmap":"Do folderu zlecenia",
      "5 GB opslag":"5 GB miejsca",
      "Omzet & kosten":"Przychody i koszty",
      "Slimmer werken":"Pracuj mądrzej",
      "Abonnement & app":"Abonament i aplikacja",
      "Scan bon automatisch":"Skanuj paragon automatycznie",
      "Foto maken → uitlezen → direct opslaan":"Zdjęcie → odczyt → zapis",
      "Datum":"Data",
      "Leverancier":"Dostawca",
      "Totaal incl. btw":"Razem z VAT",
      "BTW inbegrepen":"VAT wliczony",
      "Nog bepalen":"Do ustalenia",
      "Bedrag excl. btw":"Kwota netto",
      "BTW uit totaal":"VAT z kwoty brutto",
      "Betaald met":"Zapłacono",
      "Niet opgegeven":"Nie podano",
      "Zakelijke rekening":"Konto firmowe",
      "Pin / betaalpas":"Karta płatnicza",
      "Creditcard":"Karta kredytowa",
      "Contant":"Gotówka",
      "Privé voorgeschoten":"Zapłacono prywatnie",
      "Notitie":"Notatka",
      "Gegevens corrigeren en opnieuw opslaan":"Popraw dane i zapisz ponownie",
      "Voor de boekhouder":"Dla księgowego",
      "Export boekhouder":"Eksport dla księgowego",
      "Deel complete boekhouding met boekhouder":"Udostępnij księgowość księgowemu",
      "Op de klus":"Na zleceniu",
      "Werkfoto maken":"Zrób zdjęcie z pracy",
      "Naam klus / klant":"Zlecenie / klient",
      "Soort foto":"Rodzaj zdjęcia",
      "Voor aanvang":"Przed rozpoczęciem",
      "Tijdens werk":"W trakcie pracy",
      "Na oplevering":"Po zakończeniu",
      "Schade / aandachtspunt":"Uszkodzenie / uwaga",
      "Maak werkfoto":"Zrób zdjęcie",
      "Camera achterzijde":"Tylny aparat",
      "Foto naar klusmap":"Zapisz do folderu zlecenia",
      "Recent":"Ostatnie",
      "Net opgeslagen":"Ostatnio zapisane",
      "Nog niets opgeslagen via deze telefoon.":"Jeszcze nic nie zapisano z tego telefonu.",
      "Bon":"Paragon",
      "Foto":"Zdjęcie",
      "Mijn account | Vakento":"Moje konto | Vakento",
      "Naar Vakento":"Przejdź do Vakento",
      "Direct naar je eigen Vakento.":"Przejdź bezpośrednio do swojego Vakento.",
      "E-mail":"E-mail",
      "Wachtwoord":"Hasło",
      "Wachtwoord vergeten?":"Nie pamiętasz hasła?",
      "Wachtwoord herstellen":"Zresetuj hasło",
      "Vul je e-mailadres in. Je ontvangt een link om een nieuw wachtwoord te kiezen.":"Podaj adres e-mail. Otrzymasz link do ustawienia nowego hasła.",
      "Herstellink versturen":"Wyślij link",
      "Terug naar inloggen":"Wróć do logowania",
      "Je Vakento-account":"Twoje konto Vakento",
      "Account laden…":"Ładowanie konta…",
      "Vakento op je telefoon":"Vakento na telefonie",
      "Open Vakento app":"Otwórz aplikację Vakento",
      "Installeer app op telefoon":"Zainstaluj aplikację na telefonie"
    }
  };

  function queryLang() {
    const p = new URLSearchParams(location.search).get("lang");
    return SUPPORTED.includes(p) ? p : "";
  }

  function storedLang() {
    try {
      const v = localStorage.getItem("vakento.lang");
      return SUPPORTED.includes(v) ? v : "";
    } catch (_) {
      return "";
    }
  }

  function browserLang() {
    const v = String(navigator.language || "nl").slice(0,2).toLowerCase();
    return SUPPORTED.includes(v) ? v : "nl";
  }

  let lang = queryLang() || storedLang() || browserLang();
  const source = dictionaries[lang] || {};

  try { localStorage.setItem("vakento.lang", lang); } catch (_) {}
  document.documentElement.lang = lang;

  function translateText(text) {
    if (!text) return text;
    const leading = text.match(/^\s*/)?.[0] || "";
    const trailing = text.match(/\s*$/)?.[0] || "";
    const core = text.trim();
    const translated = source[core];
    return translated ? leading + translated + trailing : text;
  }

  function translateNode(root) {
    if (!root || lang === "nl") return;

    if (root.nodeType === Node.TEXT_NODE) {
      const next = translateText(root.nodeValue);
      if (next !== root.nodeValue) root.nodeValue = next;
      return;
    }

    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const el = root;

    if (el.matches("script,style,textarea,[data-no-translate]")) return;

    for (const attr of ["placeholder", "aria-label", "title"]) {
      const value = el.getAttribute?.(attr);
      if (value && source[value]) el.setAttribute(attr, source[value]);
    }

    for (const child of el.childNodes) translateNode(child);
  }

  function addSwitcher() {
    if (document.querySelector("[data-vakento-language]")) return;

    const wrap = document.createElement("label");
    wrap.dataset.vakentoLanguage = "";
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;white-space:nowrap";
    wrap.innerHTML = `
      <span aria-hidden="true">🌐</span>
      <select aria-label="Language" style="min-height:36px;border:1px solid #dfe4ea;border-radius:9px;background:#fff;padding:6px 8px;font:inherit">
        <option value="nl">NL</option>
        <option value="en">EN</option>
        <option value="de">DE</option>
        <option value="pl">PL</option>
      </select>
    `;

    const select = wrap.querySelector("select");
    select.value = lang;
    select.addEventListener("change", () => {
      const next = select.value;
      try { localStorage.setItem("vakento.lang", next); } catch (_) {}
      const url = new URL(location.href);
      url.searchParams.set("lang", next);
      location.href = url.toString();
    });

    const target =
      document.querySelector(".workspace-topbar .top-actions") ||
      document.querySelector(".mobile-app-top > div") ||
      document.querySelector(".site-top") ||
      document.querySelector("header");

    target?.prepend(wrap);
  }

  translateNode(document.body);
  if (source[document.title]) document.title = source[document.title];
  addSwitcher();

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) translateNode(node);
    }
  });
  observer.observe(document.body, { childList:true, subtree:true });
})();
