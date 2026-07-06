import type { Invoice, Receipt } from '../types';

/* ─── Currency ─── */

export function formatIDR(amount: number): string {
  // ID locale, no decimals
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function parseIDRInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export function formatIDRInput(amount: number): string {
  return amount === 0 ? '' : new Intl.NumberFormat('id-ID').format(amount);
}

/* ─── Dates ─── */

const shortDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function formatDateISO(value: string | undefined): string {
  if (!value) return '—';
  const [date] = value.split('T');
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return value;
  return shortDate.format(new Date(year, month - 1, day));
}

/* ─── Copy as plain text ─── */

export function calcTotals(items: { quantity: number; price: number }[], discount: number, taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const taxAmount = Math.round(afterDiscount * taxRate / 100);
  const total = afterDiscount + taxAmount;
  return { subtotal, discount, taxAmount, total };
}



export function copyInvoiceText(invoice: Invoice): string {
  const lines: string[] = [];
  lines.push(`INVOICE ${invoice.number}`);
  lines.push(`Date: ${formatDateISO(invoice.issueDate)}`);
  if (invoice.dueDate) lines.push(`Due: ${formatDateISO(invoice.dueDate)}`);
  lines.push('');
  lines.push(`Bill To: ${invoice.clientSnapshot.name}`);
  if (invoice.clientSnapshot.email) lines.push(`Email: ${invoice.clientSnapshot.email}`);
  if (invoice.clientSnapshot.phone) lines.push(`Phone: ${invoice.clientSnapshot.phone}`);
  if (invoice.clientSnapshot.address) lines.push(`Address: ${invoice.clientSnapshot.address}`);
  lines.push('');
  for (const item of invoice.items) {
    const desc = item.description ? ` (${item.description})` : '';
    lines.push(`• ${item.name}${desc} — ${item.quantity} × ${formatIDR(item.price)} = ${formatIDR(item.amount)}`);
  }
  lines.push('');
  lines.push(`Subtotal: ${formatIDR(invoice.subtotal)}`);
  if (invoice.discount > 0) lines.push(`Discount: -${formatIDR(invoice.discount)}`);
  lines.push(`Tax (${invoice.taxRate}%): ${formatIDR(invoice.taxAmount)}`);
  lines.push(`Total: ${formatIDR(invoice.total)}`);
  if (invoice.paymentMethod) {
    lines.push('');
    lines.push(`Payment: ${invoice.paymentMethod}`);
  }
  if (invoice.bankName) lines.push(`Bank: ${invoice.bankName}`);
  if (invoice.bankAccountNumber) lines.push(`Account: ${invoice.bankAccountNumber}`);
  if (invoice.bankAccountHolder) lines.push(`Holder: ${invoice.bankAccountHolder}`);
  if (invoice.notes) {
    lines.push('');
    lines.push(`Notes: ${invoice.notes}`);
  }
  if (invoice.terms) lines.push(`Terms: ${invoice.terms}`);
  return lines.join('\n');
}

export function copyReceiptText(receipt: Receipt): string {
  const lines: string[] = [];
  lines.push(`RECEIPT ${receipt.number}`);
  if (receipt.invoiceNumber) lines.push(`Invoice Ref: ${receipt.invoiceNumber}`);
  lines.push(`Date: ${formatDateISO(receipt.paymentDate)}`);
  lines.push('');
  lines.push(`Received From: ${receipt.clientSnapshot.name}`);
  if (receipt.clientSnapshot.email) lines.push(`Email: ${receipt.clientSnapshot.email}`);
  if (receipt.clientSnapshot.phone) lines.push(`Phone: ${receipt.clientSnapshot.phone}`);
  lines.push('');
  lines.push(`Amount Paid: ${formatIDR(receipt.amountPaid)}`);
  if (receipt.paymentMethod) lines.push(`Payment Method: ${receipt.paymentMethod}`);
  if (receipt.notes) {
    lines.push('');
    lines.push(`Notes: ${receipt.notes}`);
  }
  return lines.join('\n');
}
