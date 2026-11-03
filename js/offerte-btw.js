/**
 * Btw-keuze voor Vakento-offertevoorstellen.
 * Het resultaat is een voorstel: ondernemer controleert feitelijke toepasselijkheid.
 * 'verlegd' is niet gelijk aan het wettelijke 0%-tarief en wordt apart doorgegeven.
 */
export function offerteBtwVoorstel(regel, categorie = "standaard21") {
  const tekst = String(regel?.tekst ?? "").toLowerCase();
  const cat = String(categorie || "standaard21");
  if (cat === "verlegd") return { btw: 0, btwVerlegd: true };
  if (cat === "standaard21") return { btw: 21, btwVerlegd: false };
  if (["schilder9", "stukadoor9", "behang9", "schoonmaak9"].includes(cat)) {
    return { btw: 9, btwVerlegd: false };
  }
  if (cat === "isolatieMix") {
    const materiaal = /(materiaal|isolatieplaat|isolatiemateriaal|pir|pur|glaswol|steenwol|eps|xps|folie|regelwerk|bevestiging)/i.test(tekst);
    return { btw: materiaal ? 21 : 9, btwVerlegd: false };
  }
  return { btw: 21, btwVerlegd: false };
}
