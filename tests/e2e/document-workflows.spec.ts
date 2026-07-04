import { statSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { createInvoice, resetAppData, saveBusinessProfile } from './helpers';

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

  await page.goto('/documents/new/invoice');
  await expect(page.getByRole('heading', { name: 'New Invoice' })).toBeVisible();
  await page.getByLabel('Client Name').fill('PDF Client');
  await page.getByLabel('Item 1 name').fill('PDF Service');
  await page.locator('input[name="item-1-price"]').fill('1250000');
  await page.getByLabel('Tax (%)').fill('0');

  const viewport = page.viewportSize();
  if (viewport && viewport.width < 900) {
    await page.getByRole('button', { name: 'Preview' }).click();
  }

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
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

  await page.goto('/documents');
  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible();
  await expect(page.getByText('No documents yet')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
