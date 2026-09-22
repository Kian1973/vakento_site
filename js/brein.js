/** Vakverstand in de browser. Werkt altijd. Server-AI maakt de taal scherper als die aan staat. */

const TARIEF = 72;
const VOORRIJDEN = 45;

const PACKS = [
  {
    keys: ["groepenkast", "meterkast", "3-fase", "driefase"],
    titel: "Groepenkast vernieuwen",
    uren: 8,
    regels: [
      { tekst: "Hoofdschakelaar en aardlekautomaten", bedrag: 620 },
      { tekst: "Kast 3-fase, inbouw", bedrag: 480 },
      { tekst: "Afvoer oude kast", bedrag: 95 },
    ],
    spullen: ["Hoofdschakelaar 63A", "Aardlekautomaat"],
    risico: "Netbeheerder soms nodig bij hoofdaansluiting.",
  },
  {
    keys: ["warmtepomp", "cv-ketel", "ketel", "cv "],
    titel: "Installatie naregelen",
    uren: 4,
    regels: [
      { tekst: "Diagnose en uitlezen storing", bedrag: 165 },
      { tekst: "Afstellen circuits / druk", bedrag: 210 },
    ],
    spullen: ["Manometer", "Inhibitor"],
    risico: "Garantie van fabrikant checken voor openen.",
  },
  {
    keys: ["sanitair", "toilet", "douche", "wastafel"],
    titel: "Sanitair vervangen",
    uren: 6,
    regels: [
      { tekst: "Demonteren bestaand", bedrag: 180 },
      { tekst: "Stellen en aansluiten", bedrag: 420 },
      { tekst: "Afkitten en opleveren", bedrag: 95 },
    ],
    spullen: ["Pex 16mm (rol)", "Siliconen sanitair"],
    risico: "Tegelwerk extra als wand open moet.",
  },
  {
    keys: ["dakgoot", "hemelwater", "regenpijp"],
    titel: "Hemelwater herstellen",
    uren: 5,
    regels: [
      { tekst: "Hoogwerker / ladderwerk", bedrag: 220 },
      { tekst: "Gootdeel vervangen", bedrag: 310 },
    ],
    spullen: ["Gootbeugel", "Verbindingsstuk"],
    risico: "Valbeveiliging verplicht boven 2,5 m.",
  },
  {
    keys: ["wcd", "stopcontact", "groep extra", "krachtgroep"],
    titel: "Extra groep / WCD",
    uren: 3,
    regels: [
      { tekst: "Sleuven of opbouwbuis", bedrag: 140 },
      { tekst: "Trekken en aansluiten", bedrag: 190 },
    ],
    spullen: ["WCD polarwit"],
    risico: "Asbest in oude kitranden bij sleuven in de Achterhoekse boerderij.",
  },
];

function packFor(text) {
  const t = text.toLowerCase();
  return PACKS.find((p) => p.keys.some((k) => t.includes(k))) || {
    titel: text.slice(0, 48) || "Klus op maat",
    uren: 4,
    regels: [{ tekst: "Arbeid en voorrijden, nader te specificeren", bedrag: 0 }],
    spullen: [],
    risico: "Na schouw vastzetten.",
  };
}

export function offerteUitTekst(text, plaats = "Achterhoek") {
  const pack = packFor(text);
  const arbeid = Math.round(pack.uren * TARIEF);
  const regels = [
    ...pack.regels,
    { tekst: `Arbeid ${pack.uren} uur à €${TARIEF}`, bedrag: arbeid },
    { tekst: `Voorrijden ${plaats}`, bedrag: VOORRIJDEN },
  ];
  const bedrag = regels.reduce((a, r) => a + r.bedrag, 0);
  return {
    titel: pack.titel,
    regels,
    bedrag,
    spullen: pack.spullen,
    risico: pack.risico,
    toelichting: `Op basis van vakregels, geen gok uit de lucht. ${pack.uren} uur ingeschat.`,
    bron: "vakverstand",
  };
}

export function briefing(data, roster) {
  const today = new Date().toISOString().slice(0, 10);
  const inzet = data.inzet.filter((i) => i.day === today);
  const leeg = roster.filter((p) => !inzet.some((i) => i.person === p.id));
  const off = data.offertes.filter((o) => o.status === "verstuurd");
  const urenGat = roster.filter((p) => !data.uren.some((u) => u.person === p.id && u.day === today));
  const low = data.materiaal.filter((m) => m.voorraad <= m.min);
  const regels = [
    inzet.length ? `${inzet.length} man op pad.` : "Nog niemand ingepland vandaag.",
    leeg.length ? `Vrij: ${leeg.map((p) => p.name.split(" ")[0]).join(", ")}.` : "Ploeg vol.",
    off.length ? `${off.length} offerte wacht op ja.` : "Geen open offertes.",
    urenGat.length ? `Uren missen bij ${urenGat.map((p) => p.name.split(" ")[0]).join(", ")}.` : "Uren staan.",
    low.length ? `Bus: ${low.map((m) => m.naam).join(", ")} bijna op.` : "Voorraad op peil.",
  ];
  return { tekst: regels.join(" "), regels, bron: "vakverstand" };
}

export function planWeek(data, roster, days) {
  const open = data.klussen.filter((k) => k.status === "ingepland" || k.status === "offerte");
  const extra = [];
  for (const day of days) {
    const iso = day.toISOString().slice(0, 10);
    for (const p of roster) {
      const busy = data.inzet.some((i) => i.person === p.id && i.day === iso);
      if (busy) continue;
      const k = open.find((klus) => (klus.people || []).includes(p.id)) || open[0];
      if (!k) continue;
      extra.push({ person: p.id, klus: k.id, day: iso, title: k.title });
    }
  }
  return { extra: extra.slice(0, 6), bron: "vakverstand" };
}

export function werkbonUitUren(data, klusId) {
  const rows = data.uren.filter((u) => u.klus === klusId);
  const titel = data.klussen.find((k) => k.id === klusId)?.title || "Klus";
  if (!rows.length) {
    return { tekst: `${titel}: nog geen uren. Noteer wat je ziet, foto erbij, klaar.`, bron: "vakverstand" };
  }
  const regels = rows.map((u) => `${u.uren} u — ${u.note || "werkzaamheden"}`);
  return {
    tekst: `${titel}\n${regels.join("\n")}\nOpgeleverd zonder open einden, tenzij hierboven anders.`,
    bron: "vakverstand",
  };
}


export async function verrijkMetServer(task, local, context) {
  try {
    const res = await fetch("/api/brein", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, local, context }),
    });
    if (!res.ok) return { ...local, bron: local.bron };
    const json = await res.json();
    return { ...local, ...json, bron: json.bron || "ai+vakverstand" };
  } catch {
    return local;
  }
}
