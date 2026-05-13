import { chromium } from 'playwright-core';

const routes = ['/', '/forms/summer-2026', '/sessions', '/participants', '/matching', '/drafts', '/audit'];
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
const page = await browser.newPage({ acceptDownloads: true });

for (const route of routes) {
  const response = await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
  if (!response || response.status() !== 200) {
    throw new Error(`${route} returned ${response?.status()}`);
  }
  await page.locator('h1').first().waitFor({ timeout: 5000 });

  const actions = await page.locator('button[data-action]').count();
  for (let index = 0; index < actions; index += 1) {
    const button = page.locator('button[data-action]').nth(index);
    const label = await button.getAttribute('data-action');
    const beforeUrl = page.url();
    const downloadPromise = page.waitForEvent('download', { timeout: 1000 }).catch(() => null);
    await button.click();
    await downloadPromise;
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.locator('button[aria-label="Close dialog"], button:has-text("Close")').first().click();
    }
    if (page.url() !== beforeUrl) {
      throw new Error(`${route} action ${label} unexpectedly navigated to ${page.url()}`);
    }
  }

  const internalLinks = await page.locator('a[href^="/"]').evaluateAll((links) =>
    [...new Set(links.map((link) => link.getAttribute('href')).filter(Boolean))]
  );
  for (const href of internalLinks) {
    const linkResponse = await page.request.get(`http://localhost:3000${href}`);
    if (linkResponse.status() >= 400) {
      throw new Error(`${route} has broken link ${href}: ${linkResponse.status()}`);
    }
  }

  console.log(`${route} ok - ${actions} action buttons tested, ${internalLinks.length} internal links checked`);
}

await browser.close();
