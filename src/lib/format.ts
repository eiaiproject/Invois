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

/* ─── Greeting ─── */

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ─── Invoice calc ─── */

export interface CalcLine {
  quantity: number;
  price: number;
}

export function calcAmount(qty: number, price: number) {
  return qty * price;
}

export function calcTotals(items: CalcLine[], discount: number, taxRate: number) {
  const subtotal = items.reduce((s, i) => s + calcAmount(i.quantity, i.price), 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const taxAmount = Math.round(afterDiscount * taxRate / 100);
  const total = afterDiscount + taxAmount;
  return { subtotal, discount, taxAmount, total };
}

/* ─── Share copy ─── */

export function shareInvoiceText(clientName: string, number: string, total: string) {
  return `Hi ${clientName}, here is invoice ${number} for ${total}. Please find the attached PDF. Thank you.`;
}

export function shareReceiptText(clientName: string, invoiceNumber: string, receiptNumber: string) {
  return `Hi ${clientName}, payment for ${invoiceNumber} has been received. Here is your receipt ${receiptNumber}. Thank you.`;
}
