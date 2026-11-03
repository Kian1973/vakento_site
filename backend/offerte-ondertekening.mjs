// Backend bouwsteen voor digitale akkoordregistratie van offertes.
// Geen publieke routes: koppel alleen via bestaande authenticatie, database en mailservice.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const sha256 = value => createHash("sha256").update(value).digest("hex");
const MAX_SIGN_IMAGE = 150_000;
const MAX_QUOTE = 250_000;

export function makeOfferSnapshot(offer) {
  if (!offer || typeof offer !== "object") throw new Error("Offerte ontbreekt");
  const snapshot = {
    id: String(offer.id || ""),
    nummer: String(offer.nr || ""),
    klantId: String(offer.klant || ""),
    datum: String(offer.datum || ""),
    geldigTot: String(offer.geldigTot || ""),
    titel: String(offer.titel || ""),
    intro: String(offer.intro || ""),
    opmerkingen: String(offer.opmerkingen || ""),
    regels: (offer.regels || []).map(r=>({
      tekst:String(r.tekst || ""),
      aantal:Number(r.aantal || 0),
      eenheid:String(r.eenheid || ""),
      bedrag:Number(r.bedrag || 0),
      btw:r.btwVerlegd || r.btw==="verlegd"?"verlegd":Number(r.btw ?? 21)
    }))
  };
  if (!snapshot.id || !snapshot.nummer || !snapshot.klantId || !snapshot.regels.length) {
    throw new Error("Offerte niet compleet");
  }
  const json=JSON.stringify(snapshot);
  if (Buffer.byteLength(json)>MAX_QUOTE) throw new Error("Offerte te groot");
  return { snapshot, sha256:sha256(json) };
}

export function generateOfferSigningToken() {
  const token=randomBytes(32).toString("base64url");
  return { token, tokenHash:sha256(token) };
}

export function verifyOfferSigningToken(token, expectedHash) {
  if(typeof token!=="string" || token.length>128 || typeof expectedHash!=="string" || !/^[a-f0-9]{64}$/.test(expectedHash))return false;
  const a=Buffer.from(sha256(token),"hex"),b=Buffer.from(expectedHash,"hex");
  return timingSafeEqual(a,b);
}

// Deze functie werkt uitsluitend met een door de server opgehaalde uitnodiging,
// nadat token, vervaldatum, ingetrokken status, identiteit en gebruik zijn gecontroleerd.
export function buildSignatureEvidence({invitation, identity, consent, signatureDataUrl, signedAt, source}) {
  if (!invitation?.id || !invitation?.offerSnapshot || !invitation?.snapshotHash) throw new Error("Uitnodiging ontbreekt");
  if (invitation.usedAt || invitation.revokedAt || Date.parse(invitation.expiresAt)<=Date.now()) throw new Error("Ondertekenlink niet geldig");
  if (!identity?.verifiedEmail || !identity?.name?.trim()) throw new Error("Ondertekenaar niet geverifieerd");
  if (identity.verifiedEmail.toLowerCase()!==String(invitation.recipientEmail).toLowerCase()) throw new Error("Verkeerde ontvanger");
  if(consent !== true) throw new Error("Expliciet akkoord vereist");
  if(typeof signatureDataUrl!=="string" || signatureDataUrl.length>MAX_SIGN_IMAGE || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(signatureDataUrl)) throw new Error("Handtekening ongeldig");
  const raw=Buffer.from(signatureDataUrl.slice("data:image/png;base64,".length),"base64");
  if(raw.length<80 || raw.length>110_000 || !raw.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error("Geen geldige PNG handtekening");
  const actual=sha256(JSON.stringify(invitation.offerSnapshot));
  if(actual!==invitation.snapshotHash)throw new Error("Offerte gewijzigd: opnieuw uitnodigen");
  const time= signedAt instanceof Date?signedAt:new Date();
  if(!Number.isFinite(time.getTime()))throw new Error("Tijd ongeldig");
  const evidence={
    invitationId:String(invitation.id),
    offerId:String(invitation.offerSnapshot.id),
    offerNumber:String(invitation.offerSnapshot.nummer),
    snapshotHash:actual,
    recipientEmail:identity.verifiedEmail.toLowerCase(),
    signerName:identity.name.trim().slice(0,160),
    signedAt:time.toISOString(),
    consentStatement:"Ik heb de offerte gelezen en ga akkoord met de genoemde werkzaamheden, voorwaarden en prijs.",
    signatureSha256:sha256(raw),
    source:String(source||"Vakento web").slice(0,80),
    signatureDataUrl
  };
  const immutable={...evidence};
  delete immutable.signatureDataUrl;
  return {evidence,receiptHash:sha256(JSON.stringify(immutable))};
}

// Integratievoorwaarden: persistente database-transactie met unieke constraint
// op invitationId; offerte en bewijs opslaan + status 'akkoord' atomair.
// Verzenden van e-mail en verifiëren van de ontvanger gebeurt op de VPS.
