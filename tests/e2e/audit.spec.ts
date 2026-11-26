import { expect, test, type Page } from '@playwright/test';
import { createInvoice, openDocument, saveBusinessProfile, startAt, startWithProfile } from './helpers';

async function removeSeededSamples(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: 'Remove sample data' });
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toBeHidden();
}

async function overflowOffenders(page: Page, ignore: string[]): Promise<string[]> {
  return page.evaluate((selectors) => {
    const doc = document.documentElement;
    return Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter(el => !selectors.some(selector => el.closest(selector)))
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && (rect.right > doc.clientWidth + 1 || rect.left < -1);
      })
      .slice(0, 8)
      .map(el => `${el.tagName}.${el.className || 'none'}`);
  }, ignore);
}

test('theme control keeps color-scheme in sync', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await startAt(page, '/settings');

  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark');

  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light');

  await page.getByRole('button', { name: 'System', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light dark');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark');
});

test('documents empty state offers both document types', async ({ page }) => {
  await saveBusinessProfile(page);
  await removeSeededSamples(page);
  await page.goto('/documents');
  await expect(page.getByRole('heading', { name: 'No documents yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Invoice', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Receipt', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Create Receipt', exact: true }).click();
  await expect(page).toHaveURL('/documents/new/receipt');
  await expect(page.getByRole('heading', { name: 'New Receipt' })).toBeVisible();
});

test('receipt filter has its own empty state', async ({ page }) => {
  await saveBusinessProfile(page);
  await removeSeededSamples(page);
  await createInvoice(page);
  await page.goto('/documents?type=receipt');
  await expect(page.getByRole('heading', { name: 'No receipts yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Receipt', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download All' })).toBeVisible();
});

test('create sheet exposes a dialog name', async ({ page }) => {
  await startWithProfile(page, '/');
  await createInvoice(page);
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Create New' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Create Invoice' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
});

test('delete confirmation is described by its message', async ({ page }) => {
  await startWithProfile(page, '/');
  const number = await createInvoice(page);
  await openDocument(page, number);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-message');
  await expect(dialog.locator('#confirm-dialog-message')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
});

test('due date and discount errors are tied to their fields', async ({ page }) => {
  await startWithProfile(page, '/documents/new/invoice');
  await page.getByLabel('Client Name').fill('Audit Client');
  await page.getByLabel('Item 1 name').fill('Audit Service');
  await page.locator('input[name="item-1-price"]').fill('100000');
  await page.getByLabel('Tax (%)').fill('0');

  await page.getByLabel('Due Date').fill('2020-01-01');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('#due-date-error')).toHaveText('Due date cannot be before the issue date.');
  await expect(page.getByLabel('Due Date')).toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel('Due Date').fill('2026-12-31');
  await expect(page.locator('#due-date-error')).toBeHidden();

  await page.getByLabel('Discount (Rp)').fill('250000');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('#invoice-discount-error')).toHaveText('Discount cannot be more than the subtotal.');
  await expect(page.getByLabel('Discount (Rp)')).toHaveAttribute('aria-invalid', 'true');
});

test('critical screens reflow at 320px with 200% text', async ({ page }) => {
  test.setTimeout(90_000);
  await startWithProfile(page, '/');
  await createInvoice(page);
  await page.setViewportSize({ width: 320, height: 900 });

  const routes = ['/', '/dashboard', '/documents', '/clients', '/items', '/settings', '/documents/new/invoice'];
  for (const route of routes) {
    await page.goto(route);
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await expect(page.locator('h1').first()).toBeVisible();

    const offenders = await overflowOffenders(page, ['.bottom-nav', '.filter-row', '.pdf-table-wrap', '.l-preview-stage']);
    expect(offenders, `${route} overflows at 320px with 200% text`).toEqual([]);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth, `${route} document scrolls horizontally`).toBeLessThanOrEqual(321);
  }
});

test('bottom navigation scrolls to every item with 200% text', async ({ page, viewport }) => {
  test.setTimeout(60_000);
  test.skip((viewport?.width ?? 1280) >= 1024, 'bottom navigation is mobile-only');

  await startWithProfile(page, '/dashboard');
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });

  const nav = page.locator('.bottom-nav');
  const metrics = await nav.evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL('/settings');
});
