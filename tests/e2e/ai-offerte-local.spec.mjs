import { test, expect } from '@playwright/test';

const KEY = 'vakento.v3.ai-offerte-test';

async function openEditor(page, { backend = 'ai' } = {}) {
  await page.route('**/api/me?**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: 'ai-offerte-test', name: 'Testbedrijf', paid: true })
  }));
  await page.route('**/api/brein', route => {
    if (backend === 'offline') {
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        bron: 'ai+vakverstand',
        regels: [
          { tekst: 'Plafond spuiten', aantal: 44, eenheid: 'm²', stukprijs: 9999 },
          { tekst: 'Arbeid', aantal: 8, eenheid: 'uur', stukprijs: 9999 }
        ]
      })
    });
  });
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({
      firm: 'Testbedrijf', place: 'Winterswijk',
      ploeg: [{ id: 'p1', name: 'Testschilder', role: 'Baas' }],
      klanten: [{ id: 'c1', name: 'Testklant', plaats: 'Winterswijk' }],
      klussen: [], offertes: [], facturen: [], uren: [], inzet: [], materiaal: [],
      artikelen: [{ id: 'a1', naam: 'Arbeid', prijs: 65, eenheid: 'uur' }],
      papier: { adres: '', postcode: '', plaats: 'Winterswijk', tel: '', mail: '', kvk: '', btw: '', iban: '', logo: '', voet: '' }
    }));
  }, KEY);
  await page.goto('/offertes.html', { waitUntil: 'domcontentloaded' });
  const form = page.locator('form[data-offerte-editor]');
  await expect(form).toBeVisible();
  await form.locator('button[data-offer-mode="ai"]').click();
  await expect(form.locator('[data-offer-ai-panel]')).toBeVisible();
  return form;
}

test('AI-offerte: eigen tarief, 9% btw en opslag van concept @quote-browser', async ({ page }) => {
  const form = await openEditor(page);
  await form.locator('textarea[name="vraag"]').fill('plafond 44 m² spuiten; muren 42 m² schilderen');
  await form.locator('input[name="aiUurtarief"]').fill('50');
  await form.locator('input[name="aiVoorrijden"]').fill('25');
  await form.locator('select[name="btwCategorie"]').selectOption('schilder9');
  await form.locator('button[data-offer-ai]').click();
  await expect(form.locator('[data-offer-lines] [data-offer-line]')).toHaveCount(3);
  await expect(form.locator('button[data-offer-ai]')).toBeEnabled();
  await form.locator('button[type="submit"]').click();
  const result = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(result.offertes).toHaveLength(1);
  const offer = result.offertes[0];
  expect(offer.status).toBe('concept');
  const labour = offer.regels.find(r => r.eenheid === 'uur');
  expect(labour.aantal).toBe(8);
  expect(labour.stukprijs).toBe(50);
  const work = offer.regels.find(r => r.eenheid === 'm²');
  expect(work.stukprijs).toBe(0); // AI prijs 9999 wordt genegeerd
  const travel = offer.regels.find(r => /Voorrijkosten/.test(r.tekst));
  expect(travel.stukprijs).toBe(25);
  expect(offer.regels.every(r => r.btw === 9 && !r.btwVerlegd)).toBe(true);
  expect(Math.round(offer.regels.reduce((sum, r) => sum + r.bedrag, 0) * 100) / 100).toBe(425);
});

test('AI-server uitval: bewerkbaar concept met btw verlegd @quote-browser', async ({ page }) => {
  const form = await openEditor(page, { backend: 'offline' });
  await form.locator('textarea[name="vraag"]').fill('3 deuren schilderen; 4 uur arbeid');
  await form.locator('input[name="aiUurtarief"]').fill('60');
  await form.locator('input[name="aiVoorrijden"]').fill('0');
  await form.locator('select[name="btwCategorie"]').selectOption('verlegd');
  await form.locator('button[data-offer-ai]').click();
  await expect(form.locator('button[data-offer-ai]')).toBeEnabled();
  const rows = form.locator('[data-offer-lines] [data-offer-line]');
  await expect(rows).toHaveCount(2);
  await rows.first().locator('[name="regel_tekst"]').fill('Drie binnendeuren schilderen');
  await form.locator('button[type="submit"]').click();
  const result = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(result.offertes).toHaveLength(1);
  const o = result.offertes[0];
  expect(o.regels.every(r => r.btwVerlegd === true && r.btw === 0)).toBe(true);
  expect(o.regels.find(r => r.eenheid === 'uur').stukprijs).toBe(60);
  expect(o.regels.find(r => r.eenheid === 'uur').aantal).toBe(4);
  expect(o.regels[0].tekst).toBe('Drie binnendeuren schilderen');
});
