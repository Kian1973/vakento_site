# Vakento koppelen aan de VPS

De repository is publiek en kan daarom zonder GitHub-wachtwoord op de VPS worden opgehaald.

## Veilige eerste stap: alleen koppelen

Voer als root op de VPS uit:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Kian1973/vakento_site/main/scripts/connect-vps.sh)
```

Dit zet de GitHub-werkmap in `/opt/vakento-site`. Het verandert de live website nog niet.

## Daarna publiceren

Pas nadat gecontroleerd is dat de documentroot van vakento.nl echt `/var/www/vakento.nl/web` is:

```bash
bash /opt/vakento-site/scripts/deploy-vps.sh
```

Het deployscript maakt eerst een backup van de homepagebestanden onder `/var/backups/vakento-site/<datum-tijd>/` en kopieert daarna alleen:

- `index.html`
- `assets/vakento-home.css`
- `assets/vakento-home.js`

Andere bestanden van Vakento worden niet verwijderd.

## Andere documentroot

Als ISPConfig een andere map gebruikt:

```bash
SITE_ROOT=/juiste/documentroot bash /opt/vakento-site/scripts/deploy-vps.sh
```
