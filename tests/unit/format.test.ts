import { describe, it, expect } from 'vitest';
import {
  formatIDR,
  parseIDRInput,
  formatIDRInput,
  formatDateISO,
  calcTotals,
  copyInvoiceText,
  copyReceiptText,
} from '../../src/lib/format';
import type { Invoice, Receipt } from '../../src/types';

describe('formatIDR', () => {
  it('formats zero as IDR 0', () => {
    const result = formatIDR(0);
    expect(result.replace(/\s/g, '')).toMatch(/^Rp0$/);
  });

  it('formats positive amounts with Indonesian locale', () => {
    const result = formatIDR(1000000);
    expect(result.replace(/\s/g, '')).toBe('Rp1.000.000');
  });

  it('formats large amounts', () => {
    const result = formatIDR(123456789);
    expect(result.replace(/\s/g, '')).toBe('Rp123.456.789');
  });

  it('formats small amounts', () => {
    const result = formatIDR(500);
    expect(result.replace(/\s/g, '')).toBe('Rp500');
  });
});

describe('parseIDRInput', () => {
  it('parses plain numbers', () => {
    expect(parseIDRInput('1000000')).toBe(1000000);
  });

  it('strips non-numeric characters', () => {
    expect(parseIDRInput('Rp 1.000.000')).toBe(1000000);
  });

  it('returns 0 for empty string', () => {
    expect(parseIDRInput('')).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(parseIDRInput('abc')).toBe(0);
  });

  it('handles input with commas as decimal separator', () => {
    const result = parseIDRInput('Rp1.250.000,00');
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });
});

describe('formatIDRInput', () => {
  it('returns empty string for 0', () => {
    expect(formatIDRInput(0)).toBe('');
  });

  it('formats positive numbers', () => {
    const result = formatIDRInput(1000000);
    expect(result.replace(/\s/g, '')).toBe('1.000.000');
  });
});

describe('formatDateISO', () => {
  it('formats ISO date string', () => {
    const result = formatDateISO('2026-07-04');
    expect(result).toMatch(/\d+ Jul 2026/);
  });

  it('handles undefined', () => {
    expect(formatDateISO(undefined)).toBe('—');
  });

  it('handles datetime ISO string', () => {
    const result = formatDateISO('2026-12-25T10:30:00');
    expect(result).toMatch(/\d+ Dec 2026/);
  });

  it('returns original value for invalid date', () => {
    expect(formatDateISO('invalid')).toBe('invalid');
  });
});

describe('calcTotals', () => {
  it('calculates subtotal without tax', () => {
    const items = [{ quantity: 2, price: 100000 }];
    const result = calcTotals(items, 0, 0);
    expect(result.subtotal).toBe(200000);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(200000);
  });

  it('applies tax rate correctly', () => {
    const items = [{ quantity: 1, price: 1000000 }];
    const result = calcTotals(items, 0, 11);
    expect(result.subtotal).toBe(1000000);
    expect(result.taxAmount).toBe(110000);
    expect(result.total).toBe(1110000);
  });

  it('applies discount before tax', () => {
    const items = [{ quantity: 1, price: 1000000 }];
    const result = calcTotals(items, 100000, 11);
    expect(result.subtotal).toBe(1000000);
    expect(result.discount).toBe(100000);
    expect(result.taxAmount).toBe(99000);
    expect(result.total).toBe(999000);
  });

  it('handles multiple items', () => {
    const items = [
      { quantity: 2, price: 500000 },
      { quantity: 1, price: 300000 },
    ];
    const result = calcTotals(items, 0, 0);
    expect(result.subtotal).toBe(1300000);
    expect(result.total).toBe(1300000);
  });

  it('does not allow negative total after discount', () => {
    const items = [{ quantity: 1, price: 100000 }];
    const result = calcTotals(items, 200000, 0);
    expect(result.total).toBe(0);
  });
});

describe('copyInvoiceText', () => {
  it('generates full invoice text with all details', () => {
    const invoice: Invoice = {
      id: 'inv-1',
      number: 'INV-2026-07-0001',
      status: 'paid',
      issueDate: '2026-07-04',
      dueDate: '2026-07-11',
      clientSnapshot: { name: 'Acme Corp', email: 'billing@acme.com' },
      items: [
        { id: '1', name: 'Design', quantity: 1, price: 500000, amount: 500000 },
      ],
      subtotal: 500000,
      discount: 0,
      taxRate: 11,
      taxAmount: 55000,
      total: 555000,
      paymentMethod: 'Bank Transfer',
      bankName: 'BCA',
      bankAccountNumber: '123456',
      bankAccountHolder: 'Acme',
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z',
    };

    const text = copyInvoiceText(invoice);
    expect(text).toContain('INVOICE INV-2026-07-0001');
    expect(text).toContain('Acme Corp');
    expect(text).toContain('billing@acme.com');
    expect(text).toContain('Design');
    expect(text).toContain(formatIDR(555000));
    expect(text).toContain('Bank Transfer');
    expect(text).toContain('BCA');
  });

  it('excludes optional fields when not provided', () => {
    const invoice: Invoice = {
      id: 'inv-2',
      number: 'INV-2026-07-0002',
      status: 'draft',
      issueDate: '2026-07-04',
      clientSnapshot: { name: 'Beta Inc' },
      items: [
        { id: '1', name: 'Service', quantity: 1, price: 100000, amount: 100000 },
      ],
      subtotal: 100000,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 100000,
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z',
    };

    const text = copyInvoiceText(invoice);
    expect(text).toContain('INVOICE INV-2026-07-0002');
    expect(text).toContain('Beta Inc');
    expect(text).not.toContain('Email:');
    expect(text).not.toContain('Due:');
    expect(text).not.toContain('Payment:');
  });
});

describe('copyReceiptText', () => {
  it('generates full receipt text', () => {
    const receipt: Receipt = {
      id: 'rec-1',
      number: 'RCPT-2026-07-0001',
      status: 'paid',
      paymentDate: '2026-07-04',
      invoiceNumber: 'INV-2026-07-0001',
      clientSnapshot: { name: 'Acme Corp' },
      amountPaid: 555000,
      paymentMethod: 'Bank Transfer',
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z',
    };

    const text = copyReceiptText(receipt);
    expect(text).toContain('RECEIPT RCPT-2026-07-0001');
    expect(text).toContain('Invoice Ref: INV-2026-07-0001');
    expect(text).toContain('Acme Corp');
    expect(text).toContain(formatIDR(555000));
    expect(text).toContain('Bank Transfer');
  });

  it('excludes optional fields when not provided', () => {
    const receipt: Receipt = {
      id: 'rec-2',
      number: 'RCPT-2026-07-0002',
      status: 'paid',
      paymentDate: '2026-07-04',
      clientSnapshot: { name: 'Beta Inc' },
      amountPaid: 100000,
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z',
    };

    const text = copyReceiptText(receipt);
    expect(text).toContain('RECEIPT RCPT-2026-07-0002');
    expect(text).toContain('Beta Inc');
    expect(text).not.toContain('Invoice Ref:');
    expect(text).not.toContain('Payment Method:');
  });
});
