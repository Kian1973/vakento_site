# Vakento Contacts API

Deze frontend verwacht onderstaande routes. Alle routes gebruiken de bestaande Vakento-login/sessie.

## Beveiliging
- Haal `user_id` uitsluitend uit de ingelogde sessie.
- Accepteer nooit `user_id` uit de browser.
- Elke SELECT/UPDATE/DELETE bevat altijd `WHERE user_id = ?`.
- Gebruik prepared statements.
- Controleer e-mailadressen en maximale veldlengtes server-side.

## GET /api/contacts
Geeft alle contacten van de ingelogde gebruiker.

Response:
```json
{
  "contacts": [
    {
      "id": "42",
      "entityType": "bedrijf",
      "type": "klant",
      "name": "Voorbeeld BV",
      "contact": "Jan Jansen",
      "email": "jan@example.nl",
      "factuurEmail": "facturen@example.nl",
      "tel": "0612345678",
      "adres": "Dorpsstraat 1",
      "postcode": "7101AA",
      "plaats": "Winterswijk",
      "land": "Nederland",
      "kvk": "12345678",
      "btw": "NL001234567B01",
      "oin": "",
      "klantnr": "1001",
      "betaaltermijn": 30,
      "notitie": ""
    }
  ]
}
```

## POST /api/contacts
Maakt een nieuw contact voor de ingelogde gebruiker.

Body:
```json
{
  "entityType": "bedrijf",
  "type": "klant",
  "name": "Voorbeeld BV",
  "contact": "Jan Jansen",
  "email": "jan@example.nl",
  "factuurEmail": "facturen@example.nl",
  "tel": "0612345678",
  "adres": "Dorpsstraat 1",
  "postcode": "7101AA",
  "plaats": "Winterswijk",
  "land": "Nederland",
  "kvk": "12345678",
  "btw": "NL001234567B01",
  "oin": "",
  "klantnr": "1001",
  "betaaltermijn": 30,
  "notitie": ""
}
```

Response: `{"contact": { ...opgeslagen contact... }}`

## PUT /api/contacts/:id
Wijzigt alleen een contact dat bij de ingelogde gebruiker hoort.

Response: `{"contact": { ...bijgewerkt contact... }}`

## DELETE /api/contacts/:id
Verwijdert alleen een contact dat bij de ingelogde gebruiker hoort.

Response: `{"ok": true}`

## Database mapping
Frontend -> database:
- entityType -> entity_type
- type -> contact_type
- name -> company_name
- contact -> contact_person
- factuurEmail -> invoice_email
- tel -> phone
- adres -> address
- postcode -> postal_code
- plaats -> city
- land -> country
- kvk -> kvk_number
- btw -> vat_number
- klantnr -> customer_number
- betaaltermijn -> payment_term_days
- notitie -> notes

## Vervolgkoppelingen
Later kunnen tabellen voor offertes, facturen, opdrachten en e-mail een `contact_id` foreign key gebruiken naar `vakento_contacts.id`.
