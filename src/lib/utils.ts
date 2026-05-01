import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function generateInvoiceNumber(prefix: string, lastDailyCount: number = 0): string {
  // Simple format: [PREFIX]-[4 Digit Number based on total count]
  // In a robust system this might need more complexity, but for MVP keep it simple.
  const padding = String(lastDailyCount + 1).padStart(4, '0');
  return `${prefix}-${padding}`;
}

import type { Invoice, Profile } from '@/lib/db';

/**
 * Convert an invoice and profile data to a plain‑text markdown representation.
 * This can be copied to clipboard and pasted into chat or email.
 */
export function invoiceToMarkdown(invoice: Invoice, profile: Profile): string {
  const lines: string[] = [];
  // Header
  lines.push(`# INVOICE ${invoice.invoiceNo}`);
  lines.push(`**Tanggal:** ${invoice.issueDate}`);
  lines.push(`**Jatuh Tempo:** ${invoice.dueDate}`);
  lines.push('---');
  // From / To with proportional vertical spacing
  lines.push('**Dari:**');
  lines.push(profile.brandName || '-');
  lines.push('');
  lines.push(profile.ownerName || '');
  lines.push('');
  lines.push(profile.address || '');
  lines.push('');
  lines.push(profile.contact || '');
  lines.push('');
  lines.push('**Kepada:**');
  lines.push(invoice.clientName || '-');
  lines.push('');
  lines.push(invoice.clientAddress || '');
  lines.push('');
  lines.push(invoice.clientEmail || '');
  lines.push('');
  // Items table (simple markdown)
  lines.push('| Deskripsi | Qty | Harga Satuan | Total |');
  lines.push('|---|---|---|---|');
  invoice.items.forEach(item => {
    const total = item.qty * item.price;
    lines.push(`| ${item.name} | ${item.qty} | ${formatCurrency(item.price)} | ${formatCurrency(total)} |`);
  });
  lines.push('');
  // Totals
  lines.push(`**Subtotal:** ${formatCurrency(invoice.subtotal)}`);
  if (invoice.discount > 0) {
    const disc = invoice.discountType === 'percentage' ? `${invoice.discount}%` : formatCurrency(invoice.discount);
    lines.push(`**Diskon (${disc}):** -${formatCurrency(invoice.discountType === 'percentage' ? (invoice.subtotal * invoice.discount / 100) : invoice.discount)}`);
  }
  if (invoice.taxIncluded && invoice.taxRate > 0) {
    const taxBase = invoice.subtotal - (invoice.discountType === 'percentage' ? (invoice.subtotal * invoice.discount / 100) : invoice.discount);
    const tax = taxBase * invoice.taxRate / 100;
    lines.push(`**PPN (${invoice.taxRate}%):** +${formatCurrency(tax)}`);
  }
  lines.push(`**GRAND TOTAL:** **${formatCurrency(invoice.grandTotal)}**`);
  lines.push('');
  if (invoice.notes) {
    lines.push('**Catatan:**');
    lines.push(invoice.notes);
    lines.push('');
  }
  lines.push('_Terima kasih atas kepercayaan Anda._');
  lines.push('');
  // Payment methods
  if (profile.banks && profile.banks.length > 0) {
    lines.push('**Metode Pembayaran:**');
    profile.banks.forEach(bank => {
      lines.push(`- ${bank.bankName}: **${bank.accountNumber}** a.n **${bank.accountName}**`);
    });
    lines.push('');
  }
  lines.push('* Barang yang sudah dibeli tidak dapat dikembalikan');
  return lines.join('\n');
}
