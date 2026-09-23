# Rompslomp import op de Vakento VPS

De frontend staat op `/werk.html#/rompslomp`.

## VPS-koppeling

De bestaande Vakento Node-server moet `backend/rompslomp-import.mjs` importeren en vóór de algemene 404-route aanroepen.

Voorbeeld:

```js
import { handleRompslompImport } from "../web/backend/rompslomp-import.mjs";

// Nadat de bestaande sessie is gecontroleerd en de ingelogde user bekend is:
if (await handleRompslompImport(req, res, { user })) return;
```

Gebruik de bestaande Vakento sessie-user. Geef nooit een user_id uit de browser door.

## Benodigde mappen

```bash
install -d -m 700 -o www-data -g www-data /var/lib/vakento/imports
```

Als de Vakento service onder een andere Linux-gebruiker draait, gebruik die gebruiker in plaats van `www-data`.

## Excel ondersteuning

Voor Rompslomp XLS/XLSX exports:

```bash
cd /var/www/vakento.nl/server
npm install xlsx
```

De CSV- en XML-import werkt zonder extra npm-pakket.

## Routes

- `GET /api/import/rompslomp/status`
- `POST /api/import/rompslomp/upload?batch=...&naam=...`
- `POST /api/import/rompslomp/analyse`
- `POST /api/import/rompslomp/import`

## Veiligheid

- maximaal 50 MB per bestand
- maximaal 250 MB per batch
- alleen CSV, XLS, XLSX, XML, ZIP en PDF
- bestanden per ingelogde Vakento-gebruiker gescheiden
- geen user_id uit de browser
- bestaande Vakento-records worden niet blind overschreven
- import gebruikt eerst analyse, daarna expliciete bevestiging
- originele bestanden blijven in het batcharchief op de VPS staan

## Opschonen

Imports kunnen periodiek worden verwijderd nadat de wettelijke/bedrijfsarchivering elders is geborgd. Verwijder nooit automatisch het enige exemplaar van administratieve documenten.
