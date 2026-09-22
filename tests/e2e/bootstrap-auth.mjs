import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VAKENTO_BASE_URL || 'https://vakento.nl';
const email = process.env.VAKENTO_TEST_EMAIL || '';
const password = process.env.VAKENTO_TEST_PASSWORD || '';

async function main() {
  if (!email || !password) {
    console.error('E-mail en wachtwoord ontbreken.');
    return 2;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(new URL('/account.html', baseURL).href, { waitUntil: 'domcontentloaded' });
    const login = page.locator('[data-login]');
    await login.locator('input[name="email"]').fill(email);
    await login.locator('input[name="password"]').fill(password);
    await login.locator('button[type="submit"]').click();

    const loginError = login.locator('[data-err]');
    await Promise.race([
      page.waitForURL(/\/werk\.html(?:$|#|\?)/, { timeout: 12_000 }).catch(() => null),
      loginError.waitFor({ state: 'visible', timeout: 12_000 }).catch(() => null),
    ]);

    if (await loginError.isVisible().catch(() => false)) {
      const msg = (await loginError.innerText().catch(() => '')).trim();
      console.error('Vakento login mislukt: ' + (msg || 'onbekende loginfout'));
      return 3;
    }

    await page.waitForURL(/\/werk\.html(?:$|#|\?)/, { timeout: 15_000 });
    await mkdir('.auth', { recursive: true });
    await context.storageState({ path: '.auth/vakento.json' });
    console.log('OK - vertrouwde Vakento testsessie opgeslagen in .auth/vakento.json');
    return 0;
  } finally {
    await browser.close();
  }
}

const rc = await main();
if (rc) process.exit(rc);
