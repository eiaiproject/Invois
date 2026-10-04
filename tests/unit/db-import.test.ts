import { describe, it, expect } from 'vitest';
import { validateImportData, type ExportData } from '../../src/lib/db';
import type { Invoice, Receipt } from '../../src/types';

const invoice: Invoice = {
  id: 'inv-1',
  number: 'INV-2026-01-0001',
  status: 'draft',
  issueDate: '2026-01-01',
  clientSnapshot: { name: 'Acme' },
  items: [],
  subtotal: 0,
  discount: 0,
  taxRate: 0,
  taxAmount: 0,
  total: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const receipt: Receipt = {
  id: 'rec-1',
  number: 'RCPT-2026-01-0001',
  status: 'paid',
  paymentDate: '2026-01-01',
  clientSnapshot: { name: 'Acme' },
  amountPaid: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeFile(overrides: Partial<ExportData> = {}): ExportData {
  return {
    version: 3,
    exportedAt: '2026-01-01T00:00:00.000Z',
    business: [],
    clients: [],
    items: [],
    invoices: [],
    receipts: [],
    ...overrides,
  };
}

describe('validateImportData', () => {
  it('accepts a well-formed backup', () => {
    const file = makeFile({ invoices: [invoice], receipts: [receipt] });
    expect(() => validateImportData(file)).not.toThrow();
  });

  it('rejects an invoice without a client snapshot name', () => {
    const broken = { ...invoice, clientSnapshot: {} } as unknown as Invoice;
    expect(() => validateImportData(makeFile({ invoices: [broken] }))).toThrow(/clientSnapshot\.name/);
  });

  it('rejects a backup from a newer schema version', () => {
    expect(() => validateImportData(makeFile({ version: 99 }))).toThrow(/newer version/);
  });

  it('rejects a file that contains no records', () => {
    expect(() => validateImportData(makeFile())).toThrow(/no records/);
  });

  it('rejects a file missing the invoices and receipts lists', () => {
    const file = makeFile({ invoices: null as unknown as Invoice[] });
    expect(() => validateImportData(file)).toThrow(/missing required data/);
  });
});
