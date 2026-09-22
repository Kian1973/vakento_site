# Vakento automatische gebruikerstest

Vakento gebruikt Playwright om de website in een echte Chromium-browser automatisch te testen.

## Snel uitvoeren

```bash
bash test-vakento.sh
```

Zonder testaccount draait de publieke smoke-test. Voor de volledige gebruikerstest is een **apart Vakento-testaccount** aanbevolen:

```bash
export VAKENTO_TEST_EMAIL='testaccount@jouwdomein.nl'
export VAKENTO_TEST_PASSWORD='jouw-testwachtwoord'
export VAKENTO_ALLOW_WRITE_TESTS=1
bash test-vakento.sh
```

Gebruikt het testaccount Google Authenticator, voeg dan ook de Base32 instelsleutel toe:

```bash
export VAKENTO_TEST_TOTP_SECRET='BASE32SLEUTEL'
```

Gebruik hiervoor nooit het persoonlijke beheerdersaccount. De volledige test maakt tijdelijk een TEST-contact, klus, factuur, offerte, uurboeking en cloudmap aan en probeert die na afloop weer op te ruimen.

## Wat automatisch wordt getest

- homepage, accountpagina, JavaScript/CSS, manifest en 404
- oude Vakento-mailbox mag nergens terugkomen
- inloggen en optioneel 2FA
- contact aanmaken en na vernieuwen terugvinden
- klus aanmaken en bewaren
- klantportaal openen vanuit een schoon browservenster
- uren boeken
- factuur maken
- AI-offerte maken
- cloudmap maken en bestand uploaden
- boekhouderspakket downloaden
- werkfoto via de mobiele app simuleren
- AI-assistent gebruiken
- uitloggen en wachtwoord-vergetenformulier

Bij fouten maakt Playwright automatisch screenshots, trace en video in `test-results/` en `playwright-report/`.

## Alleen smoke-test

```bash
npm run test:smoke
```

## Volledige test

```bash
npm run test:full
```

De volledige test wordt automatisch overgeslagen als de drie vereiste omgevingsvariabelen ontbreken.
