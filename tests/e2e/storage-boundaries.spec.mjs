import { test, expect } from '@playwright/test';

// Alleen lokale browserprofielen. Deze controle raakt geen Vakento-account of live API.
test('browseropslag blijft behouden bij herladen maar synchroniseert niet vanzelf @ci', async ({ browser }) => {
  const baseURL = process.env.VAKENTO_BASE_URL || '';
  const address = new URL(baseURL);
  expect(['localhost', '127.0.0.1']).toContain(address.hostname);

  const firstContext = await browser.newContext();
  const otherContext = await browser.newContext();
  try {
    const firstPage = await firstContext.newPage();
    await firstPage.goto(baseURL);
    await firstPage.evaluate(async () => {
      sessionStorage.setItem('vakento.uid', 'ci-gebruiker-sync-test');
      const { load, save } = await import('/js/store.js');
      const data = load();
      data.firm = 'CI Tijdelijk Bedrijf';
      data.klanten.push({ id: 'ci-test-123', name: 'CI Testklant' });
      save(data);
    });
    await firstPage.reload();
    const preserved = await firstPage.evaluate(async () => {
      const { load } = await import('/js/store.js');
      return load().klanten.some(k => k.id === 'ci-test-123');
    });
    expect(preserved).toBe(true);

    const otherPage = await otherContext.newPage();
    await otherPage.goto(baseURL);
    const visibleOnOtherDevice = await otherPage.evaluate(async () => {
      sessionStorage.setItem('vakento.uid', 'ci-gebruiker-sync-test');
      const { load } = await import('/js/store.js');
      return load().klanten.some(k => k.id === 'ci-test-123');
    });
    // Laat zien dat browseropslag op zichzelf geen synchronisatie tussen apparaten biedt.
    expect(visibleOnOtherDevice).toBe(false);
  } finally {
    await firstContext.close();
    await otherContext.close();
  }
});
