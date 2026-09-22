import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';

const BASE_URL = process.env.VAKENTO_BASE_URL || 'https://vakento.nl';
const EMAIL = process.env.VAKENTO_TEST_EMAIL || '';
const PASSWORD = process.env.VAKENTO_TEST_PASSWORD || '';
const ALLOW_WRITE = process.env.VAKENTO_ALLOW_WRITE_TESTS === '1';
const HAS_AUTH_STATE = existsSync('.auth/vakento.json');


async function login(page) {
  if (HAS_AUTH_STATE) {
    const me = await page.context().request.get(new URL('/api/me', BASE_URL).href);
    const user = await me.json().catch(() => ({}));
    if (user?.email && user?.paid) {
      await page.goto('/werk.html', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#stage')).toBeVisible();
      await expect(page.locator('#stage')).not.toContainText('Vakento kon dit onderdeel niet laden');
      return;
    }
    if (!EMAIL || !PASSWORD) {
      throw new Error('De bewaarde vertrouwde testsessie is verlopen. Voer bootstrap-vakento-auth.sh opnieuw uit.');
    }
  }

  await page.goto('/account.html', { waitUntil: 'domcontentloaded' });
  const login = page.locator('[data-login]');
  await expect(login).toBeVisible();
  await login.locator('input[name="email"]').fill(EMAIL);
  await login.locator('input[name="password"]').fill(PASSWORD);
  await login.locator('button[type="submit"]').click();

  const loginError = login.locator('[data-err]');

  await Promise.race([
    page.waitForURL(/\/werk\.html(?:$|#|\?)/, { timeout: 12_000 }).catch(() => null),
    loginError.waitFor({ state: 'visible', timeout: 12_000 }).catch(() => null),
  ]);

  if (await loginError.isVisible().catch(() => false)) {
    const msg = (await loginError.innerText().catch(() => '')).trim();
    throw new Error('Vakento login mislukt: ' + (msg || 'onbekende loginfout'));
  }

  await page.waitForURL(/\/werk\.html(?:$|#|\?)/, { timeout: 15_000 });  await expect(page.locator('#stage')).toBeVisible();
  await expect(page.locator('#stage')).not.toContainText('Vakento kon dit onderdeel niet laden');
}

async function cleanupLocalTestData(page, runId, contactId) {
  await page.evaluate(({ runId, contactId }) => {
    const uid = sessionStorage.getItem('vakento.uid') || '';
    const key = uid ? `vakento.v3.${uid}` : 'vakento.v3';
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const d = JSON.parse(raw);
    const testJobIds = new Set((d.klussen || []).filter((x) => String(x.title || '').includes(runId)).map((x) => x.id));
    const testOfferIds = new Set((d.offertes || []).filter((x) => String(x.titel || '').includes(runId) || testJobIds.has(x.klus)).map((x) => x.id));
    d.klanten = (d.klanten || []).filter((x) => String(x.id) !== String(contactId) && !String(x.name || '').includes(runId));
    d.klussen = (d.klussen || []).filter((x) => !testJobIds.has(x.id));
    d.offertes = (d.offertes || []).filter((x) => !testOfferIds.has(x.id) && !testJobIds.has(x.klus));
    d.facturen = (d.facturen || []).filter((x) => !testJobIds.has(x.klus) && !String(x.titel || '').includes(runId));
    d.uren = (d.uren || []).filter((x) => !testJobIds.has(x.klus) && !String(x.note || '').includes(runId));
    d.inzet = (d.inzet || []).filter((x) => !testJobIds.has(x.klus));
    d.bonnen = (d.bonnen || []).filter((x) => !testJobIds.has(x.klus) && !String(x.tekst || '').includes(runId));
    localStorage.setItem(key, JSON.stringify(d));
  }, { runId, contactId });
}

test.describe('Vakento publieke controle', () => {
  test('homepage, account, assets en 404 @smoke', async ({ page, request }) => {
    const home = await request.get('/');
    expect(home.status()).toBe(200);
    const account = await request.get('/account.html');
    expect(account.status()).toBe(200);

    for (const path of [
      '/js/api.js',
      '/js/app.js',
      '/js/pay.js',
      '/js/brein.js',
      '/js/cloud.js',
      '/css/vakento.css',
      '/manifest.webmanifest',
      '/sw.js',
    ]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
    }

    const missing = await request.get('/playwright-bestaat-niet-987654321');
    expect(missing.status()).toBe(404);

    await page.goto('/');
    await expect(page).toHaveTitle(/Vakento/i);
    await expect(page.getByText('Vakento', { exact: false }).first()).toBeVisible();
  });

  test('oude mailbox is niet meer openbaar aanwezig @smoke', async ({ request, page }) => {
    const targets = ['/', '/app.html', '/js/app.js', '/js/max.js', '/js/pay.js'];
    const banned = /#\/post|viewPost|readInbox|\/api\/mail\/stuur|\/api\/mail\/inbox|\/api\/mailbox\/create|Vakento-mail|2 GB mailbox/i;
    for (const path of targets) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(await res.text(), path).not.toMatch(banned);
    }

    await page.goto('/werk.html#/post', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    expect(page.url()).not.toContain('#/post');
  });
});

test.describe('Vakento volledige gebruikersflow', () => {
  test.skip(!ALLOW_WRITE || (!HAS_AUTH_STATE && (!EMAIL || !PASSWORD)),
    'Volledige schrijftest vereist VAKENTO_ALLOW_WRITE_TESTS=1 en een bewaarde testsessie of testlogin.');

  test('contact -> klus -> portal -> uren -> factuur -> cloud -> app -> AI -> uitloggen @full', async ({ page, browser }) => {

    const runId = `AUTO-${Date.now()}`;
    const contactName = `${runId} Klant`;
    const jobTitle = `${runId} Functionele controle`;
    const cloudFolder = `${runId}-cloud`;
    let contactId = '';
    let cloudPad = '';

    await login(page);

    try {
      await test.step('Contact aanmaken en na refresh terugvinden', async () => {
        await page.goto('/werk.html#/contacten');
        await expect(page.getByRole('heading', { name: 'Contacten' })).toBeVisible();
        await page.locator('[data-contact-new]').click();
        const form = page.locator('[data-contact-form]');
        await expect(form).toBeVisible();
        await form.locator('input[name="name"]').fill(contactName);
        await form.locator('input[name="plaats"]').fill('Winterswijk');
        await form.locator('input[name="email"]').fill(`test+${Date.now()}@example.com`);
        await form.locator('button[type="submit"]').click();
        const row = page.locator('[data-contact-row]').filter({ hasText: contactName });
        await expect(row).toBeVisible();
        contactId = await row.getAttribute('data-id') || '';
        expect(contactId).not.toBe('');
        await page.reload();
        await expect(page.locator('[data-contact-row]').filter({ hasText: contactName })).toBeVisible();
      });

      await test.step('Klus aanmaken en lokaal bewaren', async () => {
        await page.goto('/werk.html#/klussen');
        page.once('dialog', async (dialog) => {
          if (dialog.type() === 'prompt') await dialog.accept(jobTitle);
          else await dialog.dismiss();
        });
        await page.locator('[data-act="klus"]').click();
        await expect(page.locator('article.item').filter({ hasText: jobTitle })).toBeVisible();
        await page.reload();
        await expect(page.locator('article.item').filter({ hasText: jobTitle })).toBeVisible();
      });

      await test.step('Klantportaal werkt ook in een schoon browservenster', async () => {
        const article = page.locator('article.item').filter({ hasText: jobTitle });
        const href = await article.locator('a[href^="klant.html?t="]').getAttribute('href');
        expect(href).toBeTruthy();

        const portal = await browser.newContext();
        const customer = await portal.newPage();
        try {
          await customer.goto(new URL(href, BASE_URL).href, { waitUntil: 'domcontentloaded' });
          await expect.soft(customer.getByRole('heading', { name: jobTitle }),
            'Klantportaal moet op een andere telefoon/browser dezelfde klus tonen.').toBeVisible();
          await expect.soft(customer.getByText('Deze link klopt niet.'),
            'Als deze tekst verschijnt, staat het klantportaal nog alleen in lokale browseropslag.').toHaveCount(0);
        } finally {
          await portal.close();
        }
      });

      await test.step('Uren boeken', async () => {
        await page.goto('/werk.html#/uren');
        const form = page.locator('form[data-uren]');
        await form.locator('select[name="klus"]').selectOption({ label: jobTitle });
        await form.locator('input[name="uren"]').fill('1');
        await form.locator('input[name="note"]').fill(`${runId} testuur`);
        await form.locator('button[type="submit"]').click();
        await expect(page.getByText(`${runId} testuur`, { exact: false })).toBeVisible();
      });

      await test.step('Factuur maken voor de testklus', async () => {
        await page.goto('/werk.html#/klussen');
        const article = page.locator('article.item').filter({ hasText: jobTitle });
        await article.locator('[data-factuur]').click();
        await page.waitForURL(/#\/papier/);
        await expect(page.getByText(jobTitle, { exact: false }).last()).toBeVisible();
      });

      await test.step('AI-offerte maken', async () => {
        await page.goto('/werk.html#/papier');
        const before = await page.locator('article.offer-vat-card').count();
        const form = page.locator('form[data-ai-offerte]');
        await form.locator('select[name="klant"]').selectOption(contactId);
        await form.locator('textarea[name="vraag"]').fill(`${runId} schilderwerk testwand 10 m2`);
        await form.locator('button[type="submit"]').click();
        await expect.poll(async () => page.locator('article.offer-vat-card').count(), { timeout: 30_000 }).toBeGreaterThan(before);
      });

      await test.step('Cloud map, upload en verwijderen', async () => {
        await page.goto('/werk.html#/cloud');
        const form = page.locator('form[data-map]');
        await expect(form).toBeVisible();
        await form.locator('input[name="naam"]').fill(cloudFolder);
        await form.locator('button[type="submit"]').click();
        await expect(page.locator('.cloud-crumbs')).toContainText(cloudFolder);
        cloudPad = new URL(page.url()).hash.split('?pad=')[1] || '';
        await page.locator('[data-up]').setInputFiles({
          name: `${runId}.txt`,
          mimeType: 'text/plain',
          buffer: Buffer.from(`Vakento Playwright test ${runId}`),
        });
        await expect(page.locator('.cloud-tile').filter({ hasText: `${runId}.txt` })).toBeVisible();
      });

      await test.step('Boekhouderspakket download', async () => {
        await page.goto('/werk.html#/boekhouding');
        const downloadPromise = page.waitForEvent('download');
        await page.locator('[data-book-export]').click();
        const download = await downloadPromise;
        expect(await download.suggestedFilename()).toMatch(/Vakento|verkoopboek/i);
      });

      await test.step('Mobiele app: werkfoto simuleren', async () => {
        await page.goto('/app.html#werkfoto');
        const form = page.locator('form[data-photo-form]');
        await expect(form).toBeVisible();
        await form.locator('input[name="job"]').fill(jobTitle);
        await form.locator('input[name="note"]').fill(`${runId} foto`);
        const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
        await page.locator('[data-photo-file]').setInputFiles({ name: `${runId}.png`, mimeType: 'image/png', buffer: tinyPng });
        await form.locator('button[type="submit"]').click();
        await expect(page.locator('[data-photo-status]')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('[data-photo-status]')).toContainText(/opgeslagen|klaar|cloud/i);
      });

      await test.step('AI-assistent antwoordt', async () => {
        await page.goto('/werk.html#/brein');
        const form = page.locator('form[data-ai-vraag]');
        await form.locator('textarea[name="vraag"]').fill(`Geef een korte testomschrijving voor ${runId}`);
        await form.locator('button[type="submit"]').click();
        await expect(page.locator('#brein-out')).toBeVisible();
        await expect.poll(async () => (await page.locator('#brein-out').innerText()).trim().length, { timeout: 30_000 }).toBeGreaterThan(10);
      });

      await test.step('Wachtwoord vergeten UI en uitloggen', async () => {
        await page.goto('/logout.html');
        await page.waitForURL(/\/account\.html/);
        await page.goto('/account.html');
        await expect(page.locator('[data-login-view]')).toBeVisible();
        await page.locator('[data-forgot-open]').click();
        const forgot = page.locator('[data-forgot]');
        await forgot.locator('input[name="email"]').fill(EMAIL);
        await forgot.locator('button[type="submit"]').first().click();
        await expect(forgot.locator('[data-forgot-msg]')).toContainText(/herstellink|bekend/i);
      });
    } finally {
      if (page.url().includes('/account.html')) {
        await login(page).catch(() => {});
      }

      if (page.url().includes('/werk.html')) {
        if (cloudPad) {
          await page.evaluate(async (pad) => {
            try {
              await fetch('/api/cloud', {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pad: decodeURIComponent(pad) }),
              });
            } catch (_) {}
          }, cloudPad);
        }
        if (contactId) {
          await page.evaluate(async (id) => {
            try {
              await fetch('/api/contacts/' + encodeURIComponent(id), {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
              });
            } catch (_) {}
          }, contactId);
        }
        await cleanupLocalTestData(page, runId, contactId).catch(() => {});
      }
    }
  });
});
