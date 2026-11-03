import { test, expect } from '@playwright/test';

// Deze tests gebruiken alleen de lokale statische webserver en tijdelijke browsersessies.
// Er worden geen live accounts, API's, VPS-verbindingen of klantgegevens gebruikt.
test.describe('Lokale veilige GitHub Actions-controles', () => {
  test.beforeEach(async ({ page }) => {
    const url = new URL(test.info().project.use.baseURL);
    expect(['127.0.0.1', 'localhost']).toContain(url.hostname);
    await page.goto('/');
  });

  test('openbare basisbestanden zijn bereikbaar @ci', async ({ request }) => {
    for (const path of ['/', '/index.html', '/werk.html', '/app.html',
      '/js/store.js', '/js/app.js', '/manifest.webmanifest', '/sw.js']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
    }
  });

  test('browseropslag heeft aparte sleutels per gebruikers-ID @ci', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { load, save } = await import('/js/store.js');
      sessionStorage.setItem('vakento.uid', 'ci-test-gebruiker-a');
      const first = load();
      first.firm = 'CI Bedrijf A';
      first.klanten.push({ id: 'ci-a', name: 'CI Testklant A' });
      save(first);
      sessionStorage.setItem('vakento.uid', 'ci-test-gebruiker-b');
      const second = load();
      const isolated = !second.klanten.some(k => k.id === 'ci-a');
      second.firm = 'CI Bedrijf B';
      save(second);
      sessionStorage.setItem('vakento.uid', 'ci-test-gebruiker-a');
      const restored = load();
      const preserved = restored.klanten.some(k => k.id === 'ci-a');
      localStorage.removeItem('vakento.v3.ci-test-gebruiker-a');
      localStorage.removeItem('vakento.v3.ci-test-gebruiker-b');
      return { isolated, preserved };
    });
    expect(result.isolated).toBe(true);
    expect(result.preserved).toBe(true);
  });
});
