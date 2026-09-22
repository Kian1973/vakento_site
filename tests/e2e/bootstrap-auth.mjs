import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.VAKENTO_BASE_URL || 'https://vakento.nl';
const email = process.env.VAKENTO_TEST_EMAIL || '';
const password = process.env.VAKENTO_TEST_PASSWORD || '';
const code = process.env.VAKENTO_TEST_2FA_CODE || '';

if (!email || !password) {
  console.error('E-mail en wachtwoord ontbreken.');
  process.exit(2);
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

  await Promise.race([
    page.waitForURL(/\/werk\.html(?:$|#|\?)/, { timeout: 10_000 }).catch(() => null),
    page.locator('[data-login-2fa]').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null),
  ]);

  if (await page.locator('[data-login-2fa]').isVisible().catch(() => false)) {
    if (!code) {
      console.error('VAKENTO_2FA_REQUIRED');
      process.exitCode = 42;
      return;
    }
    const form = page.locator('[data-login-2fa]');
    const trust = form.locator('input[name="trustDevice"]');
    if (await trust.count()) await trust.check();
    await form.locator('input[name="code"]').fill(code);
    await form.locator('button[type="submit"]').click();
  }

  await page.waitForURL(/\/werk\.html(?:$|#|\?)/, { timeout: 15_000 });
  await mkdir('.auth', { recursive: true });
  await context.storageState({ path: '.auth/vakento.json' });
  console.log('OK - vertrouwde Vakento testsessie opgeslagen in .auth/vakento.json');
} finally {
  await browser.close();
}
