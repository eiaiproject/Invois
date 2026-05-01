import Dexie, { type Table } from 'dexie';

export interface BankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface Profile {
  id?: number;
  brandName: string;
  ownerName: string;
  address: string;
  contact: string;
  logoUrl?: string; // Base64 string for offline storage
  brandColor: string;
  prefix: string;
  banks: BankAccount[];
}

export interface CatalogItem {
  id?: number;
  name: string;
  price: number;
}

export interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id?: number;
  invoiceNo: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  items: InvoiceItem[];
  subtotal: number;
  taxIncluded: boolean;
  taxRate: number;
  discount: number;
  discountType: 'percentage' | 'nominal';
  grandTotal: number;
  notes: string;
  createdAt: number;
}

export class InvoisDatabase extends Dexie {
  profile!: Table<Profile, number>;
  catalog!: Table<CatalogItem, number>;
  invoices!: Table<Invoice, number>;

  constructor() {
    super('InvoisDatabase');
    this.version(1).stores({
      profile: '++id', // Usually just 1 record for the single user profile
      catalog: '++id, name',
      invoices: '++id, invoiceNo, clientName, issueDate'
    });
    this.version(2).stores({
      profile: '++id',
      catalog: '++id, name',
      invoices: '++id, invoiceNo, clientName, issueDate, createdAt'
    });
  }
}

export const db = new InvoisDatabase();

// Default values for new users
export const defaultProfile: Profile = {
  brandName: '',
  ownerName: '',
  address: '',
  contact: '',
  brandColor: '#10B981',
  prefix: 'INV',
  banks: []
};
