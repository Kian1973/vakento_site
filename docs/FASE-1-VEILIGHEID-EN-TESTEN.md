# Vakento fase 1 - opslag, synchronisatie en veilige tests

Status: codecontrole; geen live-productieaudit.

## Vaststellingen

- `js/store.js` bewaart werkplaatsdata in `localStorage`, met de sleutel `vakento.v3.<uid>`, waarbij `uid` uit `sessionStorage` komt.
- `load()` maakt een lege dataset als er geen opgeslagen data beschikbaar zijn. Er is in dit bestand geen server-side synchronisatie of herstelmechanisme.
- De lokale sleutel per gebruiker is **geen beveiligingsgrens**. Een browserprofiel of apparaat moet niet als veilige multi-tenant opslag worden beschouwd.
- `js/api.js` gebruikt sessiegebonden `/api/`-aanroepen voor onder andere accountcontrole; andere modules gebruiken server-API's voor contacten, cloud en betalingen. De volledige livebackend zit niet in deze repository.
- `tests/e2e/vakento.spec.mjs` bevat volledige tests die contacten, bestanden en andere testgegevens aanmaken en verwijderen. Die tests zijn bewust **niet** ingeschakeld in de automatische workflow.
- De nieuwe CI-workflow gebruikt alleen een statische webserver op 127.0.0.1. Geen VPS-login, productieaccounts of secrets. Alleen de expliciet geselecteerde veilige tests draaien.

## Nog nodig voordat we synchronisatie aanpassen

1. Op een aparte testomgeving vaststellen welke gegevens server-side en welke alleen browser-side worden opgeslagen.
2. Controleren of elke API server-side de identiteit en toegang tot records afdwingt.
3. Hersteltest op een **kopie** van back-upgegevens uitvoeren, nooit op de productieadministratie.
4. Migratieplan voor bestaande lokale data ontwerpen, met opt-in, duplicaatcontrole en terugrolmogelijkheid.
5. Synchronisatie tussen twee apparaten met een apart testaccount valideren.

## Wat automatische CI wel en niet bewijst

De CI controleert lokale bereikbaarheid van basisbestanden en de huidige scheiding van browseropslagsleutels. Dit bewijst **niet** dat klantgegevens veilig server-side gescheiden zijn, of dat de livewebsite foutloos is. De volledige schrijftests blijven uitgeschakeld.

## Run

GitHub Actions: `Vakento veilige controles`.
Lokaal: start een HTTP-server op 127.0.0.1:8765 en draai:
`VAKENTO_BASE_URL=http://127.0.0.1:8765 npx playwright test --grep '@ci|homepage, account, assets en 404'`.
