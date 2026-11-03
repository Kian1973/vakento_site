# Digitale offerteondertekening – integratie op Vakento VPS

**Status: voorbereid, niet live.** De actuele VPS-server staat niet volledig in deze GitHub-repository. De pagina mag **niet** als werkende ondertekening worden aangeboden totdat onderstaande endpoints, controles en tests klaar zijn.

## Bestanden

- `backend/offerte-ondertekening.mjs`: pure serverfuncties voor snapshots, willekeurige tokens, controle en bewijs.
- `offerte-ondertekenen.html` en `js/offerte-ondertekenen.js`: klantzijde, waaronder een bevestigingscode en canvas-handtekening.

## Benodigde beveiligde routes

Alleen via HTTPS, met `Cache-Control: no-store`, passende CORS en rate limiting. De klantlink is een geheim token; de database bewaart **alleen de SHA-256-hash** van het token.

1. **POST /api/offerte-ondertekening/uitnodigen** (authenticatie vereist; alleen eigenaar van de offerte): maak onveranderlijke offerte-snapshot en hash, unieke token, ontvanger, vervaldatum en e-mailuitnodiging. Sla server-side op; geen gegevens uit onbevestigde browser-localStorage vertrouwen. Retourneer status aan afzender, niet een onbeperkt publieke toegang.
2. **GET /api/offerte-ondertekening/open?t=TOKEN**: valideer tokenhash, vervaldatum, ingetrokken status en ongebruikte status. Retourneer `{offer, snapshotHash, recipientMask}`; géén persoonsgevoelige overbodige gegevens. Rate limit.
3. **POST /api/offerte-ondertekening/code-versturen** `{token}`: genereer willekeurige eenmalige code, sla uitsluitend de hash op met TTL en pogingenlimiet; verzend naar **reeds opgeslagen offerte-ontvanger**, nooit naar een vrij ingevuld adres. Retourneer `{challengeId,message}`.
4. **POST /api/offerte-ondertekening/code-controleren** `{token,challengeId,code}`: timing-safe controle, lockout, beperkt aantal pogingen, markeer sessie als geverifieerd; retourneer `{verified:true}` wanneer juist.
5. **POST /api/offerte-ondertekening/ondertekenen** `{token,challengeId,signerName,snapshotHash,consent,signature}`: vereist actieve geverifieerde challenge, éénmalig gebruik, controle van originele snapshot-hash, validatie van PNG-data en expliciete toestemming. In **één database-transactie**: immutable bewijs, handtekening, toestemming, server-tijd, documentversie, status `akkoord`, unieke constraint op invitation ID. Retourneer `{receiptId}`.
6. **GET /api/offerte-ondertekening/bewijs/:id**: alleen voor geauthenticeerde offerte-eigenaar; PDF en verificatiebewijs met server-side opgeslagen PDF-snapshot, naam, tijd en handtekening.

## Aanpassingen in werkplaats

Pas **na implementatie en tests** in de bestaande offerte-lijst een knop 'Ter ondertekening versturen' in. E-mail en offerte-eigendom moeten op server worden geverifieerd. Pas status pas aan na geslaagde database-transactie. Bestaande knop 'Zet op akkoord' is een interne handmatige status en mag niet worden verward met digitaal ondertekend.

## Controlepunten

- Hergebruik token en herhaalde POST kan nooit dubbel ondertekenen.
- Expired, revoked, al gebruikte, of gewijzigde offertes weigeren.
- Niet ingelogde bezoekers zien alleen de betreffende offerte, **niet** data van andere leden.
- Beperk pogingen OTP en uitnodigingen; log geen tokens, codes of handtekeningen.
- Achteraf kunnen bestaande ondertekende offerte en bewijs nooit worden overschreven; wijziging vereist nieuwe uitnodiging.
- E-mail en PDF zijn geïnitialiseerd door de VPS en beveiligd; bewaar de bewijzen niet alleen in localStorage.
- Test op iOS Safari, Android Chrome en desktop.
- Raadpleeg waar nodig juridisch advies over type elektronische handtekening en bewaartermijn.

Dit onderdeel bevat geen e-mailproviderconfiguratie, databasewijziging of werkende route-registratie. **Niet automatisch in productie uitrollen**.