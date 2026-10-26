import { test, expect } from '@playwright/test';

test.describe('Schilderwerk en kluscalculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/me', route => route.fulfill({status:401,contentType:'application/json',body:'{}'}));
  });

  test('schilderwerk calculator beschikbaar op homepage @smoke', async ({page}) => {
    await page.goto('/');
    await expect(page.getByRole('link',{name:'Bereken schilder- en kluswerk'})).toHaveAttribute('href','/schilder-en-kluscalculator.html');
  });

  test('muren, plafonds, kozijnen, deuren en houtrot en drie gratis calculaties @smoke',async ({page}) => {
    await page.goto('/schilder-en-kluscalculator.html');
    for(const title of ['Muren schilderen','Plafonds schilderen','Kozijnen schilderen','Deuren schilderen','Houtrot herstellen']) {
      await expect(page.getByText(title,{exact:true})).toBeVisible();
    }
    await expect(page.locator('#remaining')).toContainText('Nog 3 gratis berekeningen');
    await page.getByRole('button',{name:'Bereken mijn klus'}).click();
    await expect(page.locator('#result')).toBeVisible();
    await expect(page.locator('#sumHours')).toContainText('9 uur');
    await expect(page.locator('#sumPaint')).toContainText('9,78 liter');
    await expect(page.locator('#remaining')).toContainText('Nog 1 gratis berekening');
    await page.getByRole('button',{name:'Bereken mijn klus'}).click();
    await expect(page.locator('#remaining')).toContainText('Nog 1 gratis berekening');
    await page.getByRole('button',{name:'Bereken mijn klus'}).click();
    await expect(page.locator('#remaining')).toContainText('Je 3 gratis berekeningen zijn gebruikt');
    await expect(page.getByRole('button',{name:'Bereken mijn klus'})).toBeDisabled();
    await expect(page.locator('#member-gate').getByRole('link',{name:'Lid worden'})).toHaveAttribute('href','/account.html?mode=register&lang=nl');
    await page.reload();
    await expect(page.getByRole('button',{name:'Bereken mijn klus'})).toBeDisabled();
  });

  test('mix van 9 en 21 procent belasting en houtrot @smoke',async ({page}) => {
    await page.goto('/schilder-en-kluscalculator.html');
    await page.locator('[data-kind="rot"] [name="include"]').check();
    await page.locator('[data-kind="walls"] [name="vat"]').selectOption('9');
    await page.getByRole('button',{name:'Bereken mijn klus'}).click();
    await expect(page.locator('#resultRows tr')).toHaveCount(3);
    await expect(page.locator('#vat9Total')).not.toHaveText('€ 0,00');
    await expect(page.locator('#vat21Total')).not.toHaveText('€ 0,00');
  });

  test('ongeldige waarde verbruikt geen gratis gebruik @smoke',async ({page}) => {
    await page.goto('/schilder-en-kluscalculator.html');
    await page.locator('[data-kind="walls"] [name="coverage"]').fill('0');
    await page.getByRole('button',{name:'Bereken mijn klus'}).click();
    await expect(page.locator('#error')).not.toBeEmpty();
    await expect(page.locator('#remaining')).toContainText('Nog 3 gratis berekeningen');
  });

  test('quota wordt gedeeld met gewone calculators @smoke',async ({page}) => {
    await page.goto('/calculators.html');
    await page.getByRole('button',{name:'Bereken kluswinst'}).click();
    await page.goto('/schilder-en-kluscalculator.html');
    await expect(page.locator('#remaining')).toContainText('Nog 2 gratis berekeningen');
  });

  test('mobiele weergave past zonder horizontale overflow @smoke', async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await page.goto('/schilder-en-kluscalculator.html');
    await expect(page.getByRole('button',{name:'Bereken mijn klus'})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
