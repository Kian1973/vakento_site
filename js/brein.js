/** Vakento offertevoorstel. Rekent alleen met door de gebruiker opgegeven tarieven. */

function veiligBedrag(waarde) {
  const n = Number(String(waarde ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.min(1000000, Math.max(0, n)) : 0;
}

function splitsOpdracht(omschrijving) {
  const tekst = String(omschrijving || "").trim().slice(0, 3000);
  const stukken = tekst
    .replace(/\s+\ben\b\s+(?=\d+(?:[.,]\d+)?\s)/gi, " | ")
    .split(/\s*(?:;|\n|,(?=\s*[^\d])|\|)\s*/)
    .map(s => s.trim())
    .filter(Boolean);
  return stukken.slice(0, 20);
}

function hoeveelheidUitTekst(tekst) {
  const m = tekst.match(/(\d+(?:[.,]\d+)?)\s*(m²|m2|m\b|uur\b|uren\b|u\b|stuks?\b|st\b|dagen?\b|keer\b)/i);
  if (m) {
    const aantal = veiligBedrag(m[1]);
    const u = m[2].toLowerCase();
    const eenheid = /m²|m2/.test(u) ? "m²" : u === "m" ? "m"
      : /uur|uren|^u$/.test(u) ? "uur" : /dag/.test(u) ? "dag"
      : u === "keer" ? "keer" : "st";
    return { aantal, eenheid };
  }
  const st = tekst.match(/(\d+(?:[.,]\d+)?)\s*(kozijnen?|deuren?|ramen?|kamers?|plafonds?|wanden?|panelen?|trappen?)\b/i);
  return st ? { aantal: veiligBedrag(st[1]), eenheid: "st" } : { aantal: 1, eenheid: "st" };
}

/**
 * Geeft een bewerkbaar VOORSTEL, geen definitieve calculatie.
 * Alle tarieven zijn exclusief btw en komen uit de administratie of de invoer.
 * Onbekende materiaal-/werkprijzen blijven 0 in plaats van te worden verzonnen.
 */
export function offerteUitTekst(text, plaats = "", opties = {}) {
  const omschrijving = String(text || "").trim().slice(0, 3000);
  const uurtarief = veiligBedrag(opties.uurtariefExclBtw);
  const voorrijden = veiligBedrag(opties.voorrijkostenExclBtw);
  const werk = splitsOpdracht(omschrijving);
  const regels = werk.map(tekst => ({ tekst, ...hoeveelheidUitTekst(tekst) }))
    .filter(r => r.eenheid !== "uur")
    .map(r => ({
      ...r, stukprijs: 0, prijsInvoer: "excl",
      extra: "Prijs en benodigde materialen zelf controleren en invullen."
    }));

  const urenMatch = omschrijving.match(/(\d+(?:[.,]\d+)?)\s*(?:uur|uren)\b/i);
  const uren = urenMatch ? veiligBedrag(urenMatch[1]) : 0;
  regels.push({
    tekst: "Arbeid", extra: uren ? "Uren uit klusomschrijving; controleer de hoeveelheid." : "Vul het aantal benodigde uren in.",
    aantal: uren, eenheid: "uur", stukprijs: uurtarief, prijsInvoer: "excl"
  });

  if (voorrijden > 0) {
    regels.push({
      tekst: "Voorrijkosten" + (plaats ? " " + String(plaats).slice(0, 80) : ""),
      aantal: 1, eenheid: "keer", stukprijs: voorrijden, prijsInvoer: "excl",
      extra: "Tarief uit de eigen bedrijfsinstellingen."
    });
  }

  const bedrag = regels.reduce((som, r) => som + r.aantal * r.stukprijs, 0);
  return {
    titel: omschrijving.slice(0, 78) || "Klus op maat",
    regels,
    bedrag: Math.round(bedrag * 100) / 100,
    spullen: [],
    risico: "Uren, materialen, btw en eventuele meerkosten controleren voor verzending.",
    toelichting: "Concept op basis van de klusomschrijving. Onbekende prijzen zijn bewust niet ingevuld. Controleer alle aantallen, uren, tarieven en btw.",
    bron: "vakverstand"
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


export async function verrijkMetServer(task, local, context, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/brein", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, local, context }),
      signal: controller.signal,
    });
    if (!res.ok) return { ...local, bron: local.bron };
    const json = await res.json();
    return { ...local, ...json, bron: json.bron || "ai+vakverstand" };
  } catch {
    return local;
  } finally {
    clearTimeout(timer);
  }
}
