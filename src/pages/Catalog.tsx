import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { PackagePlus, Trash2, Plus, X } from 'lucide-react';

export default function Catalog() {
  const items = useLiveQuery(() => db.catalog.orderBy('name').toArray());
  const [isAdding, setIsAdding] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<number | ''>('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newPrice === '') return;

    await db.catalog.add({
      name: newName,
      price: Number(newPrice)
    });

    setNewName('');
    setNewPrice('');
    setIsAdding(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Ingin menghapus item ini dari katalog?")) {
      await db.catalog.delete(id);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Katalog Barang/Jasa</h1>
          <p className="text-[var(--text-sec)]">Kelola daftar item yang sering Anda gunakan.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex flex-shrink-0 items-center justify-center gap-2 bg-[var(--primary)] text-white px-4 py-2.5 rounded-lg font-medium hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" /> Tambah Item
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-[var(--surface)] p-5 rounded-xl border border-[var(--primary)] shadow-md slide-down">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Tambah Baru</h2>
            <button type="button" onClick={() => setIsAdding(false)} className="text-[var(--text-sec)] hover:text-red-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid sm:grid-cols-[1fr_200px] gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-sec)]">Nama Barang/Jasa</label>
              <input 
                value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full border-b border-[var(--border)] focus:border-[var(--primary)] bg-transparent py-2.5 outline-none font-medium" 
                placeholder="e.g. Jasa Desain Web" autoFocus required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-sec)]">Harga Satuan (Rp)</label>
              <input 
                type="text" 
                value={newPrice ? Number(newPrice).toLocaleString('id-ID') : ''} 
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setNewPrice(val ? Number(val) : '');
                }}
                className="w-full border-b border-[var(--border)] focus:border-[var(--primary)] bg-transparent py-2.5 outline-none font-mono" 
                placeholder="0" inputMode="numeric" required
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" className="bg-[var(--text)] text-[var(--bg)] px-6 py-2 rounded-lg font-medium">
              Simpan ke Katalog
            </button>
          </div>
        </form>
      )}

      {!items ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin w-8 h-8 rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <PackagePlus className="w-8 h-8 text-[var(--text-sec)]" />
          </div>
          <p className="text-[var(--text-sec)] font-medium">Katalog masih kosong.</p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1fr_150px_60px] gap-4 bg-[var(--bg)] dark:bg-[var(--bg)] p-4 text-xs font-semibold text-[var(--text-sec)] uppercase tracking-wider border-b border-[var(--border)]">
            <div>Nama Item</div>
            <div className="text-right">Harga Satuan</div>
            <div></div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_150px_60px] gap-4 p-4 items-center hover:bg-[var(--bg)]/50 dark:hover:bg-[var(--bg)]/50 transition-colors">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-right font-mono font-medium">{formatCurrency(item.price)}</div>
                <div className="flex justify-end">
                  <button 
                    onClick={() => item.id && handleDelete(item.id)}
                    className="p-2 text-[var(--text-sec)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
