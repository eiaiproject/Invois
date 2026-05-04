import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useMemo } from 'react';
import { db, defaultProfile } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { FileDown, FileText, Trash2, Check, TrendingUp, Receipt, DollarSign, Download } from 'lucide-react';
import { invoiceToMarkdown } from '@/lib/utils';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/InvoicePDF';

export default function History() {
  const invoices = useLiveQuery(() => db.invoices.orderBy('createdAt').reverse().toArray());
  const profileRecord = useLiveQuery(() => db.profile.get(1));
  const profile = profileRecord || defaultProfile;
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const stats = useMemo(() => {
    if (!invoices) return { totalSales: 0, count: 0, average: 0 };
    const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const count = invoices.length;
    const average = count > 0 ? totalSales / count : 0;
    return { totalSales, count, average };
  }, [invoices]);

  const handleDelete = async (id: number) => {
    if (confirm("Yakin ingin menghapus invoice ini?")) {
      await db.invoices.delete(id);
    }
  };

  const exportToCSV = () => {
    if (!invoices || invoices.length === 0) return;

    const headers = ['Invoice No', 'Client Name', 'Issue Date', 'Grand Total'];
    const rows = invoices.map(inv => [
      inv.invoiceNo,
      `"${inv.clientName.replace(/"/g, '""')}"`,
      inv.issueDate,
      inv.grandTotal
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `riwayat_invoice_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Riwayat Invoice</h1>
            <p className="text-[var(--text-sec)]">Daftar invoice yang pernah Anda buat. Data tersimpan di perangkat ini.</p>
          </div>
          {invoices && invoices.length > 0 && (
            <button 
              onClick={exportToCSV}
              className="flex items-center justify-center gap-2 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] px-4 py-2 rounded-lg font-medium hover:bg-[var(--bg)] transition-colors text-sm"
            >
              <Download className="w-4 h-4" /> Eksport CSV
            </button>
          )}
        </div>
      </div>

      {invoices && invoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--text-sec)]">Total Penjualan</span>
            </div>
            <p className="text-2xl font-bold font-mono">{formatCurrency(stats.totalSales)}</p>
          </div>
          <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Receipt className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--text-sec)]">Jumlah Invoice</span>
            </div>
            <p className="text-2xl font-bold">{stats.count} <span className="text-sm font-normal text-[var(--text-sec)]">Invoice</span></p>
          </div>
          <div className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--text-sec)]">Rata-rata</span>
            </div>
            <p className="text-2xl font-bold font-mono">{formatCurrency(stats.average)}</p>
          </div>
        </div>
      )}

      {!invoices ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin w-8 h-8 rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[var(--text-sec)]" />
          </div>
          <p className="text-[var(--text-sec)] font-medium">Belum ada invoice yang dibuat.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map(inv => (
            <div key={inv.id} className="bg-[var(--surface)] p-4 md:p-5 rounded-xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-transform hover:scale-[1.01]">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold">{inv.invoiceNo}</span>
                  <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary-dark)] px-2 py-0.5 rounded-full font-medium">
                    Selesai
                  </span>
                </div>
                <p className="font-semibold text-lg">{inv.clientName}</p>
                <p className="text-[var(--text-sec)] text-sm">
                  {format(new Date(inv.issueDate), 'dd MMM yyyy', { locale: localeID })}
                </p>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 border-[var(--border)] pt-4 md:pt-0">
                <div className="text-left md:text-right">
                  <p className="text-xs text-[var(--text-sec)] uppercase tracking-wider mb-1">Total</p>
                  <p className="font-mono font-bold text-[var(--primary-dark)] text-lg">{formatCurrency(inv.grandTotal)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PDFDownloadLink
                    document={<InvoicePDF invoice={inv} profile={profile} />}
                    fileName={`${inv.invoiceNo}_${inv.clientName}.pdf`}
                    className="p-2.5 bg-[var(--primary)]/10 text-[var(--primary-dark)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-colors flex items-center justify-center"
                    title="Download Ulang PDF"
                  >
                    <FileDown className="w-5 h-5" />
                  </PDFDownloadLink>
                  <button
                    onClick={() => {
                      const text = invoiceToMarkdown(inv, profile);
                      navigator.clipboard.writeText(text).then(() => {
                        setCopiedId(inv.id!);
                        setTimeout(() => setCopiedId(null), 2000);
                      }).catch(() => alert('Gagal menyalin ke clipboard'));
                    }}
                    className="p-2.5 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center"
                    title="Salin Teks"
                  >
                    {copiedId === inv.id ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </button>
                  <button 
                    onClick={() => inv.id && handleDelete(inv.id)}
                    className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors flex items-center justify-center"
                    title="Hapus Invoice"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
