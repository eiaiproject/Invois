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
    ...(invoice.clientSnapshot.email ? [`Email: ${invoice.clientSnapshot.email}`] : []),
    ...(invoice.clientSnapshot.phone ? [`Phone: ${invoice.clientSnapshot.phone}`] : []),
    ...(invoice.clientSnapshot.address ? [`Address: ${invoice.clientSnapshot.address}`] : []),
  ];
  parts.push(...clientParts, '');
  for (const item of invoice.items) {
    const desc = item.description ? ` (${item.description})` : '';
    parts.push(`• ${item.name}${desc} — ${item.quantity} × ${formatIDR(item.price)} = ${formatIDR(item.amount)}`);
  }
  parts.push('');
  const totalsParts: string[] = [
    `Subtotal: ${formatIDR(invoice.subtotal)}`,
    ...(invoice.discount > 0 ? [`Discount: -${formatIDR(invoice.discount)}`] : []),
    `Tax (${invoice.taxRate}%): ${formatIDR(invoice.taxAmount)}`,
    `Total: ${formatIDR(invoice.total)}`,
  ];
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
    ...(receipt.invoiceNumber ? [`Invoice Ref: ${receipt.invoiceNumber}`] : []),
    `Date: ${formatDateISO(receipt.paymentDate)}`,
    '',
    `Received From: ${receipt.clientSnapshot.name}`,
    ...(receipt.clientSnapshot.email ? [`Email: ${receipt.clientSnapshot.email}`] : []),
    ...(receipt.clientSnapshot.phone ? [`Phone: ${receipt.clientSnapshot.phone}`] : []),
    '',
    `Amount Paid: ${formatIDR(receipt.amountPaid)}`,
    ...(receipt.paymentMethod ? [`Payment Method: ${receipt.paymentMethod}`] : []),
    ...(receipt.notes ? ['', `Notes: ${receipt.notes}`] : []),
  ];
  return parts.join('\n');
}
