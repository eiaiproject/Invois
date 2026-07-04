import { expect, test } from '@playwright/test';
import { createInvoice, openDocument, resetAppData, saveBusinessProfile } from './helpers';

test('invoice survives reload and can become a receipt', async ({ page }) => {
  await resetAppData(page);
  await saveBusinessProfile(page);

  const invoiceNumber = await createInvoice(page);
  await expect(page.getByText('CI Client')).toBeVisible();

  await page.reload();
  await expect(page.getByText(invoiceNumber)).toBeVisible();
  await openDocument(page, invoiceNumber);

  await page.getByRole('button', { name: 'Mark as Paid' }).click();
  await expect(page.locator('.badge-paid')).toHaveText('paid');
  await page.getByRole('button', { name: 'Create Receipt from this Invoice' }).click();
  await expect(page.getByRole('heading', { name: 'New Receipt' })).toBeVisible();
  await expect(page.getByLabel('Client Name')).toHaveValue('CI Client');
  await page.getByRole('button', { name: /Payment/ }).click();
  await expect(page.getByLabel('Amount Paid (Rp)')).toHaveValue('1.000.000');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.locator('.badge-type', { hasText: 'receipt' })).toBeVisible();

  await openDocument(page, invoiceNumber);
  await expect(page.getByRole('button', { name: 'View Receipt' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Receipt from this Invoice' })).toHaveCount(0);

  await page.goto('/dashboard');
  await expect(page.locator('.stat', { hasText: 'Paid this month' })).toContainText(/Rp\s*1\.000\.000/);
  await expect(page.locator('.stat', { hasText: 'Unpaid' })).toContainText(/Rp\s*0/);

  await page.goto('/documents/new/invoice');
  await expect(page.getByLabel('Number')).not.toHaveValue(invoiceNumber);
});
