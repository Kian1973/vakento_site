import test from "node:test";
import assert from "node:assert/strict";
import { offerteUitTekst } from "../../js/brein.js";
import { offerteBtwVoorstel } from "../../js/offerte-btw.js";

test("schilderwerk met m² en zonder verzonnen materiaalprijs", () => {
  const o = offerteUitTekst("plafond 44 m² spuiten; muren 42 m² schilderen", "Winterswijk",
    {uurtariefExclBtw:50, voorrijkostenExclBtw:25});
  assert.equal(o.regels[0].aantal,44);
  assert.equal(o.regels[0].eenheid,"m²");
  assert.equal(o.regels[1].aantal,42);
  assert.equal(o.regels[1].stukprijs,0);
  assert.equal(o.regels.find(r=>r.tekst==="Arbeid").aantal,0);
  assert.equal(o.regels.at(-1).stukprijs,25);
  assert.equal(o.bedrag,25);
});

test("uren volgen uitsluitend de genoemde uren", () => {
  const o=offerteUitTekst("3 deuren schilderen, 12 uur arbeid","",
    {uurtariefExclBtw:60});
  assert.equal(o.regels[0].aantal,3);
  assert.equal(o.regels.find(r=>r.tekst==="Arbeid").aantal,12);
  assert.equal(o.bedrag,720);
});

test("eigen bedrijfstarieven zijn exclusief btw; ontbreken geeft geen 65-euro-aanname", () => {
  const leeg=offerteUitTekst("kleine klus");
  assert.equal(leeg.regels.find(r=>r.tekst==="Arbeid").stukprijs,0);
  assert.ok(!leeg.regels.some(r=>/Voorrijkosten/.test(r.tekst)));
});

test("decimale komma, grenzen en negatieve invoer", () => {
  const o=offerteUitTekst("muur 2,5 m² schilderen; 1,5 uur afwerken","",{
    uurtariefExclBtw: "40,50",voorrijkostenExclBtw:-10
  });
  assert.equal(o.regels[0].aantal,2.5);
  assert.equal(o.regels.find(r=>r.tekst==="Arbeid").aantal,1.5);
  assert.equal(o.bedrag,60.75);
});

test("BTW categorieen en verlegd vlag", () => {
  assert.deepEqual(offerteBtwVoorstel({tekst:"Arbeid"},"standaard21"),{btw:21,btwVerlegd:false});
  assert.deepEqual(offerteBtwVoorstel({tekst:"Schilderwerk"},"schilder9"),{btw:9,btwVerlegd:false});
  assert.deepEqual(offerteBtwVoorstel({tekst:"Isolatiemateriaal"},"isolatieMix"),{btw:21,btwVerlegd:false});
  assert.deepEqual(offerteBtwVoorstel({tekst:"Isolatie arbeid"},"isolatieMix"),{btw:9,btwVerlegd:false});
  assert.deepEqual(offerteBtwVoorstel({tekst:"Arbeid"},"verlegd"),{btw:0,btwVerlegd:true});
});
