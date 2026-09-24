import { euro, klant } from './store.js?v=boekplus1';

const RGS_VERSION = '3.8';
const XAF_VERSION = '4.0.3';
const RGS = {
  bank:{account:'10201',code:'BLimBanRba',name:'Bank'},
  debtors:{account:'13011',code:'BVorDebHad',name:'Handelsdebiteuren'},
  inputVat:{account:'13305',code:'BVorVbkTvo',name:'Terug te vorderen omzetbelasting'},
  creditors:{account:'16011',code:'BSchCreHac',name:'Handelscrediteuren'},
  outputVat21:{account:'16201',code:'BSchBepBla',name:'Omzetbelasting hoog tarief'},
  outputVat9:{account:'16203',code:'BSchBepBlv',name:'Omzetbelasting laag tarief'},
  revenue21:{account:'80501',code:'WOmzNodOdh',name:'Omzet diensten hoog tarief'},
  revenue9:{account:'80505',code:'WOmzNodOdl',name:'Omzet diensten laag tarief'},
  revenue0:{account:'80520',code:'WOmzNodOdg',name:'Omzet diensten 0% / niet bij u belast'},
  material:{account:'70251',code:'WKprInhInh',name:'Inkoopwaarde handelsgoederen'},
  outsourced:{account:'70153',code:'WKprKuwKuw',name:'Kosten uitbesteed werk'},
  tools:{account:'45320',code:'WBedEemGsk',name:'Gereedschapskosten'},
  car:{account:'45790',code:'WBedAutOak',name:'Overige autokosten'},
  office:{account:'46170',code:'WBedKanOka',name:'Overige kantoorkosten'},
  phone:{account:'46110',code:'WBedKanTef',name:'Telefoonkosten'},
  software:{account:'46152',code:'WBedKanSof',name:'Kosten software abonnementen'},
  advertising:{account:'45601',code:'WBedVkkRea',name:'Reclame- en advertentiekosten'},
  insurance:{account:'46305',code:'WBedAssOva',name:'Overige assurantiepremies'},
  bankCosts:{account:'46415',code:'WBedAdlBan',name:'Bankkosten'},
  other:{account:'46801',code:'WBedAlkOal',name:'Algemene kosten'}
};

const num = v => { const x = Number(String(v ?? '').replace(',','.')); return Number.isFinite(x) ? x : 0; };
const round = v => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const safe = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const xml = v => safe(v).replace(/'/g,'&apos;');

function csv(rows){
  const cell = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
  return '\uFEFF' + rows.map(r => r.map(cell).join(';')).join('\r\n');
}
function download(content,name,type='text/csv;charset=utf-8'){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type}));
  a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
function downloadBlob(blob,name){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2500);
}

function yearOf(data){ data.boekhouder ||= {}; return Number(data.boekhouder.year || new Date().getFullYear()); }
function linesOf(f){
  const rows=f.regels?.length ? f.regels : [{tekst:f.titel,bedrag:f.bedrag,btw:f.btw ?? 21}];
  return rows.map((r,i)=>({id:i+1,text:String(r.tekst||f.titel||'Werkzaamheden'),net:round(r.bedrag),vat:[0,9,21].includes(Number(r.btw))?Number(r.btw):21}));
}
function invoiceTotals(f){
  const lines=linesOf(f); const net=round(lines.reduce((s,r)=>s+r.net,0));
  const vat=round(lines.reduce((s,r)=>s+r.net*r.vat/100,0));
  return {lines,net,vat,gross:round(net+vat)};
}
function purchaseTotals(x){
  const gross=num(x.bedragInclBtw||x.bedrag); const rate=[0,9,21].includes(Number(x.btw))?Number(x.btw):null;
  let net=num(x.bedragExclBtw), vat=num(x.btwBedrag);
  if(!net && gross && rate!==null) net=rate?round(gross/(1+rate/100)):gross;
  if(!vat && gross && net) vat=round(gross-net);
  return {gross:round(gross||net+vat),net:round(net||gross-vat),vat:round(vat),rate};
}
function purchaseRgs(x){
  const c=String(x.categorie||'4999'); const t=(String(x.tekst||'')+' '+String(x.leverancier||'')).toLowerCase();
  if(c==='4000') return {...RGS.material,source:c};
  if(c==='4100') return {...RGS.outsourced,source:c};
  if(c==='4200') return {...RGS.tools,source:c};
  if(c==='4300') return {...RGS.car,source:c};
  if(c==='4500') return {...RGS.office,source:c};
  if(c==='4600') return /software|hosting|cloud|licentie|abonnement/.test(t)?{...RGS.software,source:c}:{...RGS.phone,source:c};
  if(c==='4700') return {...RGS.advertising,source:c};
  if(c==='4800') return /bank|transactie|betaalrekening|rente/.test(t)?{...RGS.bankCosts,source:c}:{...RGS.insurance,source:c};
  return {...RGS.other,source:c,review:c==='4999'};
}
function revenueRgs(rate){ return Number(rate)===9?RGS.revenue9:Number(rate)===0?RGS.revenue0:RGS.revenue21; }
function outputVatRgs(rate){ return Number(rate)===9?RGS.outputVat9:RGS.outputVat21; }
function addEntry(rows,o){ rows.push([o.journal,o.date,o.ref,o.description,o.account.account,o.account.code,o.account.name,round(o.debit)||'',round(o.credit)||'',o.relation||'',o.review||'']); }

function rgsJournal(data,year){
  const rows=[['Dagboek','Datum','Referentie','Omschrijving','Rekening','RGS-code','RGS-omschrijving','Debet','Credit','Relatie','Controle']];
  (data.facturen||[]).filter(f=>String(f.dag||'').startsWith(String(year))).forEach(f=>{
    const c=klant(data,f.klant), t=invoiceTotals(f), ref=f.nr||f.id, relation=c?.name||'';
    addEntry(rows,{journal:'Verkoop',date:f.dag,ref,description:f.titel,account:RGS.debtors,debit:t.gross,relation});
    t.lines.forEach(line=>addEntry(rows,{journal:'Verkoop',date:f.dag,ref,description:line.text,account:revenueRgs(line.vat),credit:line.net,relation}));
    const vatMap={}; t.lines.forEach(line=>vatMap[line.vat]=round((vatMap[line.vat]||0)+line.net*line.vat/100));
    Object.entries(vatMap).forEach(([rate,amount])=>{ if(amount) addEntry(rows,{journal:'Verkoop',date:f.dag,ref,description:'BTW '+rate+'%',account:outputVatRgs(rate),credit:amount,relation}); });
    if(f.status==='betaald'){
      const d=f.betaaldOp||f.dag;
      addEntry(rows,{journal:'Bank',date:d,ref:'BET-'+ref,description:'Ontvangst '+ref,account:RGS.bank,debit:t.gross,relation});
      addEntry(rows,{journal:'Bank',date:d,ref:'BET-'+ref,description:'Afboeking debiteur '+ref,account:RGS.debtors,credit:t.gross,relation});
    }
  });
  (data.inkoop||[]).filter(x=>String(x.dag||x.datum||'').startsWith(String(year))).forEach(x=>{
    const t=purchaseTotals(x), a=purchaseRgs(x), date=x.dag||x.datum||'', ref=x.factuurnr||x.id||('INK-'+date);
    const deductible=x.btwAftrekbaar===true, cost=round(t.net+(deductible?0:t.vat)), review=(a.review||x.btwAftrekbaar==null)?'controleren':'';
    addEntry(rows,{journal:'Inkoop',date,ref,description:x.tekst||x.leverancier||'Inkoop',account:a,debit:cost,relation:x.leverancier||'',review});
    if(deductible&&t.vat) addEntry(rows,{journal:'Inkoop',date,ref,description:'Voorbelasting',account:RGS.inputVat,debit:t.vat,relation:x.leverancier||''});
    addEntry(rows,{journal:'Inkoop',date,ref,description:x.tekst||x.leverancier||'Inkoop',account:RGS.creditors,credit:t.gross,relation:x.leverancier||''});
    if(String(x.status||'betaald')==='betaald'){
      addEntry(rows,{journal:'Bank',date:x.betaaldOp||date,ref:'BET-'+ref,description:'Betaling '+ref,account:RGS.creditors,debit:t.gross,relation:x.leverancier||''});
      addEntry(rows,{journal:'Bank',date:x.betaaldOp||date,ref:'BET-'+ref,description:'Bankbetaling '+ref,account:RGS.bank,credit:t.gross,relation:x.leverancier||''});
    }
  });
  return rows;
}
function rgsMap(){
  const seen=new Map(); Object.values(RGS).forEach(x=>seen.set(x.code,x));
  return [['Rekening','RGS-code','Omschrijving','RGS-versie'],...[...seen.values()].sort((a,b)=>String(a.account).localeCompare(String(b.account))).map(x=>[x.account,x.code,x.name,RGS_VERSION])];
}
function sales(data,year){
  const rows=[['Datum','Factuurnummer','Klant','Omschrijving','Totaal excl','BTW','Totaal incl','Status','Betaald op']];
  (data.facturen||[]).filter(f=>String(f.dag||'').startsWith(String(year))).forEach(f=>{ const t=invoiceTotals(f); rows.push([f.dag||'',f.nr||'',klant(data,f.klant)?.name||'',f.titel||'',t.net,t.vat,t.gross,f.status||'',f.betaaldOp||'']); });
  return rows;
}
function purchases(data,year){
  const rows=[['Datum','Leverancier','Omschrijving','Vakento-categorie','RGS-code','RGS-omschrijving','Excl btw','BTW','Incl btw','BTW aftrekbaar','Status','Controle']];
  (data.inkoop||[]).filter(x=>String(x.dag||x.datum||'').startsWith(String(year))).forEach(x=>{ const t=purchaseTotals(x),r=purchaseRgs(x); rows.push([x.dag||x.datum||'',x.leverancier||'',x.tekst||'',x.categorie||'4999',r.code,r.name,t.net,t.vat,t.gross,x.btwAftrekbaar===true?'ja':x.btwAftrekbaar===false?'nee':'controleren',x.status||'betaald',r.review?'rubricering controleren':'']); });
  return rows;
}
function relations(data){
  const rows=[['ID','Type','Naam','Contactpersoon','Adres','Postcode','Plaats','Land','E-mail','Telefoon','KvK','BTW-nummer','Klantnummer']];
  (data.klanten||[]).forEach(c=>rows.push([c.id||'',c.type||c.soort||'klant',c.name||c.naam||'',c.contact||c.contactpersoon||'',c.adres||'',c.postcode||'',c.plaats||'',c.land||'NL',c.email||'',c.tel||c.telefoon||'',c.kvk||'',c.btw||c.btwNummer||'',c.klantnr||'']));
  return rows;
}
function banks(data,year){ const rows=[['Datum','Omschrijving','Bedrag','Status','Factuur-ID']]; (data.bankMutaties||[]).filter(x=>String(x.date||'').startsWith(String(year))).forEach(x=>rows.push([x.date||'',x.description||'',num(x.amount),x.status||'',x.invoiceId||''])); return rows; }
function assets(data){ const rows=[['Omschrijving','Aankoopdatum','Aanschafwaarde','Restwaarde','Afschrijving jaren']]; (data.activa||[]).forEach(a=>rows.push([a.name||'',a.date||'',num(a.amount),num(a.residual),num(a.years)])); return rows; }
function audits(data,year){ const rows=[['Tijdstip','Actie','Detail']]; (data.auditLog||[]).filter(x=>String(x.at||'').startsWith(String(year))).forEach(x=>rows.push([x.at||'',x.action||'',x.detail||''])); return rows; }

function ubl(data,f){
  const p=data.papier||{}, c=klant(data,f.klant)||{}, t=invoiceTotals(f), seller=data.firm||'Vakento gebruiker';
  const issue=f.dag||new Date().toISOString().slice(0,10), due=new Date(issue+'T12:00:00'); due.setDate(due.getDate()+30);
  const tax={}; t.lines.forEach(l=>{ tax[l.vat] ||= {net:0,vat:0}; tax[l.vat].net=round(tax[l.vat].net+l.net); tax[l.vat].vat=round(tax[l.vat].vat+l.net*l.vat/100); });
  let s="<?xml version='1.0' encoding='UTF-8'?><Invoice xmlns='urn:oasis:names:specification:ubl:schema:xsd:Invoice-2' xmlns:cac='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2' xmlns:cbc='urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'>";
  s+='<cbc:UBLVersionID>2.1</cbc:UBLVersionID><cbc:ID>'+xml(f.nr||f.id)+'</cbc:ID><cbc:IssueDate>'+xml(issue)+'</cbc:IssueDate><cbc:DueDate>'+due.toISOString().slice(0,10)+'</cbc:DueDate><cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode><cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>';
  s+='<cac:AccountingSupplierParty><cac:Party><cac:PartyName><cbc:Name>'+xml(seller)+'</cbc:Name></cac:PartyName>';
  if(p.kvk) s+='<cac:PartyIdentification><cbc:ID schemeID="0106">'+xml(p.kvk)+'</cbc:ID></cac:PartyIdentification>';
  s+='<cac:PostalAddress>'+(p.adres?'<cbc:StreetName>'+xml(p.adres)+'</cbc:StreetName>':'')+(p.postcode?'<cbc:PostalZone>'+xml(p.postcode)+'</cbc:PostalZone>':'')+((p.plaats||data.place)?'<cbc:CityName>'+xml(p.plaats||data.place)+'</cbc:CityName>':'')+'<cac:Country><cbc:IdentificationCode>'+xml(p.land||'NL')+'</cbc:IdentificationCode></cac:Country></cac:PostalAddress>';
  if(p.btw) s+='<cac:PartyTaxScheme><cbc:CompanyID>'+xml(p.btw)+'</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>';
  s+='<cac:PartyLegalEntity><cbc:RegistrationName>'+xml(seller)+'</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>';
  s+='<cac:AccountingCustomerParty><cac:Party><cac:PartyName><cbc:Name>'+xml(c.name||c.naam||'Klant')+'</cbc:Name></cac:PartyName><cac:PostalAddress>'+(c.adres?'<cbc:StreetName>'+xml(c.adres)+'</cbc:StreetName>':'')+(c.postcode?'<cbc:PostalZone>'+xml(c.postcode)+'</cbc:PostalZone>':'')+(c.plaats?'<cbc:CityName>'+xml(c.plaats)+'</cbc:CityName>':'')+'<cac:Country><cbc:IdentificationCode>'+xml(c.land||'NL')+'</cbc:IdentificationCode></cac:Country></cac:PostalAddress><cac:PartyLegalEntity><cbc:RegistrationName>'+xml(c.name||c.naam||'Klant')+'</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>';
  if(p.iban) s+='<cac:PaymentMeans><cbc:PaymentMeansCode>30</cbc:PaymentMeansCode><cbc:PaymentID>'+xml(f.nr||f.id)+'</cbc:PaymentID><cac:PayeeFinancialAccount><cbc:ID>'+xml(p.iban)+'</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>';
  s+='<cac:TaxTotal><cbc:TaxAmount currencyID="EUR">'+t.vat.toFixed(2)+'</cbc:TaxAmount>';
  Object.entries(tax).forEach(([rate,x])=>{ s+='<cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">'+x.net.toFixed(2)+'</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">'+x.vat.toFixed(2)+'</cbc:TaxAmount><cac:TaxCategory><cbc:ID>'+(Number(rate)===0?'Z':'S')+'</cbc:ID><cbc:Percent>'+Number(rate).toFixed(2)+'</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>'; });
  s+='</cac:TaxTotal><cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="EUR">'+t.net.toFixed(2)+'</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="EUR">'+t.net.toFixed(2)+'</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="EUR">'+t.gross.toFixed(2)+'</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="EUR">'+t.gross.toFixed(2)+'</cbc:PayableAmount></cac:LegalMonetaryTotal>';
  t.lines.forEach(l=>{ s+='<cac:InvoiceLine><cbc:ID>'+l.id+'</cbc:ID><cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="EUR">'+l.net.toFixed(2)+'</cbc:LineExtensionAmount><cac:Item><cbc:Name>'+xml(l.text)+'</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>'+(l.vat===0?'Z':'S')+'</cbc:ID><cbc:Percent>'+l.vat.toFixed(2)+'</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="EUR">'+l.net.toFixed(2)+'</cbc:PriceAmount><cbc:BaseQuantity unitCode="C62">1</cbc:BaseQuantity></cac:Price></cac:InvoiceLine>'; });
  return s+'</Invoice>';
}

function xafReady(data,year){
  return {notice:'Voorbereidingsdataset voor XAF '+XAF_VERSION+'. Dit is geen officieel gevalideerde .xaf.',specification:{xaf:XAF_VERSION,rgs:RGS_VERSION,financialYear:year,currency:'EUR',generatedAt:new Date().toISOString()},company:{name:data.firm||'',kvk:data.papier?.kvk||'',vat:data.papier?.btw||'',iban:data.papier?.iban||'',address:data.papier?.adres||'',postalCode:data.papier?.postcode||'',city:data.papier?.plaats||data.place||'',country:data.papier?.land||'NL'},generalLedger:rgsMap().slice(1),journal:rgsJournal(data,year).slice(1),customers:data.klanten||[],bank:(data.bankMutaties||[]).filter(x=>String(x.date||'').startsWith(String(year))),assets:data.activa||[]};
}
function readme(year,software){
  const labels={exact:'Exact / Exact Online',twinfield:'Twinfield',snelstart:'SnelStart',moneybird:'Moneybird',afas:'AFAS',yuki:'Yuki',other:'Ander boekhoudpakket'};
  return 'VAKENTO - MIJN BOEKHOUDER\nBoekjaar: '+year+'\nDoelpakket: '+(labels[software]||labels.other)+'\nRGS: '+RGS_VERSION+'\nXAF-lijn: '+XAF_VERSION+'\n\nInhoud:\n- RGS-rekeningschema\n- RGS-journaal (dubbele boekingen)\n- verkoop en inkoop\n- relaties\n- bankmutaties\n- activa\n- auditlog\n- volledige JSON-back-up\n- UBL 2.1 facturen\n- XAF 4.0 voorbereidingsdataset\n\nLET OP: xaf4-voorbereiding is nog geen officieel gevalideerde .xaf. Rubriceringen met controleren moeten door de boekhouder worden beoordeeld.';
}
async function packageZip(data,year,software){
  if(!window.JSZip) throw new Error('ZIP-module is niet geladen.');
  const z=new window.JSZip(); z.file('00-LEESMIJ.txt',readme(year,software)); z.file('01-rgs-rekeningschema.csv',csv(rgsMap())); z.file('02-rgs-journaal.csv',csv(rgsJournal(data,year))); z.file('03-verkoopfacturen.csv',csv(sales(data,year))); z.file('04-inkoopboek.csv',csv(purchases(data,year))); z.file('05-relaties.csv',csv(relations(data))); z.file('06-bankmutaties.csv',csv(banks(data,year))); z.file('07-activa.csv',csv(assets(data))); z.file('08-auditlog.csv',csv(audits(data,year))); z.file('09-data-backup.json',JSON.stringify({exportedAt:new Date().toISOString(),year,data},null,2)); z.file('xaf4-voorbereiding/xaf4-input.json',JSON.stringify(xafReady(data,year),null,2)); z.file('xaf4-voorbereiding/LEESMIJ.txt','Voorbereidingsdata voor XAF '+XAF_VERSION+'. Niet gebruiken als officieel gevalideerde .xaf zonder ODB-validatie.');
  const uf=z.folder('ubl'); (data.facturen||[]).filter(f=>String(f.dag||'').startsWith(String(year))).forEach(f=>uf.file(String(f.nr||f.id||'factuur').replace(/[\\/:*?"<>|]/g,'_')+'.xml',ubl(data,f)));
  return z.generateAsync({type:'blob'});
}

export function viewBoekhouder(data){
  data.boekhouder ||= {}; const year=yearOf(data), software=data.boekhouder.software||'other';
  const ys=Array.from({length:6},(_,i)=>new Date().getFullYear()-i);
  const inv=(data.facturen||[]).filter(f=>String(f.dag||'').startsWith(String(year)));
  const pur=(data.inkoop||[]).filter(x=>String(x.dag||x.datum||'').startsWith(String(year)));
  const review=pur.filter(x=>x.btwAftrekbaar==null||String(x.categorie||'4999')==='4999').length;
  const opts=[['exact','Exact / Exact Online'],['twinfield','Twinfield'],['snelstart','SnelStart'],['moneybird','Moneybird'],['afas','AFAS'],['yuki','Yuki'],['other','Ander programma']];
  let h='<div class="row"><div><p class="kicker">Mijn boekhouder</p><h1 class="simple-title">Alles klaar voor de boekhouder.</h1><p class="muted simple-subtitle">Download één compleet pakket. Vakento zet de gegevens zoveel mogelijk in standaardformaten klaar.</p></div></div>';
  h+='<section class="card"><form class="stack" data-bookkeeper-settings><div class="grid-2"><label>Boekjaar<select name="year">'+ys.map(y=>'<option value="'+y+'" '+(y===year?'selected':'')+'>'+y+'</option>').join('')+'</select></label><label>Programma van de boekhouder<select name="software">'+opts.map(o=>'<option value="'+o[0]+'" '+(software===o[0]?'selected':'')+'>'+o[1]+'</option>').join('')+'</select></label></div></form></section>';
  h+='<div class="stat-grid" style="margin-top:14px"><div class="stat"><span class="muted">Facturen</span><b>'+inv.length+'</b></div><div class="stat"><span class="muted">Inkopen</span><b>'+pur.length+'</b></div><div class="stat"><span class="muted">RGS</span><b>'+RGS_VERSION+'</b></div><div class="stat"><span class="muted">Te controleren</span><b class="'+(review?'warn':'ok')+'">'+review+'</b></div></div>';
  h+='<div class="simple-actions"><button class="simple-action" type="button" data-bookkeeper-package><span class="simple-icon">⇩</span><strong>Compleet boekhouderspakket</strong><small>CSV, RGS, UBL, bank, activa, auditlog en back-up in één ZIP.</small></button><button class="simple-action" type="button" data-bookkeeper-rgs><span class="simple-icon">R</span><strong>RGS-journaal</strong><small>Dubbel geboekte journaalregels met RGS-codes.</small></button><button class="simple-action" type="button" data-bookkeeper-ubl><span class="simple-icon">U</span><strong>UBL-facturen</strong><small>Alle verkoopfacturen van '+year+' als UBL 2.1 XML.</small></button><button class="simple-action" type="button" data-bookkeeper-backup><span class="simple-icon">{ }</span><strong>Volledige back-up</strong><small>Alle Vakento-gegevens als JSON.</small></button></div>';
  h+='<div class="simple-grid"><section class="simple-card"><p class="kicker">RGS '+RGS_VERSION+'</p><h3>Standaardcodes voor de boekhouder.</h3><p>Vakento vertaalt verkoop, btw, debiteuren, crediteuren, bank en veel kosten automatisch naar RGS. Onzekere boekingen worden gemarkeerd.</p></section><section class="simple-card"><p class="kicker">XAF '+XAF_VERSION+'</p><h3>XAF-voorbereiding zit in het pakket.</h3><p>De gegevensstructuur is voorbereid. Een officiële .xaf krijgt pas het label gevalideerd nadat deze tegen de ODB-specificatie en validatieservice is getest.</p></section></div>';
  h+='<section class="card" style="margin-top:16px"><p class="kicker">RGS-koppeling</p><h2>Belangrijkste automatische koppelingen</h2><div class="table-wrap" style="overflow:auto"><table class="table"><thead><tr><th>Vakento</th><th>RGS-code</th><th>Rekening</th></tr></thead><tbody>';
  [['Bank',RGS.bank],['Debiteuren',RGS.debtors],['Crediteuren',RGS.creditors],['BTW voorbelasting',RGS.inputVat],['Omzet 21%',RGS.revenue21],['Omzet 9%',RGS.revenue9],['Gereedschap',RGS.tools],['Auto/vervoer',RGS.car],['Software',RGS.software],['Reclame',RGS.advertising]].forEach(r=>{h+='<tr><td>'+r[0]+'</td><td>'+r[1].code+'</td><td>'+r[1].account+' · '+r[1].name+'</td></tr>';});
  return h+'</tbody></table></div></section>';
}

export function bindBoekhouder(root,{data,persist,toast}){
  root.querySelector('[data-bookkeeper-settings]')?.addEventListener('change',e=>{const f=new FormData(e.currentTarget); data.boekhouder||={}; data.boekhouder.year=Number(f.get('year')||new Date().getFullYear()); data.boekhouder.software=String(f.get('software')||'other'); persist();});
  root.querySelector('[data-bookkeeper-package]')?.addEventListener('click',async()=>{try{const y=yearOf(data); const b=await packageZip(data,y,data.boekhouder?.software||'other'); downloadBlob(b,'Vakento-boekhouder-'+y+'.zip'); toast('Compleet boekhouderspakket is klaar');}catch(ex){toast(ex.message||'Export mislukt');}});
  root.querySelector('[data-bookkeeper-rgs]')?.addEventListener('click',()=>{const y=yearOf(data); download(csv(rgsJournal(data,y)),'Vakento-RGS-journaal-'+y+'.csv'); toast('RGS-journaal gedownload');});
  root.querySelector('[data-bookkeeper-ubl]')?.addEventListener('click',async()=>{if(!window.JSZip){toast('ZIP-module is niet geladen');return;} const y=yearOf(data),z=new window.JSZip(); let count=0; (data.facturen||[]).filter(f=>String(f.dag||'').startsWith(String(y))).forEach(f=>{z.file(String(f.nr||f.id||'factuur').replace(/[\\/:*?"<>|]/g,'_')+'.xml',ubl(data,f));count++;}); downloadBlob(await z.generateAsync({type:'blob'}),'Vakento-UBL-facturen-'+y+'.zip'); toast(count+' UBL-factuur/facturen klaar');});
  root.querySelector('[data-bookkeeper-backup]')?.addEventListener('click',()=>{const y=yearOf(data); download(JSON.stringify({exportedAt:new Date().toISOString(),year:y,data},null,2),'Vakento-backup-'+y+'.json','application/json;charset=utf-8'); toast('Back-up gedownload');});
}