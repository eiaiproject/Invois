import { openDB, type IDBPDatabase } from 'idb';
import type { BusinessProfile, Client, Item, Invoice, Receipt } from '../types';

const DB_NAME = 'invois';
const DB_VERSION = 3;

interface InvoisDB {
  business: { key: string; value: BusinessProfile };
  clients: { key: string; value: Client };
  items: { key: string; value: Item };
  invoices: { key: string; value: Invoice; indexes: { number: string; status: string; createdAt: string } };
  receipts: { key: string; value: Receipt; indexes: { number: string; createdAt: string } };
  counters: { key: string; value: number };
}

let dbPromise: Promise<IDBPDatabase<InvoisDB>> | null = null;

function ensureIndex(
  store: { indexNames: DOMStringList; createIndex: (name: string, keyPath: string) => unknown },
  name: string,
  keyPath: string
) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath);
}

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<InvoisDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains('business')) {
          db.createObjectStore('business', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('clients')) {
          db.createObjectStore('clients', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' });
        }
        const inv = db.objectStoreNames.contains('invoices')
          ? tx.objectStore('invoices')
          : db.createObjectStore('invoices', { keyPath: 'id' });
        ensureIndex(inv, 'number', 'number');
        ensureIndex(inv, 'status', 'status');
        ensureIndex(inv, 'createdAt', 'createdAt');

        const rec = db.objectStoreNames.contains('receipts')
          ? tx.objectStore('receipts')
          : db.createObjectStore('receipts', { keyPath: 'id' });
        ensureIndex(rec, 'number', 'number');
        ensureIndex(rec, 'createdAt', 'createdAt');

        if (!db.objectStoreNames.contains('counters')) {
          db.createObjectStore('counters');
        }
      }
    });
  }
  return dbPromise;
}

/* ─── Generic helpers ─── */

async function getAll(store: 'clients'): Promise<Client[]>;
async function getAll(store: 'items'): Promise<Item[]>;
async function getAll(store: 'clients' | 'items') {
  const db = await getDB();
  return db.getAll(store);
}

async function get<T>(store: 'clients' | 'items', id: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(store, id) as Promise<T | undefined>;
}

async function put<T>(store: 'clients' | 'items', value: T) {
  const db = await getDB();
  return db.put(store, value as any);
}

/* ─── Business ─── */

export async function getBusiness(): Promise<BusinessProfile | undefined> {
  const db = await getDB();
  const all = await db.getAll('business');
  return all[0];
}

export async function saveBusiness(biz: BusinessProfile) {
  const db = await getDB();
  const tx = db.transaction('business', 'readwrite');
  const store = tx.objectStore('business');
  await (store.keyPath ? store.put(biz) : store.put(biz, biz.id));
  await tx.done;
}

/* ─── Clients ─── */

export const getClients = () => getAll('clients');
export const getClient = (id: string) => get<Client>('clients', id);
export const saveClient = (c: Client) => put('clients', c);

/* ─── Items ─── */

export const getItems = () => getAll('items');
export const getItem = (id: string) => get<Item>('items', id);
export const saveItem = (i: Item) => put('items', i);

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
