export function viewBtwConcept(data, api) {
  const {bookPeriod, invoiceBookCalc, purchaseBookCalc, bookRound, bookMoney, esc} = api;
  const now=new Date();
  const fallbackYear=now.getMonth()<3?now.getFullYear()-1:now.getFullYear();
  const fallbackQuarter=now.getMonth()<3?4:Math.floor((now.getMonth()-3)/3)+1;
  const year=Number(data.btwConcept?.year || fallbackYear);
  const quarter=String(data.btwConcept?.quarter || fallbackQuarter);
  const sales=(data.facturen||[]).filter(f=>bookPeriod(f.dag,year,quarter)).map(f=>invoiceBookCalc(f));
  const purchases=(data.inkoop||[]).filter(x=>bookPeriod(x.dag||x.datum,year,quarter)).map(x=>({x,c:purchaseBookCalc(x)}));
  const sum=(arr,key)=>bookRound(arr.reduce((t,x)=>t+Number(x[key]||0),0));
  const ex21=sum(sales,"ex21"),vat21=sum(sales,"vat21"),ex9=sum(sales,"ex9"),vat9=sum(sales,"vat9");
  const zero=sum(sales,"ex0"),reverse=sum(sales,"exVerlegd");
  const before=bookRound(purchases.reduce((t,{x,c})=>t+(x.btwAftrekbaar===true?c.vat:0),0));
  const unresolved=purchases.filter(({x,c})=>c.vat>0&&x.btwAftrekbaar==null).length;
  const incomplete=purchases.filter(({x,c})=>c.rate===null||!x.categorie).length;
  const due=bookRound(vat21+vat9-before);
  const years=[...new Set([year,now.getFullYear(),now.getFullYear()-1,...(data.facturen||[]).map(x=>Number(String(x.dag||"").slice(0,4))).filter(Boolean)])].sort((a,b)=>b-a);
  const row=(name,base,vat)=>'<tr><th>'+name+'</th><td class="money">'+(base===null?"—":bookMoney(base))+'</td><td class="money">'+(vat===null?"—":bookMoney(vat))+'</td></tr>';
  const flags=[
    ...(unresolved?[unresolved+" inkoopbonnen hebben nog geen beoordeling van btw-aftrek."]:[]),
    ...(incomplete?[incomplete+" inkopen missen een btw-tarief of categorie."]:[]),
    ...(zero?["0%-omzet handmatig in de juiste rubriek indelen."]:[]),
    ...(reverse?["Verlegde omzet handmatig op de juiste rubriek controleren."]:[]),
    ...(data.taxSettings?.kor?["De KOR is aangevinkt: deze standaardberekening is mogelijk niet geschikt."]:[]),
    "Controleer buitenlandse handel, privécorrecties, bijzondere regelingen en eventuele ontbrekende boekingen."
  ];
  return {
    html:'<div class="row"><div><p class="kicker">Btw-aangifte</p><h1>Je btw-aangifte voorbereiden</h1>'+
    '<p class="muted">Kies een kwartaal, controleer de cijfers en download het concept. Vakento verzendt niets naar de Belastingdienst.</p></div></div>'+
    '<form class="card stack" data-btw-concept-period><div class="grid-2"><label>Jaar<select name="year">'+years.map(y=>'<option value="'+y+'" '+(y===year?"selected":"")+'>'+y+'</option>').join("")+'</select></label>'+
    '<label>Kwartaal<select name="quarter">'+[1,2,3,4].map(q=>'<option value="'+q+'" '+(String(q)===quarter?"selected":"")+'>Kwartaal '+q+'</option>').join("")+'</select></label></div><button class="btn btn-ghost" type="submit">Toon kwartaal</button></form>'+
    '<div class="stat-grid" style="margin:16px 0"><div class="stat"><span>Btw op verkopen</span><b>'+bookMoney(vat21+vat9)+'</b></div><div class="stat"><span>Bevestigde voorbelasting</span><b>'+bookMoney(before)+'</b></div><div class="stat"><span>Voorlopig saldo</span><b>'+bookMoney(due)+'</b></div></div>'+
    '<section class="card"><h2>Bedragen ter controle</h2><div class="table-wrap"><table class="table"><thead><tr><th>Onderdeel</th><th>Omzet excl.</th><th>Btw</th></tr></thead><tbody>'+
    row("1a · 21% binnenland",ex21,vat21)+row("1b · 9% binnenland",ex9,vat9)+row("0% · nog indelen",zero,0)+row("Verlegd · nog indelen",reverse,0)+row("5a · berekend uit 1a/1b",null,bookRound(vat21+vat9))+row("5b · bevestigde voorbelasting",null,before)+row("Voorlopig saldo",null,due)+
    '</tbody></table></div></section><section class="card" style="margin-top:16px"><h2>Controle voordat je aangifte doet</h2><div class="list">'+flags.map(flag=>'<article class="item"><span>'+esc(flag)+'</span></article>').join("")+'</div>'+
    '<p class="muted">Dit is geen volledige officiële aangifte. Controleer alle rubrieken en laat uitzonderingen door een boekhouder beoordelen.</p>'+
    '<div class="actions"><button class="btn" type="button" data-btw-concept-export>Download concept (CSV)</button><a class="btn btn-ghost" href="#/boekhouding">Boekhouding</a>'+
    '<a class="btn btn-ghost" href="https://mijnzakelijk.belastingdienst.nl/" rel="noopener noreferrer" target="_blank">Mijn Belastingdienst Zakelijk</a></div>'+
    '<p class="muted">Niet ingediend. Je moet de aangifte zelf controleren en versturen via de Belastingdienst.</p></section>',
    rows:[["Vakento - CONCEPT btw-aangifte, niet ingediend"],["Jaar",year],["Kwartaal",quarter],["Onderdeel","Omzet excl.","Btw"],["1a binnenland 21%",ex21,vat21],["1b binnenland 9%",ex9,vat9],["0% omzet, nog indelen",zero,0],["Verlegd, nog indelen",reverse,0],["5a deelsaldo",null,bookRound(vat21+vat9)],["5b bevestigde voorbelasting",null,before],["Voorlopig saldo",null,due],["LET OP","Niet alle aangifterubrieken worden berekend"]],
    year,quarter
  };
}
export function bindBtwConcept(root, data, helpers) {
  root.querySelector("[data-btw-concept-period]")?.addEventListener("submit", e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);const year=Number(f.get("year")),quarter=String(f.get("quarter"));
    if(!Number.isInteger(year)||year<2000||year>2100||!["1","2","3","4"].includes(quarter))return;
    data.btwConcept={year,quarter};helpers.persist();
  });
  root.querySelector("[data-btw-concept-export]")?.addEventListener("click",()=>{
    const report=viewBtwConcept(data,helpers.api);
    helpers.download(report.rows,"Vakento-CONCEPT-btw-"+report.year+"-Q"+report.quarter+".csv");
    helpers.toast("Concept gedownload; niet ingediend.");
  });
}
