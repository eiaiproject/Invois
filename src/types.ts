/* ─── Data Model ─── */

export interface BusinessProfile {
  id: string;
  name: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  defaultNotes?: string;
  defaultTerms?: string;
  defaultTaxRate?: number;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate?: string;
  clientId?: string;
  clientSnapshot: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  number: string;
  status: 'paid' | 'cancelled';
  paymentDate: string;
  invoiceId?: string;
  invoiceNumber?: string;
  clientId?: string;
  clientSnapshot: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
  };
  amountPaid: number;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function dateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return dateISO(new Date());
}

export function addDaysISO(days: number, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return dateISO(date);
}

export function nowISO(): string {
  return new Date().toISOString();
}
