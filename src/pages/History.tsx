import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultProfile } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { FileDown, FileText, Trash2 } from 'lucide-react';
import { invoiceToMarkdown } from '@/lib/utils';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/InvoicePDF';

export default function History() {
  const invoices = useLiveQuery(() => db.invoices.orderBy('createdAt').reverse().toArray());
  const profileRecord = useLiveQuery(() => db.profile.get(1));
  const profile = profileRecord || defaultProfile;

  const handleDelete = async (id: number) => {
    if (confirm("Yakin ingin menghapus invoice ini?")) {
      await db.invoices.delete(id);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold mb-2">riwayat invoice</h1>
        <p className="text-[var(--text-sec)]">Daftar invoice yang pernah Anda buat. Data tersimpan di perangkat ini.</p>
      </div>

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
                      navigator.clipboard.writeText(text).catch(() => alert('Gagal menyalin ke clipboard'));
                    }}
                    className="p-2.5 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center"
                    title="Salin Teks"
                  >
                    <FileText className="w-5 h-5" />
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
