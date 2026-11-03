import { test, expect } from '@playwright/test';

// Draait uitsluitend tegen een lokale server en een tijdelijke browser.
test('beschadigde administratie wordt niet stilzwijgend gewist @ci', async ({ page }) => {
  const address = new URL(process.env.VAKENTO_BASE_URL || '');
  expect(['127.0.0.1', 'localhost']).toContain(address.hostname);
  await page.goto('/');
  const result = await page.evaluate(async () => {
    sessionStorage.setItem('vakento.uid', 'ci-corruption-test');
    const key = 'vakento.v3.ci-corruption-test';
    const original = '{ci-beschadigd';
    localStorage.setItem(key, original);
    const { load } = await import('/js/store.js');
    let errorShown = false;
    try { load(); } catch (error) { errorShown = /beschadigd|onleesbaar/i.test(String(error.message)); }
    const unchanged = localStorage.getItem(key) === original;
    localStorage.removeItem(key);
    return { errorShown, unchanged };
  });
  expect(result.errorShown).toBe(true);
  expect(result.unchanged).toBe(true);
});
