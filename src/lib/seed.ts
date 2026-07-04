import type { BusinessProfile, Client, Item, Invoice, Receipt } from '../types';
import { addDaysISO, newId, nowISO, todayISO } from '../types';
import { saveBusiness, saveClient, saveItem, saveInvoice, saveReceipt, nextNumber } from './db';

const biz: BusinessProfile = {
  id: 'biz-1',
  name: 'Luma Studio',
  email: 'hello@lumastudio.id',
  phone: '+62 812-3456-7890',
  address: 'Jl. Kemang Raya No. 12, Jakarta Selatan',
  taxId: '',
  bankName: 'Bank BCA',
  bankAccountNumber: '1234567890',
  bankAccountHolder: 'Luma Studio',
  defaultNotes: 'Thank you for your business.',
  defaultTerms: 'Payment is due within 7 days.',
  defaultTaxRate: 11,
};

const seededAt = nowISO();

const clients: Client[] = [
  { id: newId(), name: 'PT Maju Jaya', email: 'info@majujaya.co.id', phone: '+62 821-1234-5678', address: 'Jl. Sudirman Kav. 123, Jakarta', createdAt: seededAt, updatedAt: seededAt },
  { id: newId(), name: 'Budi Santoso', email: 'budi@personal.id', phone: '+62 856-7890-1234', address: 'Jl. Sunset Road 45, Bali', createdAt: seededAt, updatedAt: seededAt },
  { id: newId(), name: 'Kirana Coffee', email: 'hello@kiranacoffee.com', phone: '+62 812-5555-8888', address: 'Jl. Pemuda No. 78, Surabaya', createdAt: seededAt, updatedAt: seededAt },
];

const items: Item[] = [
  { id: newId(), name: 'Brand Identity Design', description: 'Full brand identity package', unit: 'project', price: 3_000_000, createdAt: seededAt, updatedAt: seededAt },
  { id: newId(), name: 'Website Landing Page', description: 'Responsive landing page design & build', unit: 'project', price: 4_500_000, createdAt: seededAt, updatedAt: seededAt },
  { id: newId(), name: 'Monthly Social Media Design', description: 'Design for social media posts', unit: 'month', price: 2_500_000, createdAt: seededAt, updatedAt: seededAt },
  { id: newId(), name: 'Consultation Session', description: '1-hour strategy consultation', unit: 'hour', price: 750_000, createdAt: seededAt, updatedAt: seededAt },
];

export async function seedDB() {
  await saveBusiness(biz);
  for (const c of clients) await saveClient(c);
  for (const i of items) await saveItem(i);

  // Sample invoice
  const inv1Id = newId();
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
      { id: newId(), name: 'Brand Identity Design', quantity: 1, unit: 'project', price: 3_000_000, amount: 3_000_000 },
      { id: newId(), name: 'Revision Support', quantity: 2, unit: 'hour', price: 250_000, amount: 500_000 },
    ],
    subtotal: 3_500_000,
    discount: 0,
    taxRate: 11,
    taxAmount: 385_000,
    total: 3_885_000,
    paymentMethod: 'Bank Transfer',
    bankName: 'Bank BCA',
    bankAccountNumber: '1234567890',
    bankAccountHolder: 'Luma Studio',
    notes: 'Thank you for your business.',
    terms: 'Payment is due within 7 days.',
    createdAt: seededAt,
    updatedAt: seededAt,
  };
  await saveInvoice(inv1);

  // Sample receipt
  const rec1Number = await nextNumber('receipt');
  const rec1: Receipt = {
    id: newId(),
    number: rec1Number,
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
