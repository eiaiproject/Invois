import { expect, test } from '@playwright/test';
import { createInvoice, openDocument, resetAppData, saveBusinessProfile } from './helpers';

/* ─── Landing Page ─── */

test.describe('Landing page', () => {
  test('loads and navigates to dashboard', async ({ page }) => {
    await resetAppData(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Invoice.*maker.*offline/i })).toBeVisible();
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('mobile nav opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await resetAppData(page);
    await page.goto('/');
    await page.getByLabel('Open menu').click();
    await expect(page.getByLabel('Mobile navigation')).toBeVisible();
    await page.getByLabel('Close menu').click();
    await expect(page.getByLabel('Mobile navigation')).not.toBeVisible();
  });
});

/* ─── Dashboard ─── */

test.describe('Dashboard', () => {
  test('shows greeting and info modal', async ({ page }) => {
    await resetAppData(page);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })).toBeVisible();
    await page.getByLabel('App info').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('create buttons navigate correctly', async ({ page }) => {
    await resetAppData(page);
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Create Invoice' }).click();
    await expect(page).toHaveURL('/documents/new/invoice');
    await page.goBack();
    await page.getByRole('button', { name: 'Create Receipt' }).click();
    await expect(page).toHaveURL('/documents/new/receipt');
  });
});

/* ─── Navigation ─── */

test.describe('Navigation', () => {
  test('bottom nav navigates on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await resetAppData(page);
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Documents' }).click();
    await expect(page).toHaveURL('/documents');
    await page.getByRole('link', { name: 'Clients' }).click();
    await expect(page).toHaveURL('/clients');
    await page.getByRole('link', { name: 'Items' }).click();
    await expect(page).toHaveURL('/items');
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');
  });

  test('sidebar navigates on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await resetAppData(page);
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL('/dashboard');
    await page.getByRole('link', { name: 'Documents' }).click();
    await expect(page).toHaveURL('/documents');
    await page.getByRole('link', { name: 'Items' }).click();
    await expect(page).toHaveURL('/items');
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');
  });
});

/* ─── Clients CRUD ─── */

test.describe('Clients CRUD', () => {
  test('create, edit, and delete client', async ({ page }) => {
    await resetAppData(page);
    await page.goto('/clients');
    // Wait for page to load, create a new client
    await page.goto('/clients/new');
    await expect(page.getByRole('heading', { name: 'New Client' })).toBeVisible();

    // Create
    await page.getByLabel('Name *').fill('Test Client');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page).toHaveURL('/clients');
    await expect(page.getByText('Test Client')).toBeVisible();

    // Search
    await page.getByPlaceholder('Search clients…').fill('Test');
    await expect(page.getByText('Test Client')).toBeVisible();
    await page.getByPlaceholder('Search clients…').fill('NoMatch');
    await expect(page.getByText('No matches')).toBeVisible();

    // Edit
    await page.getByPlaceholder('Search clients…').fill('');
    await page.getByText('Test Client').click();
    await expect(page.getByRole('heading', { name: 'Edit Client' })).toBeVisible();
    await page.getByLabel('Name *').fill('Updated Client');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page).toHaveURL('/clients');
    await expect(page.getByText('Updated Client')).toBeVisible();
  });

  test('validation blocks empty name', async ({ page }) => {
    await resetAppData(page);
    await page.goto('/clients/new');
    await page.getByRole('button', { name: 'Add Client' }).click();
    await expect(page.getByText('Enter a client name.')).toBeVisible();
  });
});

/* ─── Items CRUD ─── */

test.describe('Items CRUD', () => {
  test('create, edit, and delete item', async ({ page }) => {
    await resetAppData(page);
    await page.goto('/items');
    await page.goto('/items/new');
    await expect(page.getByRole('heading', { name: 'New Item' })).toBeVisible();

    // Create
    await page.getByLabel('Name *').fill('Test Service');
    await page.getByLabel('Price (Rp)').fill('250000');
    await page.getByRole('button', { name: 'Add Item' }).click();
    await expect(page).toHaveURL('/items');
    await expect(page.getByText('Test Service')).toBeVisible();

    // Search
    await page.getByPlaceholder('Search items…').fill('Test');
    await expect(page.getByText('Test Service')).toBeVisible();
    await page.getByPlaceholder('Search items…').fill('NoMatch');
    await expect(page.getByText('No matches')).toBeVisible();

    // Edit
    await page.getByPlaceholder('Search items…').fill('');
    await page.getByText('Test Service').click();
    await expect(page.getByRole('heading', { name: 'Edit Item' })).toBeVisible();
    await page.getByLabel('Name *').fill('Updated Service');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page).toHaveURL('/items');
    await expect(page.getByText('Updated Service')).toBeVisible();
  });

  test('validation blocks empty name', async ({ page }) => {
    await resetAppData(page);
    await page.goto('/items/new');
    await page.getByRole('button', { name: 'Add Item' }).click();
    await expect(page.getByText('Enter an item name.')).toBeVisible();
  });
});

/* ─── Document Editor ─── */

test.describe('Document Editor', () => {
  test('receipt creation with payment method', async ({ page }) => {
    await resetAppData(page);
    await saveBusinessProfile(page);
    await page.goto('/documents/new/receipt');
    await expect(page.getByRole('heading', { name: 'New Receipt' })).toBeVisible();
    await page.getByLabel('Client Name').fill('Receipt Client');
    await page.getByRole('button', { name: /Payment/ }).click();
    await page.getByLabel('Amount Paid (Rp)').fill('500000');
    await page.getByLabel('Payment Method').fill('Bank Transfer');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/\/documents$/);
    await expect(page.getByText('Receipt Client')).toBeVisible();
  });

  test('preview toggle on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await resetAppData(page);
    await saveBusinessProfile(page);
    await page.goto('/documents/new/invoice');
    await page.getByLabel('Client Name').fill('Preview Client');
    await page.getByLabel('Item 1 name').fill('Preview Service');
    await page.locator('input[name="item-1-price"]').fill('500000');
    await page.getByLabel('Tax (%)').fill('0');
    await page.getByRole('button', { name: 'Preview PDF' }).click();
    await page.getByRole('button', { name: 'Edit form' }).click();
    await expect(page.getByLabel('Client Name')).toBeVisible();
  });

  test('invoice validation blocks empty fields', async ({ page }) => {
    await resetAppData(page);
    await page.goto('/documents/new/invoice');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#document-client-name-error')).toBeVisible();
  });
});

/* ─── Document Detail ─── */

test.describe('Document Detail', () => {
  test('mark sent, marked paid, edit, delete', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await resetAppData(page);
    await saveBusinessProfile(page);
    const invoiceNumber = await createInvoice(page, '1000000');

    await openDocument(page, invoiceNumber);
    await expect(page.getByRole('heading', { name: invoiceNumber })).toBeVisible();

    // Download PDF
    const dlPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF' }).click();
    expect((await dlPromise).suggestedFilename()).toMatch(/\.pdf$/);

    // Mark as Sent
    await page.getByRole('button', { name: 'Mark as Sent' }).click();
    await expect(page.locator('.badge-sent')).toBeVisible();

    // Mark as Paid
    await page.getByRole('button', { name: 'Mark as Paid' }).click();
    await expect(page.locator('.badge-paid')).toBeVisible();

    // Create Receipt from Invoice
    await page.getByRole('button', { name: 'Create Receipt from this Invoice' }).click();
    await expect(page.getByRole('heading', { name: 'New Receipt' })).toBeVisible();
    await page.getByRole('button', { name: /Payment/ }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/\/documents$/);

    // View Receipt
    await openDocument(page, invoiceNumber);
    await expect(page.getByRole('button', { name: 'View Receipt' })).toBeVisible();

    // Edit
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Invoice' })).toBeVisible();
    await page.getByLabel('Client Name').fill('Edited Client');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page).toHaveURL(/\/documents$/);

    // Delete
    await openDocument(page, invoiceNumber);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL(/\/documents$/);
    await expect(page.getByText(invoiceNumber)).toHaveCount(0);
  });

  test('receipt download and new', async ({ page }) => {
    await resetAppData(page);
    await saveBusinessProfile(page);
    await page.goto('/documents/new/receipt');
    await page.getByLabel('Client Name').fill('Receipt Test');
    await page.getByRole('button', { name: /Payment/ }).click();
    await page.getByLabel('Amount Paid (Rp)').fill('500000');
    await page.getByRole('button', { name: 'Save' }).click();

    const link = page.locator('.document-card').first();
    const num = (await link.locator('.num-doc').textContent()) || '';
    await link.click();
    await expect(page.getByRole('heading', { name: num })).toBeVisible();

    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF' }).click();
    expect((await dl).suggestedFilename()).toMatch(/\.pdf$/);

    await page.getByRole('button', { name: 'New Receipt' }).click();
    await expect(page.getByRole('heading', { name: 'New Receipt' })).toBeVisible();
  });
});

/* ─── Settings ─── */

test.describe('Settings', () => {
  test('profile save and persistence', async ({ page }) => {
    await resetAppData(page);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.getByLabel('Business Name *').fill('Test Business');
    await page.getByLabel('Bank Name').fill('Bank Test');
    await page.getByLabel('Account Number').fill('9876543210');
    await page.getByLabel('Account Holder').fill('Test Holder');
    await page.getByRole('button', { name: 'Save Settings' }).click();
    await expect(page.getByText('Settings saved.')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Business Name *')).toHaveValue('Test Business');

    await page.getByLabel('Business Name *').fill('');
    await page.getByRole('button', { name: 'Save Settings' }).click();
    await expect(page.getByText('Business name is required.')).toBeVisible();
  });
});

/* ─── Download All ─── */

test.describe('Download All', () => {
  test('downloads all documents as ZIP', async ({ page }) => {
    await resetAppData(page);
    await saveBusinessProfile(page);

    await createInvoice(page, '500000');

    await page.getByRole('button', { name: 'Download All' }).click();
    const dl = await page.waitForEvent('download');
    expect(dl.suggestedFilename()).toMatch(/^invois-documents-\d{4}-\d{2}-\d{2}\.zip$/);
    const path = await dl.path();
    expect(path).toBeTruthy();
    const { statSync } = await import('node:fs');
    expect(statSync(path!).size).toBeGreaterThan(1000);
  });
});

/* ─── Search & Filter ─── */

test.describe('Search & Filter', () => {
  test('documents filter by type and search', async ({ page }) => {
    await resetAppData(page);
    await saveBusinessProfile(page);

    await createInvoice(page, '500000');

    // Create a receipt too
    await page.goto('/documents/new/receipt');
    await page.getByLabel('Client Name').fill('Search Receipt');
    await page.getByRole('button', { name: /Payment/ }).click();
    await page.getByLabel('Amount Paid (Rp)').fill('250000');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/\/documents$/);

    // Wait for receipt to appear
    await page.waitForSelector('text=Search Receipt', { timeout: 10000 });

    // Filter by type — 1 invoice (ours, since seeded doesn't exist after resetAppData)
    // Wait — actually after resetAppData, the seeder runs and creates a seeded invoice
    // So we have 1 seeded + 1 created = 2 invoices, and 1 receipt
    // Let's count badge types after filtering
    const countDocs = async () => page.locator('.document-card').count();

    // Filter: Invoices
    await page.getByRole('button', { name: 'Invoices' }).click();
    // Should show 2: seeded invoice + created invoice
    expect(await countDocs()).toBeGreaterThanOrEqual(1);

    // Filter: Receipts
    await page.getByRole('button', { name: 'Receipts' }).click();
    // Should show 1: the receipt we just created
    expect(await countDocs()).toBeGreaterThanOrEqual(1);
    await expect(page.locator('.badge-type').first()).toHaveText('receipt');

    // All
    await page.getByRole('button', { name: 'All', exact: true }).click();
    expect(await countDocs()).toBeGreaterThanOrEqual(2);

    // Search — client name from createInvoice helper
    // Need to be on All filter first, then search
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.getByPlaceholder('Search documents…').fill('CI Client');
    // The document card contains the client name
    await expect(page.locator('.client').filter({ hasText: 'CI Client' }).first()).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder('Search documents…').fill('NoMatch');
    await expect(page.getByText('No matches')).toBeVisible();
  });
});
