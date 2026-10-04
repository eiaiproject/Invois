import { expect, type Page } from '@playwright/test';

export function escaped(text: string) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`));
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

/** Reset stored data and land on a route in one step. */
export async function startAt(page: Page, path: string) {
  await resetAppData(page);
  await page.goto(path);
}

/** Reset stored data, save the business profile, then land on a route. */
export async function startWithProfile(page: Page, path: string) {
  await resetAppData(page);
  await saveBusinessProfile(page);
  await page.goto(path);
}

/** Landing hero plus the dashboard call to action. */
export async function openDashboardFromLanding(page: Page) {
  await startAt(page, '/');
  await expect(page.getByRole('heading', { name: /Create professional invoices and receipts/i })).toBeVisible();
  await page.getByRole('link', { name: 'Open dashboard' }).first().click();
  await expect(page).toHaveURL('/dashboard');
}

/** Click through navigation destinations in order, asserting each landing path. */
export async function followLinks(page: Page, destinations: ReadonlyArray<readonly [string, string]>) {
  const [destination, ...remaining] = destinations;
  if (!destination) return;
  const [name, path] = destination;
  await page.getByRole('link', { name }).click();
  await expect(page).toHaveURL(path);
  await followLinks(page, remaining);
}

/** Delete asks for confirmation in a dialog before it removes anything. */
export async function confirmDelete(page: Page) {
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
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

/** The labels that differ between the client and item catalog screens. */
export interface CatalogFlow {
  path: string;
  newHeading: string;
  addButton: string;
  searchPlaceholder: string;
  editHeading: string;
  created: string;
  updated: string;
}

/** The catalog screens the CRUD flow drives. */
export const CATALOGS: Record<'client' | 'item', CatalogFlow> = {
  client: {
    path: '/clients',
    newHeading: 'New Client',
    addButton: 'Add Client',
    searchPlaceholder: 'Search clients…',
    editHeading: 'Edit Client',
    created: 'Test Client',
    updated: 'Updated Client',
  },
  item: {
    path: '/items',
    newHeading: 'New Item',
    addButton: 'Add Item',
    searchPlaceholder: 'Search items…',
    editHeading: 'Edit Item',
    created: 'Test Service',
    updated: 'Updated Service',
  },
};

/** Create, search, and rename a catalog entry, asserting each catalog screen on the way. */
export async function runCatalogCrud(page: Page, flow: CatalogFlow, fillExtra?: (page: Page) => Promise<void>) {
  await startAt(page, `${flow.path}/new`);
  await expect(page.getByRole('heading', { name: flow.newHeading })).toBeVisible();
  await page.getByLabel('Name *').fill(flow.created);
  if (fillExtra) await fillExtra(page);
  await page.getByRole('button', { name: flow.addButton }).click();
  await expect(page).toHaveURL(flow.path);
  await expect(page.getByText(flow.created)).toBeVisible();

  await page.getByPlaceholder(flow.searchPlaceholder).fill(flow.created);
  await expect(page.getByText(flow.created)).toBeVisible();
  await page.getByPlaceholder(flow.searchPlaceholder).fill('NoMatch');
  await expect(page.getByText('No matches')).toBeVisible();

  await page.getByPlaceholder(flow.searchPlaceholder).fill('');
  await page.getByText(flow.created).click();
  await expect(page.getByRole('heading', { name: flow.editHeading })).toBeVisible();
  await page.getByLabel('Name *').fill(flow.updated);
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page).toHaveURL(flow.path);
  await expect(page.getByText(flow.updated)).toBeVisible();
}

/** Wait for the first-run seeder to finish populating sample records. */
function checkSeed(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('invois');
    req.onsuccess = () => {
      const db = req.result;
      const cnt = db.transaction('clients', 'readonly').objectStore('clients').count();
      cnt.onsuccess = () => { resolve(cnt.result > 0); db.close(); };
    };
    req.onerror = () => reject(new Error(req.error?.message ?? 'IDB open failed'));
  });
}
export async function waitForSeed(page: Page) {
  await page.waitForFunction(checkSeed);
}
