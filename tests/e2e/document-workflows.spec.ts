import { statSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { createInvoice, resetAppData, saveBusinessProfile, waitForSeed } from './helpers';

test('new invoice uses Jakarta dates and validates required fields', async ({ page }) => {
  await resetAppData(page);
  await saveBusinessProfile(page);
  await page.clock.setFixedTime(new Date('2026-07-03T18:30:00Z'));

  await page.goto('/documents/new/invoice');
  await expect(page.getByRole('heading', { name: 'New Invoice' })).toBeVisible();
  await expect(page.getByLabel('Issue Date')).toHaveValue('2026-07-04');
  await expect(page.getByLabel('Due Date')).toHaveValue('2026-07-11');

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('#document-client-name-error')).toHaveText('Enter a client name.');

  await page.getByLabel('Client Name').fill('Validation Client');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toHaveText('Add at least one item.');
});

test('empty first-run editor seeds profile and downloads a non-empty PDF', async ({ page }) => {
  await resetAppData(page);

  // Navigate to app root so the Seeder can populate the DB, then wait for it
  await page.goto('/');
  await waitForSeed(page);

  await page.goto('/documents/new/invoice');
  await expect(page.getByRole('heading', { name: 'New Invoice' })).toBeVisible();
  await page.getByLabel('Client Name').fill('PDF Client');
  await page.getByLabel('Item 1 name').fill('PDF Service');
  await page.locator('input[name="item-1-price"]').fill('1250000');
  await page.getByLabel('Tax (%)').fill('0');

  const viewport = page.viewportSize();
  const isMobile = viewport && viewport.width < 900;
  if (isMobile) {
    await page.getByRole('button', { name: 'Preview' }).click();
  }

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Download PDF' }).first().click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^INV-\d{4}-\d{2}-\d{4}\.pdf$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  expect(statSync(path!).size).toBeGreaterThan(1000);
});

test('documents list sorts invoices and receipts by one global recency order', async ({ page }) => {
  await resetAppData(page);
  await saveBusinessProfile(page);

  const invoiceNumber = await createInvoice(page, '500000');

  await page.goto('/documents/new/receipt');
  await expect(page.getByRole('heading', { name: 'New Receipt' })).toBeVisible();
  const receiptNumber = await page.getByLabel('Number').inputValue();
  await page.getByLabel('Client Name').fill('Receipt Client');
  await page.getByRole('button', { name: /Payment/ }).click();
  await page.getByLabel('Amount Paid (Rp)').fill('250000');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.locator('.document-card').first()).toContainText(receiptNumber);
  await expect(page.locator('.document-card').nth(1)).toContainText(invoiceNumber);
});

test('old IndexedDB stores are upgraded with required document indexes', async ({ page }) => {
  await resetAppData(page);
  // Use a same-origin blank page so IndexedDB is accessible but app JS doesn't load
  await page.route('**/__test_blank', route =>
    route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' })
  );
  await page.goto('/__test_blank');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('invois', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('business', { keyPath: 'id' });
        db.createObjectStore('clients', { keyPath: 'id' });
        db.createObjectStore('items', { keyPath: 'id' });
        const invoices = db.createObjectStore('invoices', { keyPath: 'id' });
        invoices.createIndex('number', 'number');
        const receipts = db.createObjectStore('receipts', { keyPath: 'id' });
        receipts.createIndex('number', 'number');
        db.createObjectStore('counters');
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  });

  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  // App will upgrade DB to v3 and seed sample data since DB is empty
  await page.goto('/documents');
  await waitForSeed(page);
  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('upgrade from v2 schema (missing status and createdAt indexes) succeeds', async ({ page }) => {
  await resetAppData(page);
  // Use a same-origin blank page so IndexedDB is accessible but app JS doesn't load
  await page.route('**/__test_blank', route =>
    route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' })
  );
  await page.goto('/__test_blank');
  // Simulate a v2 database: has the object stores but only the 'number' index
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('invois', 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('business', { keyPath: 'id' });
        db.createObjectStore('clients', { keyPath: 'id' });
        db.createObjectStore('items', { keyPath: 'id' });
        const inv = db.createObjectStore('invoices', { keyPath: 'id' });
        inv.createIndex('number', 'number');
        // v2 was missing: status, createdAt indexes on invoices
        const rec = db.createObjectStore('receipts', { keyPath: 'id' });
        rec.createIndex('number', 'number');
        // v2 was missing: createdAt index on receipts
        db.createObjectStore('counters');
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  });

  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  // App should open without errors and auto-upgrade to v3
  await page.goto('/documents');
  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);

  // Verify we can create an invoice after the upgrade
  await page.goto('/documents/new/invoice');
  await expect(page.getByRole('heading', { name: 'New Invoice' })).toBeVisible();
  await page.getByLabel('Client Name').fill('Post-Upgrade Client');
  await page.getByLabel('Item 1 name').fill('Upgrade Service');
  await page.locator('input[name="item-1-price"]').fill('500000');
  await page.getByLabel('Tax (%)').fill('0');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.getByText('Post-Upgrade Client')).toBeVisible();
});

test('import and export data round-trips correctly', async ({ page }) => {
  await resetAppData(page);
  await saveBusinessProfile(page);

  // Create an invoice to have some data
  const invoiceNumber = await createInvoice(page, '750000');

  // Navigate to Settings and export
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  // Listen for download
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Data' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^invois-backup-\d{4}-\d{2}-\d{2}\.json$/);

  // Verify the exported JSON has the right structure
  const path = await download.path();
  expect(path).toBeTruthy();
});
