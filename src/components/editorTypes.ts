export type { Client, Invoice, InvoiceItem, Item, Receipt } from '../types';

export type EditorValidationError = { fieldId: string; message: string; section: string };

export type Totals = { subtotal: number; discount: number; taxAmount: number; total: number };
