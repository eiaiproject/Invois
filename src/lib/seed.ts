import type { Client, Item, Invoice, Receipt } from '../types';
import { addDaysISO, nowISO, todayISO } from '../types';
import { saveClient, saveItem, saveInvoice, saveReceipt, nextNumber, isDBEmpty, isSampleDataRemoved, SAMPLE_ID_PREFIX } from './db';

const sampleId = (name: string) => `${SAMPLE_ID_PREFIX}${name}`;

const seededAt = nowISO();

const clients: Client[] = [
  { id: sampleId('client-1'), name: 'PT Maju Jaya', email: 'info@majujaya.co.id', phone: '+62 821-1234-5678', address: 'Jl. Sudirman Kav. 123, Jakarta', createdAt: seededAt, updatedAt: seededAt },
  { id: sampleId('client-2'), name: 'Budi Santoso', email: 'budi@personal.id', phone: '+62 856-7890-1234', address: 'Jl. Sunset Road 45, Bali', createdAt: seededAt, updatedAt: seededAt },
  { id: sampleId('client-3'), name: 'Kirana Coffee', email: 'hello@kiranacoffee.com', phone: '+62 812-5555-8888', address: 'Jl. Pemuda No. 78, Surabaya', createdAt: seededAt, updatedAt: seededAt },
];

const items: Item[] = [
  { id: sampleId('item-1'), name: 'Brand Identity Design', description: 'Full brand identity package', unit: 'project', price: 3_000_000, createdAt: seededAt, updatedAt: seededAt },
  { id: sampleId('item-2'), name: 'Website Landing Page', description: 'Responsive landing page design & build', unit: 'project', price: 4_500_000, createdAt: seededAt, updatedAt: seededAt },
  { id: sampleId('item-3'), name: 'Monthly Social Media Design', description: 'Design for social media posts', unit: 'month', price: 2_500_000, createdAt: seededAt, updatedAt: seededAt },
  { id: sampleId('item-4'), name: 'Consultation Session', description: '1-hour strategy consultation', unit: 'hour', price: 750_000, createdAt: seededAt, updatedAt: seededAt },
];

export async function seedDB() {
  await Promise.all(clients.map((client) => saveClient(client)));
  await Promise.all(items.map((item) => saveItem(item)));

  const inv1Id = sampleId('invoice-1');
  const inv1Number = await nextNumber('invoice');
  const inv1: Invoice = {
    id: inv1Id,
    number: inv1Number,
    status: 'paid',
    issueDate: todayISO(),
    dueDate: addDaysISO(7),
    clientId: clients[0]!.id,
    clientSnapshot: { name: clients[0]!.name, email: clients[0]!.email, phone: clients[0]!.phone, address: clients[0]!.address },
    items: [
      { id: sampleId('invoice-1-line-1'), name: 'Brand Identity Design', quantity: 1, unit: 'project', price: 3_000_000, amount: 3_000_000 },
      { id: sampleId('invoice-1-line-2'), name: 'Revision Support', quantity: 2, unit: 'hour', price: 250_000, amount: 500_000 },
    ],
    subtotal: 3_500_000,
    discount: 0,
    taxRate: 11,
    taxAmount: 385_000,
    total: 3_885_000,
    paymentMethod: 'Bank Transfer',
    notes: 'Thank you for your business.',
    terms: 'Payment is due within 7 days.',
    createdAt: seededAt,
    updatedAt: seededAt,
  };
  await saveInvoice(inv1);

  const rec1: Receipt = {
    id: sampleId('receipt-1'),
    number: await nextNumber('receipt'),
    status: 'paid',
    paymentDate: todayISO(),
    invoiceId: inv1Id,
    invoiceNumber: inv1Number,
    clientId: clients[0]!.id,
    clientSnapshot: { name: clients[0]!.name, email: clients[0]!.email },
    amountPaid: 3_885_000,
    paymentMethod: 'Bank Transfer',
    notes: 'Thank you for your business.',
    createdAt: seededAt,
    updatedAt: seededAt,
  };
  await saveReceipt(rec1);
}

/* First-run guard */

let seedOncePromise: Promise<void> | null = null;

/**
 * Seeds labeled sample records (ids prefixed with `sample-`) at most once per
 * session. Single-flight guard so React StrictMode double-effects or two tabs
 * opened on an empty DB cannot seed twice. Skipped after the user removes the
 * sample data, so it does not come back on the next visit.
 */
export function seedOnce(): Promise<void> {
  seedOncePromise ??= (async () => {
    if (await isSampleDataRemoved()) return;
    if (await isDBEmpty()) await seedDB();
  })();
  return seedOncePromise;
}
