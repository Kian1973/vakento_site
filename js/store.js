const people = [];

function storageKey() {
  try {
    const uid = sessionStorage.getItem("vakento.uid") || "";
    return uid ? "vakento.v3." + uid : "vakento.v3";
  } catch {
    return "vakento.v3";
  }
}

function iso(d) {  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function monday(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(12, 0, 0, 0);
  return x;
}

function emptyStart() {
  let firm = "Mijn zaak";
  try {
    firm = sessionStorage.getItem("vakento.firm") || firm;
  } catch (_) {}
  return {
    firm,
    place: "",
    ploeg: [{ id: "p1", name: firm, role: "Baas" }],
    klanten: [],
    klussen: [],
    inzet: [],
    offertes: [],
    facturen: [],
    uren: [],
    verlof: [],
    materiaal: [],
    bonnen: [],
    berichten: [],
    artikelen: [
      { id: "a1", naam: "Arbeid", eenheid: "uur", prijs: 65 },
      { id: "a2", naam: "Voorrijden", eenheid: "keer", prijs: 45 },
    ],
    inkoop: [],
    taken: [],
    documenten: [],
    werkbonnen: [],
    meerwerk: [],
    fotos: [],
    onderhoud: [],
    dagnotities: [],
    activa: [],
    periodiekeFacturen: [],
    bankMutaties: [],
    auditLog: [],
    boekhoudingPlus: { year: new Date().getFullYear(), administrationName: firm, accountantEmail: "", bankOpeningBalance: 0 },
    boekhouder: { year: new Date().getFullYear(), software: "other" },
    toeslag: 12,
    kantoorZit: 2,
    papier: {
      adres: "",
      postcode: "",
      plaats: "",
      kvk: "",
      btw: "",
      iban: "",
      tel: "",
      mail: "",
      voet: "Prijzen excl. btw. Offerte 30 dagen geldig.",
      logo: "",
    },
  };
}

function syncPloeg(data) {
  if (!data.ploeg || !data.ploeg.length) {
    data.ploeg = [{ id: "p1", name: data.firm || "Jij", role: "Baas" }];
  }
  people.length = 0;
  data.ploeg.forEach((p) => people.push(p));
}

export const roster = people;

export function load() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) {
      const data = JSON.parse(raw);
      data.artikelen ||= [];
      data.inkoop ||= [];
      data.taken ||= [];
      data.documenten ||= [];
      data.werkbonnen ||= [];
      data.meerwerk ||= [];
      data.fotos ||= [];
      data.onderhoud ||= [];
      data.dagnotities ||= [];
      data.activa ||= [];
      data.periodiekeFacturen ||= [];
      data.bankMutaties ||= [];
      data.auditLog ||= [];
      data.boekhoudingPlus ||= { year:new Date().getFullYear(), administrationName:data.firm || "", accountantEmail:"", bankOpeningBalance:0 };
      data.boekhouder ||= { year:new Date().getFullYear(), software:"other" };
      data.klanten ||= [];
      data.klussen ||= [];
      data.offertes ||= [];
      if (!Number.isFinite(Number(data.nextOfferteNummer))) {
        const hoogste = data.offertes.reduce((max, offerte) => {
          const match = String(offerte?.nr || "").match(/(?:^|\D)(\d+)$/);
          const n = match ? Number(match[1]) : 0;
          return Number.isFinite(n) ? Math.max(max, n) : max;
        }, 1039);
        data.nextOfferteNummer = Math.max(1040, hoogste + 1);
      }
      data.facturen ||= [];
      data.uren ||= [];
      data.verlof ||= [];
      data.materiaal ||= [];
      data.bonnen ||= [];
      data.berichten ||= [];
      data.inzet ||= [];
      data.toeslag ??= 12;
      data.kantoorZit ||= 2;
      data.papier ||= {
        adres: "",
        postcode: "",
        plaats: data.place || "",
        kvk: "",
        btw: "",
        iban: "",
        tel: "",
        mail: "",
        voet: "Prijzen excl. btw. Offerte 30 dagen geldig.",
        logo: "",
      };
      syncPloeg(data);
      return data;
    }
  } catch (_) {}
  const data = emptyStart();
  syncPloeg(data);
  save(data);
  return data;
}

export function save(data) {
  syncPloeg(data);
  localStorage.setItem(storageKey(), JSON.stringify(data));
}

export function euro(n) {
  return new Intl.NumberFormat(window.VakentoI18n?.locale || "nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function klant(data, id) {
  return data.klanten.find((c) => c.id === id) || { id: "", name: "Klant", plaats: "", tel: "", contact: "" };
}

export function klus(data, id) {
  return data.klussen.find((k) => k.id === id) || { id: "", title: "Klus", klant: "", people: [] };
}

export function person(id) {
  return people.find((p) => p.id === id) || { id: "", name: "—", role: "" };
}

export function weekDays(start) {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export { monday, iso, addDays };
