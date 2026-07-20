import { expect, type Page } from '@playwright/test';

export function escaped(text: string) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '$&'));
}

export async function resetAppData(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('invois');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(request.error?.message || 'Failed to delete database'));
      request.onblocked = () => resolve();
    });
  });
}

export async function saveBusinessProfile(page: Page) {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByLabel('Business Name *').fill('CI Studio');
  await page.getByLabel('Bank Name').fill('Bank CI');
  await page.getByLabel('Account Number').fill('1234567890');
  await page.getByLabel('Account Holder').fill('CI Studio');
  await page.getByRole('button', { name: 'Save Settings' }).click();
  await expect(page.getByText('Settings saved.')).toBeVisible();
}

export async function createInvoice(page: Page, total = '1000000') {
  await page.goto('/documents/new/invoice');
  await expect(page.getByRole('heading', { name: 'New Invoice' })).toBeVisible();
  const invoiceNumber = await page.getByLabel('Number').inputValue();

  await page.getByLabel('Client Name').fill('CI Client');
  await page.getByLabel('Item 1 name').fill('CI Service');
  await page.locator('input[name="item-1-price"]').fill(total);
  await page.getByLabel('Tax (%)').fill('0');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.getByText(invoiceNumber, { exact: true }).first()).toBeVisible();
  return invoiceNumber;
}

export async function openDocument(page: Page, number: string) {
  await page.getByRole('link', { name: escaped(number) }).click();
  await expect(page.getByRole('heading', { name: number })).toBeVisible();
}

/** Wait for the Seeder to finish populating the DB. */
function checkSeed(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('invois');
    req.onsuccess = () => {
      const db = req.result;
      const cnt = db.transaction('business', 'readonly').objectStore('business').count();
      cnt.onsuccess = () => { resolve(cnt.result > 0); db.close(); };
    };
    req.onerror = () => reject(new Error(req.error?.message ?? 'IDB open failed'));
  });
}
export async function waitForSeed(page: Page) {
  await page.waitForFunction(checkSeed);
}
