const PAKKET = [
  { tak: "Kantoor", titel: "Vandaag", tekst: "Wie is op pad, welke offerte wacht, wie uren vergat, wat in de bus op is. AI-ochtendbriefing in één tik." },
  { tak: "Kantoor", titel: "Weekbord", tekst: "Ploeg in rijen, dagen in kolommen. Tik om te zetten. AI vult vrije vakken met open klussen." },
  { tak: "Kantoor", titel: "Klussen en klanten", tekst: "Eigen zaak, eigen dossier. Van offerte tot oplevering. Begroot, kosten en winst per klus." },
  { tak: "Kantoor", titel: "Taken", tekst: "Korte opdracht op de klus, voor wie het moet doen. Afvinken als het klaar is." },
  { tak: "Papier", titel: "Briefpapier", tekst: "Jouw zaak bovenaan: logo, adres, KvK, btw, IBAN. Offerte en factuur op hetzelfde vel." },
  { tak: "Papier", titel: "Offertes", tekst: "Zin van de klant wordt meetstaat en prijs. Akkoord zet de klus meteen op het bord." },
  { tak: "Papier", titel: "Opdracht en pakbon", tekst: "Bevestiging en leveringsbon uit dezelfde offerte." },
  { tak: "Papier", titel: "Facturen en termijnen", tekst: "Hele rekening of 40% tussentijds. Print op briefpapier. E-factuur UBL." },
  { tak: "Ploeg", titel: "Uren", tekst: "Werk, reis, pauze, weer. Boeken vanaf de telefoon, op de klus." },
  { tak: "Ploeg", titel: "Mensen en verlof", tekst: "Ploeg erbij, rol erbij. Vrij of ziek in dezelfde lijst." },
  { tak: "Ploeg", titel: "Chat", tekst: "Kort bericht naar de ploeg, zonder aparte app." },
  { tak: "Ploeg", titel: "Spullen", tekst: "Wat in de bus en de schuur zit. Minimale voorraad, plus en min op de klus." },
  { tak: "Ploeg", titel: "Werkbon en foto’s", tekst: "Tekst, tot 8 foto’s. AI schrijft de bon uit de geboekte uren." },
  { tak: "Geld", titel: "Winst nu", tekst: "Begroot minus uren en spullen, per klus. Niet pas bij de boekhouder." },
  { tak: "Geld", titel: "Calculatie", tekst: "Loon, inkoop, toeslag, nacalculatie in één scherm." },
  { tak: "Geld", titel: "Stam", tekst: "Eigen artikelen en diensten. Hergebruik in offertes." },
  { tak: "Geld", titel: "Groothandel", tekst: "Richtprijzen van grote bouwleveranciers. Filter, zoek, tik in stam. Geen officiële prijslijst." },
  { tak: "Geld", titel: "Inkoop", tekst: "Leveranciersbonnen. Foto of tekst. Tot 50 scans per maand. AI leest bedrag en leverancier." },
  { tak: "Geld", titel: "Openstaand", tekst: "Herinnering, ontvangen afvinken, CSV naar de boekhouder." },
  { tak: "AI", titel: "Brein", tekst: "Offerte, ochtend, week, bon, inkoop lezen, vrije vraag. Vakregels eerst, jij drukt op akkoord." },
  { tak: "Klant", titel: "Klantportaal", tekst: "Elke klus heeft een link. Status, planning, ploeg, offerte, facturen, bonnen. Zonder account, zonder app-store." },
  { tak: "Post", titel: "Mail", tekst: "Versturen vanaf Vakento. Ontvangen op hallo@vakento.nl, in de werkplaats." },
  { tak: "Cloud", titel: "5 GB mappen, overal open", tekst: "Eigen mappen op de server. Open op de klus of thuis. Deellink voor wie de map mag zien. Extra 1, 5 of 10 GB klein bij te kopen." },
];

const root = document.getElementById("pakket");
if (root) {
  root.innerHTML = PAKKET.map(
    (p) =>
      `<article class="card"><p class="kicker">${p.tak}</p><h3>${p.titel}</h3><p class="muted">${p.tekst}</p></article>`
  ).join("");
}
