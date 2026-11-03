const $=id=>document.getElementById(id);
const status=$("sign-status"),body=$("sign-body");
const token=new URLSearchParams(location.search).get("t")||"";
const money=v=>new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"}).format(Number(v)||0);
function message(el,text,ok=false){el.textContent=text;el.className=ok?"sign-ok":"sign-error";}
function fail(text){message(status,text);body.hidden=true;}
async function call(route,payload) {
  const options={method:payload?"POST":"GET",credentials:"omit",cache:"no-store",
    headers:{"Accept":"application/json",...(payload?{"Content-Type":"application/json"}:{})},
    ...(payload?{body:JSON.stringify(payload)}:{})};
  const res=await fetch("/api/offerte-ondertekening/"+route,options);
  let out={};
  try{out=await res.json()}catch{}
  if(!res.ok)throw new Error(out.error||"De server kon de aanvraag niet verwerken.");
  return out;
}
const canvas=$("signature"),ctx=canvas.getContext("2d");
let drawing=false,ink=false,verified=false,busy=false;
ctx.strokeStyle="#111827";ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=2.4;
function point(event){
  const rect=canvas.getBoundingClientRect();
  return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
}
canvas.addEventListener("pointerdown",event=>{
  if(busy)return;
  event.preventDefault();drawing=true;canvas.setPointerCapture(event.pointerId);
  const p=point(event);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.1,p.y+.1);ctx.stroke();ink=true;
});
canvas.addEventListener("pointermove",event=>{
  if(!drawing)return;event.preventDefault();const p=point(event);ctx.lineTo(p.x,p.y);ctx.stroke();
});
for(const ev of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(ev,()=>drawing=false);
$("erase").addEventListener("click",()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ink=false});
function syncSubmit(){ $("sign-submit").disabled=!verified||busy; }
let challengeId="",reviewHash="";
async function load(){
  if(!/^[A-Za-z0-9_-]{40,128}$/.test(token)){fail("De offerte-link is ongeldig. Vraag een nieuwe link aan de afzender.");return;}
  try {
    const out=await call("open?t="+encodeURIComponent(token));
    const offer=out.offer||{};
    if(!offer.nummer||!Array.isArray(offer.regels)||!out.snapshotHash)throw new Error("Offertegegevens zijn onvolledig.");
    reviewHash=String(out.snapshotHash);
    $("offer-name").textContent=String(offer.titel||"Offerte");
    $("offer-number").textContent=String(offer.nummer);
    $("offer-recipient").textContent=String(out.recipientMask||"de ontvanger");
    $("offer-intro").textContent=String(offer.intro||"");
    $("offer-terms").textContent=String(offer.opmerkingen||"");
    const lines=$("offer-lines");lines.replaceChildren();
    for(const r of offer.regels){
      const tr=document.createElement("tr"),name=document.createElement("td"),amount=document.createElement("td");
      name.textContent=String(r.tekst||"");amount.textContent=money(r.bedrag);
      tr.append(name,amount);lines.append(tr);
    }
    body.hidden=false;status.hidden=true;
  }catch(error){fail(error.message||"Offerte kon niet worden opgehaald.")}
}
$("send-code").addEventListener("click",async()=>{
  try {
    const result=await call("code-versturen",{token});
    challengeId=String(result.challengeId||"");
    message($("verify-status"),result.message||"Controlecode verzonden.",true);
  }catch(error){message($("verify-status"),error.message)}
});
$("verify-code").addEventListener("click",async()=>{
  const code=$("code").value.trim();
  if(!/^\d{4,12}$/.test(code)){message($("verify-status"),"Voer de ontvangen code in.");return}
  try{
    const result=await call("code-controleren",{token,challengeId,code});
    verified=result.verified===true;
    message($("verify-status"),verified?"E-mailadres gecontroleerd. Je kunt ondertekenen.":"Controle is niet gelukt.",verified);
    syncSubmit();
  }catch(error){verified=false;syncSubmit();message($("verify-status"),error.message)}
});
$("sign-submit").addEventListener("click",async()=>{
  if(!verified||busy)return;
  const name=$("signer").value.trim();
  if(name.length<2||!ink||!$("consent").checked){message($("sign-result"),"Vul je naam in, teken en vink de akkoordverklaring aan.");return}
  busy=true;syncSubmit();
  try{
    const result=await call("ondertekenen",{token,challengeId,signerName:name,
      snapshotHash:reviewHash,consent:true,signature:canvas.toDataURL("image/png")});
    message($("sign-result"),"Offerte ondertekend. Bewijsnummer: "+String(result.receiptId||"wordt verwerkt"),true);
    $("sign-submit").hidden=true;$("erase").hidden=true;canvas.style.pointerEvents="none";
  }catch(error){message($("sign-result"),error.message||"Ondertekenen mislukt. Probeer opnieuw.")}
  finally{busy=false;syncSubmit()}
});
load();
