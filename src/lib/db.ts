import { openDB, type IDBPDatabase } from 'idb';
import type { BusinessProfile, Client, Item, Invoice, Receipt } from '../types';
import { effectiveInvoiceStatus, nowISO } from '../types';

const DB_NAME = 'invois';
const DB_VERSION = 3;

interface InvoisDB {
  business: { key: string; value: BusinessProfile };
  clients: { key: string; value: Client };
  items: { key: string; value: Item };
  invoices: { key: string; value: Invoice; indexes: { createdAt: string } };
  receipts: { key: string; value: Receipt; indexes: { createdAt: string } };
  counters: { key: string; value: number };
}

let dbPromise: Promise<IDBPDatabase<InvoisDB>> | null = null;

function getDB() {
  dbPromise ??= openDB<InvoisDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains('business')) db.createObjectStore('business', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('clients')) db.createObjectStore('clients', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
        const inv = db.objectStoreNames.contains('invoices') ? tx.objectStore('invoices') : db.createObjectStore('invoices', { keyPath: 'id' });
        if (!inv.indexNames.contains('createdAt')) inv.createIndex('createdAt', 'createdAt');
        const rec = db.objectStoreNames.contains('receipts') ? tx.objectStore('receipts') : db.createObjectStore('receipts', { keyPath: 'id' });
        if (!rec.indexNames.contains('createdAt')) rec.createIndex('createdAt', 'createdAt');
        if (!db.objectStoreNames.contains('counters')) db.createObjectStore('counters');
      }
    });
  return dbPromise;
}

/* Business */

export async function getBusiness(): Promise<BusinessProfile | undefined> {
  return (await getDB()).get('business', 'biz-1');
}

export async function saveBusiness(biz: BusinessProfile) {
  const db = await getDB();
  await db.put('business', biz);
}

/* Clients */

export const getClients = async (): Promise<Client[]> => (await getDB()).getAll('clients');
export const getClient = async (id: string) => (await getDB()).get('clients', id);
export const saveClient = async (c: Client) => (await getDB()).put('clients', c);

/* Items */

export const getItems = async (): Promise<Item[]> => (await getDB()).getAll('items');
export const getItem = async (id: string) => (await getDB()).get('items', id);
export const saveItem = async (i: Item) => (await getDB()).put('items', i);

/* Invoices */

export async function getInvoices(): Promise<Invoice[]> {
  const db = await getDB();
  return db.getAllFromIndex('invoices', 'createdAt');
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  const db = await getDB();
  return db.get('invoices', id);
}

export async function saveInvoice(inv: Invoice) {
  const db = await getDB();
  await db.put('invoices', inv);
}

/**
 * Deletes an invoice and every receipt that references it, so no receipt is
 * left pointing at a missing invoice. Returns the deleted receipts.
 */
export async function deleteInvoice(id: string): Promise<Receipt[]> {
  const db = await getDB();
  const receipts = await getReceipts();
  const linked = receipts.filter(r => r.invoiceId === id);
  const tx = db.transaction(['invoices', 'receipts'], 'readwrite');
  await tx.objectStore('invoices').delete(id);
  for (const receipt of linked) await tx.objectStore('receipts').delete(receipt.id);
  await tx.done;
  return linked;
}

/* Receipts */

export async function getReceipts(): Promise<Receipt[]> {
  const db = await getDB();
  return db.getAllFromIndex('receipts', 'createdAt');
}

export async function getReceipt(id: string): Promise<Receipt | undefined> {
  const db = await getDB();
  return db.get('receipts', id);
}

export async function saveReceipt(r: Receipt) {
  const db = await getDB();
  await db.put('receipts', r);
}

export interface ReceiptChangeResult {
  receipt: Receipt;
  revertedInvoice?: Invoice;
}

/**
 * Deletes a receipt and, when it was the last active proof of payment, puts the
 * linked invoice back to `sent` so it no longer reads as paid.
 */
export async function deleteReceipt(id: string): Promise<ReceiptChangeResult | undefined> {
  const db = await getDB();
  const receipt = await db.get('receipts', id);
  if (!receipt) return undefined;

  const receipts = await getReceipts();
  const remainingActive = receipts.filter(
    r => r.id !== id && r.invoiceId === receipt.invoiceId && r.status !== 'cancelled'
  );

  const now = nowISO();
  const tx = db.transaction(['receipts', 'invoices'], 'readwrite');
  await tx.objectStore('receipts').delete(id);

  let revertedInvoice: Invoice | undefined;
  if (receipt.invoiceId && remainingActive.length === 0) {
    const invoice = await tx.objectStore('invoices').get(receipt.invoiceId);
    if (invoice && invoice.status === 'paid') {
      revertedInvoice = { ...invoice, status: 'sent', updatedAt: now };
      await tx.objectStore('invoices').put(revertedInvoice);
    }
  }
  await tx.done;
  return { receipt, revertedInvoice };
}

/** Marks an invoice as cancelled. Linked receipts are kept as separate records. */
export async function cancelInvoice(id: string): Promise<Invoice | undefined> {
  const db = await getDB();
  const invoice = await db.get('invoices', id);
  if (!invoice) return undefined;
  const updated: Invoice = { ...invoice, status: 'cancelled', updatedAt: nowISO() };
  await db.put('invoices', updated);
  return updated;
}

/** Voids a receipt; reverts the linked invoice when no active receipt remains. */
export async function cancelReceipt(id: string): Promise<ReceiptChangeResult | undefined> {
  const db = await getDB();
  const receipt = await db.get('receipts', id);
  if (!receipt) return undefined;

  const receipts = await getReceipts();
  const remainingActive = receipts.filter(
    r => r.id !== id && r.invoiceId === receipt.invoiceId && r.status !== 'cancelled'
  );

  const now = nowISO();
  const updated: Receipt = { ...receipt, status: 'cancelled', updatedAt: now };
  const tx = db.transaction(['receipts', 'invoices'], 'readwrite');
  await tx.objectStore('receipts').put(updated);

  let revertedInvoice: Invoice | undefined;
  if (receipt.invoiceId && remainingActive.length === 0) {
    const invoice = await tx.objectStore('invoices').get(receipt.invoiceId);
    if (invoice && invoice.status === 'paid') {
      revertedInvoice = { ...invoice, status: 'sent', updatedAt: now };
      await tx.objectStore('invoices').put(revertedInvoice);
    }
  }
  await tx.done;
  return { receipt: updated, revertedInvoice };
}

/* Counters (monthly reset) */

function counterKey(type: string, date: Date): string {
  return `${type}-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function documentNumber(type: 'invoice' | 'receipt', date: Date, count: number): string {
  const prefix = type === 'invoice' ? 'INV' : 'RCPT';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${prefix}-${date.getFullYear()}-${mm}-${String(count).padStart(4, '0')}`;
}

export async function nextNumber(type: 'invoice' | 'receipt'): Promise<string> {
  const db = await getDB();
  const now = new Date();
  const key = counterKey(type, now);
  const tx = db.transaction('counters', 'readwrite');
  const store = tx.objectStore('counters');
  const count = ((await store.get(key)) || 0) + 1;
  await store.put(count, key);
  await tx.done;
  return documentNumber(type, now, count);
}

export async function peekNextNumber(type: 'invoice' | 'receipt'): Promise<string> {
  const db = await getDB();
  const now = new Date();
  const key = counterKey(type, now);
  const count = ((await db.get('counters', key)) || 0) + 1;
  return documentNumber(type, now, count);
}

/* Stats */

export async function getDashboardStats() {
  const invoices = await getInvoices();
  const receipts = await getReceipts();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const paidReceiptInvoiceIds = new Set(
    receipts
      .filter(r => r.status === 'paid' && r.invoiceId)
      .map(r => r.invoiceId!)
  );
  const unpaid = invoices.filter(i =>
    (i.status === 'draft' || i.status === 'sent' || i.status === 'overdue') &&
    !paidReceiptInvoiceIds.has(i.id)
  );
  const unpaidTotal = unpaid.reduce((s, i) => s + i.total, 0);

  const paidReceipts = receipts.filter(r => r.status === 'paid' && r.paymentDate.slice(0, 10) >= monthStart);
  const paidInvoicesWithoutReceipt = invoices.filter(i =>
    i.status === 'paid' &&
    !paidReceiptInvoiceIds.has(i.id) &&
    i.updatedAt.slice(0, 10) >= monthStart
  );
  const paidTotal =
    paidReceipts.reduce((s, r) => s + r.amountPaid, 0) +
    paidInvoicesWithoutReceipt.reduce((s, i) => s + i.total, 0);

  const overdue = invoices.filter(i => effectiveInvoiceStatus(i) === 'overdue' && !paidReceiptInvoiceIds.has(i.id));

  const recentDocs = [
    ...invoices.map(i => ({ ...i, status: effectiveInvoiceStatus(i), kind: 'invoice' as const })),
    ...receipts.map(r => ({ ...r, kind: 'receipt' as const }))
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return { unpaidTotal, paidTotal, overdueCount: overdue.length, recentDocs };
}

/* First-run check */

export async function isDBEmpty() {
  const db = await getDB();
  const [business, clients, items, invoices, receipts] = await Promise.all([
    db.count('business'),
    db.count('clients'),
    db.count('items'),
    db.count('invoices'),
    db.count('receipts'),
  ]);
  return business + clients + items + invoices + receipts === 0;
}

/* Sample data */

/** Seed records use ids with this prefix so the UI can label and remove them. */
export const SAMPLE_ID_PREFIX = 'sample-';

function sampleKeyRange() {
  return IDBKeyRange.bound(SAMPLE_ID_PREFIX, SAMPLE_ID_PREFIX + String.fromCharCode(0xffff));
}

const SAMPLE_REMOVED_KEY = 'sample-data-removed';

/** True after the user explicitly removed the sample data, so it is not re-seeded. */
export async function isSampleDataRemoved(): Promise<boolean> {
  return (await (await getDB()).get('counters', SAMPLE_REMOVED_KEY)) === 1;
}

export async function getSampleRecordCount(): Promise<number> {
  const db = await getDB();
  const [clients, items, invoices, receipts] = await Promise.all([
    db.count('clients', sampleKeyRange()),
    db.count('items', sampleKeyRange()),
    db.count('invoices', sampleKeyRange()),
    db.count('receipts', sampleKeyRange()),
  ]);
  return clients + items + invoices + receipts;
}

/** Deletes every seeded sample record. Returns how many records were removed. */
export async function removeSampleData(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(['clients', 'items', 'invoices', 'receipts', 'counters'], 'readwrite');
  let removed = 0;
  for (const name of ['clients', 'items', 'invoices', 'receipts'] as const) {
    const store = tx.objectStore(name);
    removed += await store.count(sampleKeyRange());
    await store.delete(sampleKeyRange());
  }
  await tx.objectStore('counters').put(1, SAMPLE_REMOVED_KEY);
  await tx.done;
  return removed;
}

/* Export / Import */

export interface ExportData {
  version: number;
  exportedAt: string;
  business: BusinessProfile[];
  clients: Client[];
  items: Item[];
  invoices: Invoice[];
  receipts: Receipt[];
}

export async function exportAllData(): Promise<ExportData> {
  const db = await getDB();
  const [business, clients, items, invoices, receipts] = await Promise.all([
    db.getAll('business'),
    db.getAll('clients'),
    db.getAll('items'),
    db.getAllFromIndex('invoices', 'createdAt'),
    db.getAllFromIndex('receipts', 'createdAt'),
  ]);
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    business,
    clients,
    items,
    invoices,
    receipts,
  };
}

/* Import validation */

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function recordList(value: unknown, label: string): Record<string, unknown>[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new TypeError(`Import file: "${label}" must be a list.`);
  return value.map((item, index) => {
    if (!isRecord(item)) throw new TypeError(`Import file: ${label}[${index}] must be an object.`);
    return item;
  });
}

function requireString(record: Record<string, unknown>, key: string, path: string): void {
  if (typeof record[key] !== 'string' || !(record[key] as string).trim()) {
    throw new TypeError(`Import file: ${path}.${key} must be a non-empty text value.`);
  }
}

function requireNumber(record: Record<string, unknown>, key: string, path: string): void {
  if (typeof record[key] !== 'number' || !Number.isFinite(record[key] as number)) {
    throw new TypeError(`Import file: ${path}.${key} must be a number.`);
  }
}

function requireSnapshot(record: Record<string, unknown>, path: string): void {
  if (!isRecord(record.clientSnapshot)) {
    throw new TypeError(`Import file: ${path}.clientSnapshot must be an object.`);
  }
  requireString(record.clientSnapshot, 'name', `${path}.clientSnapshot`);
}

/**
 * Validates every record before anything is written, so a malformed backup
 * fails cleanly instead of importing half of its data.
 */
export function validateImportData(data: ExportData): ExportData {
  if (!isRecord(data)) throw new TypeError('Invalid import file format.');
  if (typeof data.version === 'number' && data.version > DB_VERSION) {
    throw new TypeError('This backup was created by a newer version of Invois. Update the app before importing.');
  }
  if (!Array.isArray(data.invoices) || !Array.isArray(data.receipts)) {
    throw new TypeError('Import file is missing required data (invoices or receipts).');
  }

  const business = recordList(data.business, 'business');
  business.forEach((b, i) => requireString(b, 'name', `business[${i}]`));

  const clients = recordList(data.clients, 'clients');
  clients.forEach((c, i) => requireString(c, 'name', `clients[${i}]`));

  const items = recordList(data.items, 'items');
  items.forEach((it, i) => {
    requireString(it, 'name', `items[${i}]`);
    requireNumber(it, 'price', `items[${i}]`);
  });

  const invoices = recordList(data.invoices, 'invoices');
  invoices.forEach((inv, i) => {
    requireString(inv, 'number', `invoices[${i}]`);
    requireNumber(inv, 'total', `invoices[${i}]`);
    requireSnapshot(inv, `invoices[${i}]`);
    if (!Array.isArray(inv.items)) throw new TypeError(`Import file: invoices[${i}].items must be a list.`);
  });

  const receipts = recordList(data.receipts, 'receipts');
  receipts.forEach((r, i) => {
    requireString(r, 'number', `receipts[${i}]`);
    requireNumber(r, 'amountPaid', `receipts[${i}]`);
    requireSnapshot(r, `receipts[${i}]`);
  });

  if (business.length + clients.length + items.length + invoices.length + receipts.length === 0) {
    throw new TypeError('Import file contains no records.');
  }

  return {
    version: typeof data.version === 'number' ? data.version : DB_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : nowISO(),
    business: business as unknown as BusinessProfile[],
    clients: clients as unknown as Client[],
    items: items as unknown as Item[],
    invoices: invoices as unknown as Invoice[],
    receipts: receipts as unknown as Receipt[],
  };
}

export async function importAllData(data: ExportData): Promise<{ imported: boolean; counts: Record<string, number> }> {
  const valid = validateImportData(data);
  const counts = {
    business: valid.business.length,
    clients: valid.clients.length,
    items: valid.items.length,
    invoices: valid.invoices.length,
    receipts: valid.receipts.length,
  };

  const db = await getDB();
  // One transaction across every store: a failure rolls the whole import back.
  const tx = db.transaction(['business', 'clients', 'items', 'invoices', 'receipts'], 'readwrite');
  for (const b of valid.business) await tx.objectStore('business').put(b);
  for (const c of valid.clients) await tx.objectStore('clients').put(c);
  for (const i of valid.items) await tx.objectStore('items').put(i);
  for (const inv of valid.invoices) await tx.objectStore('invoices').put(inv);
  for (const r of valid.receipts) await tx.objectStore('receipts').put(r);
  await tx.done;

  return { imported: true, counts };
}
