import type { Invoice, Receipt } from '../types';

/* ─── Currency ─── */

export function formatIDR(amount: number): string {
  // ID locale, no decimals
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function parseIDRInput(raw: string): number {
  const cleaned = raw.replace(/\D/g, '');
  return cleaned ? Number.parseInt(cleaned, 10) : 0;
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
  const parts: string[] = [
    `INVOICE ${invoice.number}`,
    `Date: ${formatDateISO(invoice.issueDate)}`,
  ];
  if (invoice.dueDate) parts.push(`Due: ${formatDateISO(invoice.dueDate)}`);
  parts.push('');
  const clientParts: string[] = [
    `Bill To: ${invoice.clientSnapshot.name}`,
  ];
  if (invoice.clientSnapshot.email) clientParts.push(`Email: ${invoice.clientSnapshot.email}`);
  if (invoice.clientSnapshot.phone) clientParts.push(`Phone: ${invoice.clientSnapshot.phone}`);
  if (invoice.clientSnapshot.address) clientParts.push(`Address: ${invoice.clientSnapshot.address}`);
  parts.push(...clientParts);
  parts.push('');
  for (const item of invoice.items) {
    const desc = item.description ? ` (${item.description})` : '';
    parts.push(`• ${item.name}${desc} — ${item.quantity} × ${formatIDR(item.price)} = ${formatIDR(item.amount)}`);
  }
  parts.push('');
  const totalsParts: string[] = [
    `Subtotal: ${formatIDR(invoice.subtotal)}`,
  ];
  if (invoice.discount > 0) totalsParts.push(`Discount: -${formatIDR(invoice.discount)}`);
  totalsParts.push(`Tax (${invoice.taxRate}%): ${formatIDR(invoice.taxAmount)}`);
  totalsParts.push(`Total: ${formatIDR(invoice.total)}`);
  parts.push(...totalsParts);
  if (invoice.paymentMethod) parts.push('', `Payment: ${invoice.paymentMethod}`);
  if (invoice.bankName) parts.push(`Bank: ${invoice.bankName}`);
  if (invoice.bankAccountNumber) parts.push(`Account: ${invoice.bankAccountNumber}`);
  if (invoice.bankAccountHolder) parts.push(`Holder: ${invoice.bankAccountHolder}`);
  if (invoice.notes) parts.push('', `Notes: ${invoice.notes}`);
  if (invoice.terms) parts.push(`Terms: ${invoice.terms}`);
  return parts.join('\n');
}

export function copyReceiptText(receipt: Receipt): string {
  const parts: string[] = [
    `RECEIPT ${receipt.number}`,
  ];
  if (receipt.invoiceNumber) parts.push(`Invoice Ref: ${receipt.invoiceNumber}`);
  parts.push(`Date: ${formatDateISO(receipt.paymentDate)}`);
  parts.push('', `Received From: ${receipt.clientSnapshot.name}`);
  if (receipt.clientSnapshot.email) parts.push(`Email: ${receipt.clientSnapshot.email}`);
  if (receipt.clientSnapshot.phone) parts.push(`Phone: ${receipt.clientSnapshot.phone}`);
  parts.push('', `Amount Paid: ${formatIDR(receipt.amountPaid)}`);
  if (receipt.paymentMethod) parts.push(`Payment Method: ${receipt.paymentMethod}`);
  if (receipt.notes) parts.push('', `Notes: ${receipt.notes}`);
  return parts.join('\n');
}
