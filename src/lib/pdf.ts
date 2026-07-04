import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  // INVOICE label
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  setRGB(doc, C.primary);
  doc.text('INVOICE', w - margin, y, { align: 'right' });
  y += 12;

  // Invoice number
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setRGB(doc, C.muted);
  doc.text('Invoice No', w - margin, y, { align: 'right' });
  y += 4.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setRGB(doc, C.text);
  doc.text(invoice.number, w - margin, y, { align: 'right' });
  y += 4.5;

  // Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setRGB(doc, C.muted);
  doc.text('Date', w - margin, y, { align: 'right' });
  y += 4.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setRGB(doc, C.text);
  doc.text(formatDateISO(invoice.issueDate), w - margin, y, { align: 'right' });
  y += 4.5;

  // Due date
  if (invoice.dueDate) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    setRGB(doc, C.muted);
    doc.text('Due Date', w - margin, y, { align: 'right' });
    y += 4.5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setRGB(doc, C.text);
    doc.text(formatDateISO(invoice.dueDate), w - margin, y, { align: 'right' });
  }
  y += 6;

  // ── Business info (left)
  const bizY = 22;
  let bizX = margin;
  if (biz.name) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    setRGB(doc, C.text);
    doc.text(biz.name, bizX, bizY);
    bizX = margin;
    if (biz.address) {
      setRGB(doc, C.muted);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(biz.address, bizX, bizY + 5.5);
    }
    if (biz.email) {
      setRGB(doc, C.muted);
      doc.setFontSize(9);
      doc.text(biz.email, bizX, bizY + 10.5);
    }
    if (biz.phone) {
      setRGB(doc, C.muted);
      doc.setFontSize(9);
      doc.text(biz.phone, bizX, bizY + 15.5);
    }
  }

  // ── Bill To
  y += 2;
  if (biz.logoUrl) y = 48;
  else y = 42;

  setRGB(doc, C.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin, y);
  y += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setRGB(doc, C.text);
  doc.text(invoice.clientSnapshot.name, margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setRGB(doc, C.muted);
  if (invoice.clientSnapshot.address) { doc.text(invoice.clientSnapshot.address, margin, y); y += 4; }
  if (invoice.clientSnapshot.email) { doc.text(invoice.clientSnapshot.email, margin, y); y += 4; }
  if (invoice.clientSnapshot.phone) { doc.text(invoice.clientSnapshot.phone, margin, y); y += 4; }

  y += 8;

  // ── Items table
  const items = invoice.items.map(item => [
    item.name + (item.description ? `\n${item.description}` : ''),
    String(item.quantity),
    formatIDR(item.price),
    formatIDR(item.amount)
  ]);

  autoTable(doc, {
    startY: y,
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

  y = (doc as any).lastAutoTable.finalY + 6;
  y = ensureSpace(doc, y, 38, margin);

  // ── Totals
  const totalsX = w - margin;
  const labelsX = margin + 80;
  const valsX = totalsX;

  const drawRow = (label: string, val: string, extraY: number, bold = false, color: RGB = C.text) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    setRGB(doc, C.muted);
    doc.text(label, labelsX, y + extraY);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    setRGB(doc, color);
    doc.text(val, valsX, y + extraY, { align: 'right' });
  };

  drawRow('Subtotal', formatIDR(invoice.subtotal), 0);
  if (invoice.discount > 0) drawRow('Discount', `-${formatIDR(invoice.discount)}`, 5);
  drawRow(`Tax (${invoice.taxRate}%)`, formatIDR(invoice.taxAmount), 10);

  // Total box
  y += 16;
  fillRGB(doc, C.surface);
  doc.roundedRect(labelsX - 4, y - 5, valsX - labelsX + 16, 12, 2, 2, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  setRGB(doc, C.primary);
  doc.text('TOTAL', labelsX, y + 2.5);
  doc.text(formatIDR(invoice.total), valsX, y + 2.5, { align: 'right' });

  y += 18;

  // ── Payment
  if (invoice.bankName || invoice.bankAccountNumber || invoice.bankAccountHolder) {
    const paymentRows = [invoice.bankName, invoice.bankAccountNumber, invoice.bankAccountHolder].filter(Boolean).length;
    y = ensureSpace(doc, y, 9 + paymentRows * 4 + 4, margin);
    setRGB(doc, C.muted);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT METHOD', margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    setRGB(doc, C.text);
    if (invoice.bankName) { doc.text(invoice.bankName, margin, y); y += 4; }
    if (invoice.bankAccountNumber) { doc.text(invoice.bankAccountNumber, margin, y); y += 4; }
    if (invoice.bankAccountHolder) { doc.text(invoice.bankAccountHolder, margin, y); y += 4; }
    y += 4;
  }

  // ── Notes
  if (invoice.notes) {
    y = drawTextBlock(doc, 'NOTES', invoice.notes, margin, y, contentW, margin);
  }

  // ── Terms
  if (invoice.terms) {
    y += 4;
    drawTextBlock(doc, 'TERMS', invoice.terms, margin, y, contentW, margin);
  }

  // ── Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  setRGB(doc, C.muted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Generated with Invois', margin, footerY);

  return doc;
}

/* ─── Receipt PDF ─── */

export function generateReceiptPDF(receipt: Receipt, _biz: BusinessProfile): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 28;

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

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text: shareText || '' });
      return true;
    } catch { return false; }
  }
  // Fallback: download
  downloadPDF(doc, filename);
  return false;
}
