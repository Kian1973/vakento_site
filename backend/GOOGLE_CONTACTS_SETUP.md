# Google Contacten koppeling voor Vakento (backendcontract)

De contactpagina heeft knoppen voor koppelen, handmatig synchroniseren en ontkoppelen.
Deze knoppen zijn **fail-closed**: ze worden verborgen zolang een beveiligde backend ontbreekt.
Er zijn geen Google API-sleutels of toegangstokens in de frontend opgeslagen.

## Vereiste Google Cloud configuratie
1. Activeer de Google People API.
2. Maak een OAuth 2.0 Web Application client aan.
3. Configureer uitsluitend de HTTPS callback `https://vakento.nl/api/google-contacts/callback`.
4. Vraag de minimaal benodigde scope: `https://www.googleapis.com/auth/contacts.readonly`.
5. Sla client secret en encryptiesleutel uitsluitend buiten webroot op; nooit in GitHub.
6. Stel consent screen en eventuele vereiste OAuth-verificatie in.

## Authenticatie en beveiliging
- Iedere route behalve de OAuth callback vereist de **bestaande** server-side Vakento-sessie.
- Leid `user_id` uitsluitend af uit de geverifieerde sessie; nooit uit query, body of localStorage.
- `POST /connect`, `POST /sync` en `POST /disconnect` vereisen CSRF-bescherming en strikte Origin-checks.
- OAuth start met cryptografisch willekeurige state, gebonden aan sessie/user en TTL; valideer exact bij callback.
- Gebruik PKCE en offline OAuth toegang; refresh tokens worden versleuteld opgeslagen per user.
- Log geen toegangstokens, persoonsgegevens of contactpayloads.
- Voorkom accountkruising bij elk databaseverzoek met `WHERE user_id = ?`.
- Beperk API-verzoeken, tijdslimieten en synchronisatie per gebruiker.
- Doe geen AI-koppeling: contactgegevens gaan uitsluitend naar de contactenmodule.

## API-contract dat de frontend verwacht
- `GET /api/google-contacts/status` -> `{ "connected": false, "lastSync": null }`
- `POST /api/google-contacts/connect` -> `{ "url": "https://accounts.google.com/..." }`
- `GET /api/google-contacts/callback?code=...&state=...` -> valideer state, wissel code server-side, sla tokens versleuteld op, redirect naar `/werk.html#/contacten`.
- `POST /api/google-contacts/sync` -> `{ "imported": 0 }`
- `POST /api/google-contacts/disconnect` -> `{ "ok": true }`; verwijder opgeslagen tokens, behoud geïmporteerde contacten.

## Synchronisatieregels
- Google People API `people.connections.list` met `personFields=names,emailAddresses,phoneNumbers,organizations,addresses,metadata`.
- Vraag `requestSyncToken=true` bij de initiële volledige import; bewaar `nextSyncToken` **per gebruiker** na het afhandelen van alle pagina's.
- Behandel vervallen syncTokens met een nieuwe volledige import. Verwijder lokale contacten nooit automatisch.
- Koppel `google resourceName` aan een contact via een unieke sleutel `(user_id, google_resource_name)`.
- Bewerk uitsluitend records die door de Google-import worden beheerd; overschrijf handmatig aangepaste vakento-gegevens niet stilzwijgend.
- Bescherm tegen duplicaten met een expliciete koppeltabel, niet op naam alleen.
- Plan iedere 24 uur via de server scheduler, met rate limiting en backoff voor 429/5xx.
- Synchroniseer alleen **Google -> Vakento**; geen schrijfacties naar Google.

## Nog niet geconfigureerd
De daadwerkelijke serverroutes, het Google Cloud OAuth-client-ID/secret en de scheduler zijn nog niet aangesloten op de huidige productiebackend. Zonder deze onderdelen zijn de Google-knoppen bewust onzichtbaar. Sluit deze routes aan op de bestaande Vakento-authenticatie voordat je ze live activeert.