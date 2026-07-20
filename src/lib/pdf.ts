import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import type { Invoice, Receipt, BusinessProfile } from '../types';
import { formatIDR, formatDateISO } from './format';

/* ─── Colors (RGB) ─── */
const C = {
  primary: [54, 64, 45] as [number, number, number],
  accent: [166, 138, 100] as [number, number, number],
  text: [40, 37, 31] as [number, number, number],
  muted: [111, 106, 95] as [number, number, number],
  border: [221, 216, 201] as [number, number, number],
  surface: [241, 237, 227] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [79, 125, 90] as [number, number, number],
  successBg: [229, 239, 231] as [number, number, number],
};

type RGB = [number, number, number];

function setRGB(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }
function fillRGB(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }

function pageBottom(doc: jsPDF, margin = 20) {
  return doc.internal.pageSize.getHeight() - margin;
}

function ensureSpace(doc: jsPDF, y: number, needed: number, margin = 20) {
  if (y + needed <= pageBottom(doc, margin)) return y;
  doc.addPage();
  return margin;
}

function drawTextBlock(doc: jsPDF, title: string, text: string, x: number, y: number, maxWidth: number, margin = 20) {
  const lineHeight = 4.5;
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  y = ensureSpace(doc, y, 10, margin);

  setRGB(doc, C.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setRGB(doc, C.text);
  for (const line of lines) {
    if (y + lineHeight > pageBottom(doc, margin)) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

/* ─── Invoice PDF helpers ─── */

function drawInvoiceMeta(doc: jsPDF, invoice: Invoice, w: number, margin: number, startY: number): number {
  let y = startY;
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  setRGB(doc, C.primary);
  doc.text('INVOICE', w - margin, y, { align: 'right' });
  y += 12;

  const label = (txt: string) => {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); setRGB(doc, C.muted);
    doc.text(txt, w - margin, y, { align: 'right' }); y += 4.5;
  };
  const value = (txt: string) => {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); setRGB(doc, C.text);
    doc.text(txt, w - margin, y, { align: 'right' }); y += 4.5;
  };

  label('Invoice No'); value(invoice.number);
  label('Date'); value(formatDateISO(invoice.issueDate));
  if (invoice.dueDate) { label('Due Date'); value(formatDateISO(invoice.dueDate)); }
  return y + 6;
}

function drawBizInfo(doc: jsPDF, biz: BusinessProfile, margin: number): void {
  if (!biz.name) return;
  const x = margin;
  const startY = 22;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setRGB(doc, C.text);
  doc.text(biz.name, x, startY);
  let oy = 5.5;
  if (biz.address) {
    setRGB(doc, C.muted); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(biz.address, x, startY + oy); oy += 5;
  }
  if (biz.email) {
    setRGB(doc, C.muted); doc.setFontSize(9);
    doc.text(biz.email, x, startY + oy); oy += 5;
  }
  if (biz.phone) {
    setRGB(doc, C.muted); doc.setFontSize(9);
    doc.text(biz.phone, x, startY + oy);
  }
}

function drawBillTo(doc: jsPDF, invoice: Invoice, margin: number, startY: number): number {
  let y = startY;
  setRGB(doc, C.muted); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin, y); y += 5;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setRGB(doc, C.text);
  doc.text(invoice.clientSnapshot.name, margin, y); y += 5;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); setRGB(doc, C.muted);
  if (invoice.clientSnapshot.address) { doc.text(invoice.clientSnapshot.address, margin, y); y += 4; }
  if (invoice.clientSnapshot.email) { doc.text(invoice.clientSnapshot.email, margin, y); y += 4; }
  if (invoice.clientSnapshot.phone) { doc.text(invoice.clientSnapshot.phone, margin, y); y += 4; }
  return y + 8;
}

function drawInvoiceItems(doc: jsPDF, invoice: Invoice, margin: number, startY: number): number {
  const items = invoice.items.map(item => [
    item.name + (item.description ? `\n${item.description}` : ''),
    String(item.quantity),
    formatIDR(item.price),
    formatIDR(item.amount)
  ]);
  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin },
    head: [['Description', 'Qty', 'Price', 'Amount']],
    body: items,
    styles: { fontSize: 9, cellPadding: 5, textColor: C.text, halign: 'left' as const },
    headStyles: { fillColor: C.surface, textColor: C.muted, fontStyle: 'bold' as const, fontSize: 8, cellPadding: 4, halign: 'left' as const },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' as const },
      1: { cellWidth: 18, halign: 'center' as const },
      2: { cellWidth: 32, halign: 'right' as const },
      3: { cellWidth: 32, halign: 'right' as const },
    },
    theme: 'plain',
    didDrawCell: (data) => {
      if (data.section === 'body') {
        setRGB(doc, C.border);
        doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  });
  return ensureSpace(doc, (doc as any).lastAutoTable.finalY + 6, 38, margin);
}

function drawTotals(doc: jsPDF, invoice: Invoice, margin: number, y: number): number {
  const w = doc.internal.pageSize.getWidth();
  const valsX = w - margin;
  const labelsX = margin + 80;

  const row = (label: string, val: string, offset: number, bold = false, color: RGB = C.text) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    setRGB(doc, C.muted);
    doc.text(label, labelsX, y + offset);
    setRGB(doc, color);
    doc.text(val, valsX, y + offset, { align: 'right' });
  };

  row('Subtotal', formatIDR(invoice.subtotal), 0);
  if (invoice.discount > 0) row('Discount', `-${formatIDR(invoice.discount)}`, 5);
  row(`Tax (${invoice.taxRate}%)`, formatIDR(invoice.taxAmount), 10);

  y += 16;
  fillRGB(doc, C.surface);
  doc.roundedRect(labelsX - 4, y - 5, valsX - labelsX + 16, 12, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  setRGB(doc, C.primary);
  doc.text('TOTAL', labelsX, y + 2.5);
  doc.text(formatIDR(invoice.total), valsX, y + 2.5, { align: 'right' });
  y += 18;
  return y;
}

function drawPaymentInfo(doc: jsPDF, invoice: Invoice, margin: number, y: number, contentW: number): number {
  if (!invoice.bankName && !invoice.bankAccountNumber && !invoice.bankAccountHolder) return y;
  const paymentRows = [invoice.bankName, invoice.bankAccountNumber, invoice.bankAccountHolder].filter(Boolean).length;
  y = ensureSpace(doc, y, 9 + paymentRows * 4 + 4, margin);
  setRGB(doc, C.muted); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT METHOD', margin, y); y += 5;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); setRGB(doc, C.text);
  if (invoice.bankName) { doc.text(invoice.bankName, margin, y); y += 4; }
  if (invoice.bankAccountNumber) { doc.text(invoice.bankAccountNumber, margin, y); y += 4; }
  if (invoice.bankAccountHolder) { doc.text(invoice.bankAccountHolder, margin, y); y += 4; }
  y += 4;
  return y;
}

function drawFooter(doc: jsPDF): void {
  const footerY = doc.internal.pageSize.getHeight() - 12;
  setRGB(doc, C.muted); doc.setFontSize(7); doc.setFont('helvetica', 'italic');
  doc.text('Generated with Invois', 20, footerY);
}

/* ─── Invoice PDF ─── */

export function generateInvoicePDF(invoice: Invoice, biz: BusinessProfile): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = w - margin * 2;
  let y = 22;

  // ── Header
  if (biz.logoUrl) {
    try { doc.addImage(biz.logoUrl, margin, y, 14, 14); } catch { /* skip */ }
    y += 18;
  }

  y = drawInvoiceMeta(doc, invoice, w, margin, y);
  drawBizInfo(doc, biz, margin);

  // ── Bill To
  y = biz.logoUrl ? 48 : 42;
  y = drawBillTo(doc, invoice, margin, y);

  // ── Items table
  y = drawInvoiceItems(doc, invoice, margin, y);

  // ── Totals
  y = drawTotals(doc, invoice, margin, y);

  // ── Payment
  y = drawPaymentInfo(doc, invoice, margin, y, contentW);

  // ── Notes
  if (invoice.notes) y = drawTextBlock(doc, 'NOTES', invoice.notes, margin, y, contentW, margin);

  // ── Terms
  if (invoice.terms) { y += 4; drawTextBlock(doc, 'TERMS', invoice.terms, margin, y, contentW, margin); }

  // ── Footer
  drawFooter(doc);
  return doc;
}

/* ─── Receipt PDF ─── */

export function generateReceiptPDF(receipt: Receipt, biz: BusinessProfile): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 22;

  // ── Business info (left)
  if (biz.name) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    setRGB(doc, C.text);
    doc.text(biz.name, margin, y);
    if (biz.address) {
      setRGB(doc, C.muted);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(biz.address, margin, y + 5.5);
    }
    if (biz.email) {
      setRGB(doc, C.muted);
      doc.setFontSize(9);
      doc.text(biz.email, margin, y + 10.5);
    }
  }

  // ── Title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  setRGB(doc, C.primary);
  doc.text('RECEIPT', w - margin, y, { align: 'right' });

  y += 16;

  // ── Payment received
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  setRGB(doc, C.text);
  doc.text('Payment received', margin, y);
  y += 10;

  // ── PAID badge
  fillRGB(doc, C.successBg);
  const badgeText = 'PAID';
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const badgeW = doc.getTextWidth(badgeText) + 12;
  doc.roundedRect(margin, y - 4, badgeW, 10, 2, 2, 'F');
  setRGB(doc, C.success);
  doc.text(badgeText, margin + 6, y + 2.5);
  y += 16;

  // ── Receipt info
  const leftX = margin;
  const rightX = w - margin;
  const lineH = 6;

  const drawField = (label: string, val: string, offset: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setRGB(doc, C.muted);
    doc.text(label, leftX, y + offset);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setRGB(doc, C.text);
    doc.text(val, rightX, y + offset, { align: 'right' });
  };

  drawField('Receipt No', receipt.number, 0);
  if (receipt.invoiceNumber) drawField('Invoice Ref', receipt.invoiceNumber, lineH);
  drawField('Payment Date', formatDateISO(receipt.paymentDate), receipt.invoiceNumber ? lineH * 2 : lineH);
  if (receipt.paymentMethod) drawField('Payment Method', receipt.paymentMethod, receipt.invoiceNumber ? lineH * 3 : lineH * 2);

  y += (receipt.invoiceNumber ? lineH * 3 : lineH * 2) + lineH + 6;

  // Divider
  setRGB(doc, C.border);
  doc.line(margin, y, w - margin, y);
  y += 8;

  // ── Received from
  drawField('Received From', receipt.clientSnapshot.name, 0);
  y += lineH + 10;

  // ── Amount paid (hero)
  setRGB(doc, C.muted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount Paid', margin, y);
  y += 8;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  setRGB(doc, C.primary);
  doc.text(formatIDR(receipt.amountPaid), margin, y);

  y += 16;

  // ── Notes
  if (receipt.notes) {
    drawTextBlock(doc, 'NOTES', receipt.notes, margin, y, w - margin * 2, margin);
  }

  // ── Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  setRGB(doc, C.muted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you. Payment has been received.', margin, footerY - 6);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Generated with Invois', margin, footerY);

  return doc;
}

/* ─── Download helpers ─── */

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export async function sharePDF(doc: jsPDF, filename: string, shareText?: string): Promise<boolean> {
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text: shareText ?? '' });
      return true;
    } catch { return false; }
  }
  // Fallback: download
  downloadPDF(doc, filename);
  return false;
}

/* ─── Download all as ZIP ─── */

export async function downloadAllAsZip(
  invoices: Invoice[],
  receipts: Receipt[],
  biz: BusinessProfile
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('invois-documents');
  if (!folder) return;

  for (const inv of invoices) {
    const doc = generateInvoicePDF(inv, biz);
    const blob = doc.output('blob');
    folder.file(`${inv.number}.pdf`, blob);
  }

  for (const rec of receipts) {
    const doc = generateReceiptPDF(rec, biz);
    const blob = doc.output('blob');
    folder.file(`${rec.number}.pdf`, blob);
  }

  const zipBlob = await folder.generateAsync({ type: 'blob' });
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invois-documents-${date}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
