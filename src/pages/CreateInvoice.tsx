import { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Invoice, type InvoiceItem, type CatalogItem, defaultProfile } from '@/lib/db';
import { generateInvoiceNumber, formatCurrency, cn, invoiceToMarkdown } from '@/lib/utils';
import { Plus, Trash2, FileDown, CheckCircle2, Search } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/InvoicePDF';
import { useNavigate } from 'react-router-dom';

export default function CreateInvoice() {
  const profileRecord = useLiveQuery(() => db.profile.get(1));
  const catalogRecord = useLiveQuery(() => db.catalog.toArray());
  const catalog = catalogRecord || [];
  
  const profile = profileRecord || defaultProfile;
  const navigate = useNavigate();

  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const pastInvoices = useLiveQuery(() => db.invoices.orderBy('createdAt').reverse().toArray());
  const pastClients = useMemo(() => {
    if (!pastInvoices) return [];
    const uniqueClients = new Map();
    pastInvoices.forEach(inv => {
      const key = inv.clientName.toLowerCase().trim();
      if (!uniqueClients.has(key)) {
        uniqueClients.set(key, inv);
      }
    });
    return Array.from(uniqueClients.values());
  }, [pastInvoices]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));

  const [invoiceNo, setInvoiceNo] = useState('');
  
  // Autocomplete Focus Management
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);

  // Auto-generate invoice number on mount
  useEffect(() => {
    const initInvoiceNo = async () => {
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const count = await db.invoices.where('createdAt').aboveOrEqual(todayStart.getTime()).count();
      setInvoiceNo(generateInvoiceNumber(profile.prefix, count));
    };
    initInvoiceNo();
  }, [profile.prefix]);

  const [items, setItems] = useState<InvoiceItem[]>([
    { name: '', qty: 1, price: 0 }
  ]);

  const [taxIncluded, setTaxIncluded] = useState(false);
  const [taxRate, setTaxRate] = useState(11);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'nominal'>('nominal');
  const [notes, setNotes] = useState('');

  const [isSaved, setIsSaved] = useState(false);
  const [savedInvoiceData, setSavedInvoiceData] = useState<Invoice | null>(null);

  // Calculations
  const subtotal = useMemo(() => items.reduce((acc, item) => acc + (item.qty * item.price), 0), [items]);
  const discountAmount = useMemo(() => discountType === 'percentage' ? (subtotal * discount / 100) : discount, [subtotal, discount, discountType]);
  const taxAmount = useMemo(() => taxIncluded ? ((subtotal - discountAmount) * taxRate / 100) : 0, [subtotal, discountAmount, taxIncluded, taxRate]);
  const grandTotal = useMemo(() => Math.max(0, subtotal - discountAmount + taxAmount), [subtotal, discountAmount, taxAmount]);

  const handleAddItem = () => setItems([...items, { name: '', qty: 1, price: 0 }]);
  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };
  
  const selectCatalogItem = (index: number, catItem: CatalogItem) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], name: catItem.name, price: catItem.price };
    setItems(newItems);
    setFocusedItemIndex(null);
  };

  const handleSaveAndGenerate = async () => {
    if (!clientName.trim()) {
      alert("Nama Klien tidak boleh kosong.");
      return;
    }
    
    const invoiceData: Invoice = {
      invoiceNo,
      clientName,
      clientAddress,
      clientEmail,
      issueDate,
      dueDate,
      items: items.filter(i => i.name.trim() !== ''),
      subtotal,
      taxIncluded,
      taxRate,
      discount,
      discountType,
      grandTotal,
      notes,
      createdAt: Date.now()
    };

    if (invoiceData.items.length === 0) {
        alert("Tambahkan setidaknya satu item/barang.");
        return;
    }

    try {
      await db.invoices.add(invoiceData);
      setSavedInvoiceData(invoiceData);
      setIsSaved(true);
      
      // Also potentially save new items to catalog (Optional basic implementation)
      for (const item of invoiceData.items) {
          const exists = await db.catalog.where('name').equalsIgnoreCase(item.name).first();
          if (!exists) {
              await db.catalog.add({ name: item.name, price: item.price });
          }
      }

    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan invoice.");
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientAddress('');
    setClientEmail('');
    setItems([{ name: '', qty: 1, price: 0 }]);
    setNotes('');
    setDiscount(0);
    setTaxIncluded(false);
    setIsSaved(false);
    setSavedInvoiceData(null);
    
    // reset invoice no
    const initInvoiceNo = async () => {
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const count = await db.invoices.where('createdAt').aboveOrEqual(todayStart.getTime()).count();
      setInvoiceNo(generateInvoiceNumber(profile.prefix, count));
    };
    initInvoiceNo();
  };

  return (
    <div className="space-y-6 pb-36 md:pb-10 relative">
      <div>
        <h1 className="text-2xl font-bold mb-2">Buat Invoice</h1>
        <p className="text-[var(--text-sec)]">Isi form di bawah ini untuk membuat tagihan baru. Kalkulasi berjalan otomatis.</p>
      </div>

      {isSaved && savedInvoiceData ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center space-y-6 slide-down">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Invoice Berhasil Dibuat!</h2>
            <p className="text-green-700">Invoice {savedInvoiceData.invoiceNo} untuk {savedInvoiceData.clientName} telah tersimpan.</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <PDFDownloadLink
              document={<InvoicePDF invoice={savedInvoiceData} profile={profile} />}
              fileName={`${savedInvoiceData.invoiceNo}_${savedInvoiceData.clientName}.pdf`}
              className="bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-bold flexitems-center justify-center gap-2 hover:opacity-90 shadow-lg"
            >
              <span className="flex items-center justify-center gap-2">
                <FileDown className="w-5 h-5" /> Download PDF
              </span>
            </PDFDownloadLink>
            <button
              onClick={() => {
                const text = invoiceToMarkdown(savedInvoiceData, profile);
                navigator.clipboard.writeText(text).catch(() => alert('Gagal menyalin ke clipboard'));
              }}
              className="bg-white border text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 ml-2"
            >
              Salin Teks
            </button>
            <button 
              onClick={resetForm}
              className="bg-white border text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 ml-2"
            >
              Buat Baru
            </button>
            <button 
              onClick={() => navigate('/history')}
              className="bg-white border text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 ml-2"
            >
              Lihat Riwayat
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Card: Client Info & Dates */}
          <div className="bg-[var(--surface)] p-5 md:p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-[var(--text-sec)] uppercase tracking-wider">Info Pembeli (Bill To)</h2>
                <div className="space-y-3">
                  <div className="relative">
                    <input 
                      value={clientName} 
                      onChange={e => setClientName(e.target.value)}
                      onFocus={() => setShowClientSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                      className="w-full border-b-2 border-[var(--border)] focus:border-[var(--primary)] placeholder:text-gray-400 bg-transparent py-2 outline-none text-lg font-medium transition-colors" 
                      placeholder="Nama Klien / Perusahaan *"
                    />
                    {showClientSuggestions && clientName && pastClients.length > 0 && (() => {
                      const searchStr = clientName.toLowerCase();
                      const suggestions = pastClients.filter(c => c.clientName.toLowerCase().includes(searchStr) && c.clientName.toLowerCase() !== searchStr);
                      if (suggestions.length === 0) return null;
                      return (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-20">
                          {suggestions.slice(0, 5).map(inv => (
                            <div 
                              key={inv.id} 
                              className="px-4 py-3 hover:bg-[var(--bg)] cursor-pointer transition-colors"
                              onClick={() => {
                                setClientName(inv.clientName);
                                if (!clientAddress) setClientAddress(inv.clientAddress || '');
                                if (!clientEmail) setClientEmail(inv.clientEmail || '');
                                setShowClientSuggestions(false);
                              }}
                            >
                              <div className="font-medium">{inv.clientName}</div>
                              {(inv.clientEmail || inv.clientAddress) && (
                                <div className="text-xs text-[var(--text-sec)] truncate mt-0.5">
                                  {inv.clientEmail} {inv.clientEmail && inv.clientAddress && '•'} {inv.clientAddress}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>


                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-sm font-bold text-[var(--text-sec)] uppercase tracking-wider">Detail Invoice</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-sec)]">Nomor Invoice</label>
                    <input 
                      value={invoiceNo} 
                      onChange={e => setInvoiceNo(e.target.value)}
                      className="w-full border border-[var(--border)] focus:border-[var(--primary)] rounded-lg p-2.5 bg-[#F8F9FA] dark:bg-[#1A1A1A] outline-none font-mono" 
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-sec)]">Tgl Terbit</label>
                        <input 
                          type="date"
                          value={issueDate} 
                          onChange={e => setIssueDate(e.target.value)}
                          className="w-full border border-[var(--border)] focus:border-[var(--primary)] rounded-lg p-2.5 bg-transparent outline-none" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--text-sec)]">Jatuh Tempo</label>
                        <input 
                          type="date"
                          value={dueDate} 
                          onChange={e => setDueDate(e.target.value)}
                          className="w-full border border-[var(--border)] focus:border-[var(--primary)] rounded-lg p-2.5 bg-transparent outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Item List */}
          <div className="bg-[var(--surface)] p-5 md:p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-sec)] uppercase tracking-wider mb-2">Daftar Barang/Jasa</h2>
            
            <div className="space-y-4">
              {/* Header Desktop only */}
              <div className="hidden md:grid grid-cols-[1fr_80px_150px_150px_40px] gap-3 text-xs font-semibold text-[var(--text-sec)] px-2">
                <div>Nama Item</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Harga Satuan</div>
                <div className="text-right">Total</div>
                <div></div>
              </div>

              {items.map((item, idx) => {
                const searchStr = item.name.toLowerCase();
                const suggestions = focusedItemIndex === idx && searchStr.length > 0 
                  ? catalog.filter(c => c.name.toLowerCase().includes(searchStr) && c.name.toLowerCase() !== searchStr)
                  : [];

                return (
                <div key={idx} className="relative grid grid-cols-1 md:grid-cols-[1fr_80px_150px_150px_40px] gap-3 items-start bg-[#F8F9FA] dark:bg-[#1A1A1A] md:bg-transparent p-4 md:p-0 rounded-lg md:rounded-none group slide-down">
                  <div className="space-y-1 relative">
                    <label className="text-xs text-[var(--text-sec)] md:hidden">Nama Item</label>
                    <input 
                      value={item.name} 
                      onChange={e => handleItemChange(idx, 'name', e.target.value)}
                      onFocus={() => setFocusedItemIndex(idx)}
                      onBlur={() => setTimeout(() => setFocusedItemIndex(null), 200)}
                      className="w-full border-b border-[var(--border)] focus:border-[var(--primary)] bg-transparent py-2 outline-none font-medium" 
                      placeholder="Deskripsi jasa/barang" 
                    />
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden z-20">
                        {suggestions.slice(0, 5).map(catItem => (
                          <div 
                            key={catItem.id} 
                            className="px-4 py-2 hover:bg-[var(--bg)] cursor-pointer flex justify-between items-center transition-colors"
                            onClick={() => selectCatalogItem(idx, catItem)}
                          >
                            <span className="font-medium text-sm">{catItem.name}</span>
                            <span className="font-mono text-xs text-[var(--primary-dark)]">{formatCurrency(catItem.price)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-[80px_150px] gap-3 col-span-1">
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--text-sec)] md:hidden">Qty</label>
                      <input 
                        value={item.qty || ''} 
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          handleItemChange(idx, 'qty', val ? Number(val) : 0);
                        }}
                        type="text" inputMode="numeric"
                        className="w-full border-b border-[var(--border)] focus:border-[var(--primary)] bg-transparent py-2 outline-none text-center font-mono" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--text-sec)] md:hidden">Harga</label>
                      <input 
                        value={item.price ? item.price.toLocaleString('id-ID') : ''} 
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          handleItemChange(idx, 'price', val ? Number(val) : 0);
                        }}
                        type="text" inputMode="numeric"
                        className="w-full border-b border-[var(--border)] focus:border-[var(--primary)] bg-transparent py-2 outline-none text-right font-mono" 
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 md:self-center">
                    <label className="text-xs text-[var(--text-sec)] md:hidden">Subtotal</label>
                    <div className="py-2 text-right font-mono font-medium text-[var(--primary-dark)] md:text-[var(--text)]">
                      {formatCurrency(item.qty * item.price)}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleRemoveItem(idx)}
                    className="absolute top-2 right-2 md:static md:mt-2 p-2 text-[var(--text-sec)] hover:text-red-500 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                );
              })}
            </div>

            <button 
              onClick={handleAddItem}
              className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:opacity-80 transition-opacity py-2 px-1 mt-2"
            >
              <Plus className="w-4 h-4" /> Tambah Item
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Notes */}
            <div className="bg-[var(--surface)] p-5 md:p-6 rounded-xl border border-[var(--border)] shadow-sm">
              <h2 className="text-sm font-bold text-[var(--text-sec)] uppercase tracking-wider mb-4">Catatan (Opsional)</h2>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                className="w-full border border-[var(--border)] focus:border-[var(--primary)] rounded-lg p-3 bg-transparent outline-none transition-colors min-h-[120px]" 
                placeholder="" 
              />
            </div>

            {/* Calculations Card */}
            <div className="bg-[var(--surface)] p-5 md:p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[var(--text-sec)] uppercase tracking-wider mb-2">Kalkulasi</h2>
              
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-[var(--text-sec)] font-sans">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between gap-4 py-1">
                  <div className="flex items-center gap-2 w-1/2">
                    <span className="text-[var(--text-sec)] font-sans">Diskon</span>
                    <select 
                      value={discountType} 
                      onChange={e => setDiscountType(e.target.value as 'percentage' | 'nominal')}
                      className="border border-[var(--border)] rounded text-xs p-1 outline-none bg-transparent"
                    >
                      <option value="nominal">Rp</option>
                      <option value="percentage">%</option>
                    </select>
                  </div>
                  <div className="w-1/2 text-right">
                    <input 
                      type="text" inputMode="numeric"
                      value={discount ? discount.toLocaleString('id-ID') : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setDiscount(val ? Number(val) : 0);
                      }}
                      className="w-24 border-b border-[var(--border)] focus:border-[var(--primary)] bg-transparent text-right outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-1">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={taxIncluded}
                        onChange={e => setTaxIncluded(e.target.checked)}
                        className="rounded text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[var(--text-sec)] font-sans">PPN</span>
                    </label>
                    {taxIncluded && (
                      <div className="flex items-center">
                        <input 
                          type="text" inputMode="numeric"
                          value={taxRate || ''}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            let num = val ? Number(val) : 0;
                            if (num > 100) num = 100;
                            setTaxRate(num);
                          }}
                          className="w-12 border-b border-[var(--border)] focus:border-[var(--primary)] bg-transparent text-center outline-none mx-1"
                        />
                        <span className="text-[var(--text-sec)]">%</span>
                      </div>
                    )}
                  </div>
                  {taxIncluded && <span>{formatCurrency(taxAmount)}</span>}
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-[var(--border)]">
                <div className="flex justify-between items-end">
                  <span className="font-bold text-lg">Grand Total</span>
                  <span className="font-mono text-2xl font-bold text-[var(--primary)]">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky CTA Mobile */}
          <div className="fixed md:sticky bottom-16 sm:bottom-4 left-0 right-0 p-4 sm:px-0 bg-[var(--surface)] sm:bg-transparent border-t border-[var(--border)] sm:border-0 z-10 flex justify-end">
            <button 
              onClick={handleSaveAndGenerate}
              disabled={items.length === 0 || !clientName.trim()}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform bg-[var(--primary)] text-white shadow-[var(--primary)]/25 shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Simpan & Generate PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
