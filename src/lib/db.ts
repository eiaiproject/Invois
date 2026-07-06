import { openDB, type IDBPDatabase } from 'idb';
import type { BusinessProfile, Client, Item, Invoice, Receipt } from '../types';

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
  if (!dbPromise) {
    dbPromise = openDB<InvoisDB>(DB_NAME, DB_VERSION, {
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
  }
  return dbPromise;
}

/* ─── Business ─── */

export async function getBusiness(): Promise<BusinessProfile | undefined> {
  return (await getDB()).get('business', 'biz-1');
}

export async function saveBusiness(biz: BusinessProfile) {
  const db = await getDB();
  await db.put('business', biz);
}

/* ─── Clients ─── */

export const getClients = async (): Promise<Client[]> => (await getDB()).getAll('clients');
export const getClient = async (id: string) => (await getDB()).get('clients', id);
export const saveClient = async (c: Client) => (await getDB()).put('clients', c);

/* ─── Items ─── */

export const getItems = async (): Promise<Item[]> => (await getDB()).getAll('items');
export const getItem = async (id: string) => (await getDB()).get('items', id);
export const saveItem = async (i: Item) => (await getDB()).put('items', i);

/* ─── Invoices ─── */

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

export async function deleteInvoice(id: string) {
  const db = await getDB();
  await db.delete('invoices', id);
}

/* ─── Receipts ─── */

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

export async function deleteReceipt(id: string) {
  const db = await getDB();
  await db.delete('receipts', id);
}

/* ─── Counters (monthly reset) ─── */

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

/* ─── Stats ─── */

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

  const overdue = invoices.filter(i => i.status === 'overdue' && !paidReceiptInvoiceIds.has(i.id));

  const recentDocs = [
    ...invoices.map(i => ({ ...i, kind: 'invoice' as const })),
    ...receipts.map(r => ({ ...r, kind: 'receipt' as const }))
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return { unpaidTotal, paidTotal, overdueCount: overdue.length, recentDocs };
}

/* ─── Init with seed ─── */

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

/* ─── Export / Import ─── */

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

export async function importAllData(data: ExportData): Promise<{ imported: boolean; counts: Record<string, number> }> {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid import file format.');
  }
  if (!Array.isArray(data.invoices) || !Array.isArray(data.receipts)) {
    throw new Error('Import file is missing required data (invoices or receipts).');
  }

  const db = await getDB();
  const counts = { business: 0, clients: 0, items: 0, invoices: 0, receipts: 0 };

  if (Array.isArray(data.business)) {
    const tx = db.transaction('business', 'readwrite');
    for (const b of data.business) {
      await tx.store.put(b);
      counts.business++;
    }
    await tx.done;
  }

  if (Array.isArray(data.clients)) {
    const tx = db.transaction('clients', 'readwrite');
    for (const c of data.clients) {
      await tx.store.put(c);
      counts.clients++;
    }
    await tx.done;
  }

  if (Array.isArray(data.items)) {
    const tx = db.transaction('items', 'readwrite');
    for (const i of data.items) {
      await tx.store.put(i);
      counts.items++;
    }
    await tx.done;
  }

  if (Array.isArray(data.invoices)) {
    const tx = db.transaction('invoices', 'readwrite');
    for (const inv of data.invoices) {
      await tx.store.put(inv);
      counts.invoices++;
    }
    await tx.done;
  }

  if (Array.isArray(data.receipts)) {
    const tx = db.transaction('receipts', 'readwrite');
    for (const r of data.receipts) {
      await tx.store.put(r);
      counts.receipts++;
    }
    await tx.done;
  }

  return { imported: true, counts };
}
