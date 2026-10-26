import { test, expect } from '@playwright/test';

test.describe('Publieke Vakento calculators', () => {
  test.beforeEach(async ({ page }) => {
    // Zorg dat deze tests zonder betaald account draaien.
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    );
  });

  test('homepage verwijst naar drie calculators @smoke', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Gratis calculators', exact: true })).toHaveAttribute('href', '/calculators.html');
    await expect(page.getByRole('link', { name: 'Doe 2 berekeningen gratis' })).toHaveAttribute('href', '/calculators.html');
  });

  test('twee gratis berekeningen verdeeld over alle drie, daarna lid worden @smoke', async ({ page }) => {
    await page.goto('/calculators.html');
    await expect(page.getByRole('heading', { name: 'Uurtarief berekenen' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Offerteprijs berekenen' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kluswinst berekenen' })).toBeVisible();

    await expect(page.locator('#remaining')).toContainText('Nog 2 gratis berekeningen');
    await page.getByRole('button', { name: 'Bereken mijn uurtarief' }).click();
    await expect(page.locator('#hour-form + .result')).toContainText('€\u00a044,00');
    await expect(page.locator('#remaining')).toContainText('Nog 1 gratis berekening');

    await page.getByRole('button', { name: 'Bereken offerteprijs' }).click();
    await expect(page.locator('#quote-form + .result')).toContainText('1.790,86');
    await expect(page.locator('#remaining')).toContainText('Je 2 gratis berekeningen zijn gebruikt');
    await expect(page.locator('#member-gate')).toBeVisible();
    await expect(page.locator('#member-gate').getByRole('link', { name: 'Lid worden' }))
      .toHaveAttribute('href', '/account.html?mode=register&lang=nl');
    await expect(page.getByRole('button', { name: 'Bereken kluswinst' })).toBeDisabled();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Bereken mijn uurtarief' })).toBeDisabled();
    await expect(page.locator('#member-gate')).toBeVisible();
  });

  test('kluswinst berekent arbeidskosten, marge en verlies correct @smoke', async ({ page }) => {
    await page.goto('/calculators.html');
    await page.getByRole('button', { name: 'Bereken kluswinst' }).click();
    await expect(page.locator('#profit-form + .result')).toContainText('€\u00a0890,00');
    await expect(page.locator('#profit-form + .result')).toContainText('49,4%');

    await page.locator('#profit-turnover').fill('500');
    await page.getByRole('button', { name: 'Bereken kluswinst' }).click();
    await expect(page.locator('#profit-form + .result')).toContainText('-€\u00a0410,00');
  });

  test('ongeldige invoer verbruikt geen gratis berekening @smoke', async ({ page }) => {
    await page.goto('/calculators.html');
    await page.locator('#hour-billable').fill('0');
    await page.getByRole('button', { name: 'Bereken mijn uurtarief' }).click();
    await expect(page.locator('#hour-form .error')).toContainText('Factureerbare uren moeten hoger zijn dan nul');
    await expect(page.locator('#remaining')).toContainText('Nog 2 gratis berekeningen');
  });

  test('klein scherm: alle calculators blijven bruikbaar @smoke', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/calculators.html');
    await expect(page.getByRole('button', { name: 'Bereken kluswinst' })).toBeVisible();
    const isOverflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(isOverflowing).toBe(false);
  });

  test('betaald account mag ook na twee berekeningen blijven rekenen @smoke', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"paid":true}' })
    );
    await page.goto('/calculators.html');
    await expect(page.locator('#remaining')).toContainText('Vakento-lid: onbeperkt rekenen');
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Bereken kluswinst' }).click();
    }
    await expect(page.locator('#member-gate')).toBeHidden();
  });
});
