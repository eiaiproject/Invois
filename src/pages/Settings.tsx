import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultProfile, type Profile, type BankAccount } from '@/lib/db';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';

export default function Settings() {
  const profileRecord = useLiveQuery(() => db.profile.get(1));
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profileRecord) {
      setProfile(profileRecord);
    }
  }, [profileRecord]);

  const handleChange = (field: keyof Profile, value: any) => {
    setProfile(p => ({ ...p, [field]: value }));
    setSaved(false);
  };

  const handleBankChange = (index: number, field: keyof BankAccount, value: string) => {
    const newBanks = [...profile.banks];
    newBanks[index] = { ...newBanks[index], [field]: value };
    handleChange('banks', newBanks);
  };

  const addBank = () => {
    handleChange('banks', [...profile.banks, { bankName: '', accountName: '', accountNumber: '' }]);
  };

  const removeBank = (index: number) => {
    handleChange('banks', profile.banks.filter((_, i) => i !== index));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.2, // 200KB max
        maxWidthOrHeight: 800,
        useWebWorker: true
      });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logoUrl', reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Gagal mengunggah logo');
    }
  };

  const handleSave = async () => {
    if (profileRecord?.id) {
      await db.profile.put({ ...profile, id: profileRecord.id });
    } else {
      await db.profile.add(profile);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const colors = [
    '#10B981', // Teal/Emerald
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#1E293B', // Slate
  ];

  return (
    <div className="space-y-8 pb-36 md:pb-10">
      <div>
        <h1 className="text-2xl font-bold mb-2">Pengaturan Brand</h1>
        <p className="text-[var(--text-sec)]">Atur detail bisnis Anda yang akan tampil pada invoice.</p>
      </div>

      <div className="space-y-6 bg-[var(--surface)] p-5 md:p-6 rounded-xl border border-[var(--border)] shadow-sm">
        <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-3">Profil Perusahaan</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Logo Brand (Maks 200KB)</label>
            <div className="flex items-center gap-4">
              {profile.logoUrl && (
                <div className="w-16 h-16 rounded-lg border border-[var(--border)] overflow-hidden flex items-center justify-center bg-white flex-shrink-0">
                  <img src={profile.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-[var(--text-sec)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)]/10 file:text-[var(--primary)] hover:file:bg-[var(--primary)]/20 transition-colors"
                />
              </div>
              {profile.logoUrl && (
                <button 
                  onClick={() => handleChange('logoUrl', undefined)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nama Brand / Perusahaan</label>
            <input 
              value={profile.brandName} 
              onChange={e => handleChange('brandName', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-shadow" 
              placeholder="e.g. Toko Makmur"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nama Pemilik</label>
            <input 
              value={profile.ownerName} 
              onChange={e => handleChange('ownerName', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-shadow" 
              placeholder="e.g. Budi Santoso"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Alamat</label>
            <textarea 
              value={profile.address} 
              onChange={e => handleChange('address', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-shadow min-h-[80px]" 
              placeholder="Jalan, Kota, Kode Pos"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">No. HP / WhatsApp / Email</label>
            <input 
              value={profile.contact} 
              onChange={e => handleChange('contact', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-shadow" 
              placeholder="0812xxxx / email@domain.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Prefix Nomor Invoice</label>
            <input 
              value={profile.prefix} 
              onChange={e => handleChange('prefix', e.target.value.toUpperCase())}
              className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-shadow uppercase font-mono" 
              placeholder="INV"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6 bg-[var(--surface)] p-5 md:p-6 rounded-xl border border-[var(--border)] shadow-sm">
        <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-3">Tampilan Invoice</h2>
        
        <div className="space-y-3">
          <label className="text-sm font-medium">Warna Aksen Brand</label>
          <div className="flex flex-wrap gap-3">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => handleChange('brandColor', color)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110",
                  profile.brandColor === color ? "border-[var(--text)] scale-110 shadow-md" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
              >
                {profile.brandColor === color && <CheckCircle2 className="w-5 h-5 text-white drop-shadow-sm" />}
              </button>
            ))}
            <div className="relative">
              <input 
                type="color" 
                value={profile.brandColor}
                onChange={e => handleChange('brandColor', e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                title="Pilih Warna Custom"
              />
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 border-dashed border-[var(--text-sec)] text-[var(--text-sec)]"
                )}
                style={{ backgroundColor: !colors.includes(profile.brandColor) ? profile.brandColor : 'transparent' }}
              >
                {!colors.includes(profile.brandColor) ? <span className="text-white drop-shadow-sm font-bold text-xs">Cus</span> : <Plus className="w-5 h-5" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-[var(--surface)] p-5 md:p-6 rounded-xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h2 className="text-lg font-semibold">Rekening & Pembayaran</h2>
          <button 
            onClick={addBank}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:opacity-80 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Tambah Rekening
          </button>
        </div>
        
        {profile.banks.length === 0 ? (
          <p className="text-sm text-[var(--text-sec)] text-center py-4">Belum ada rekening pembayaran tersimpan.</p>
        ) : (
          <div className="space-y-4">
            {profile.banks.map((bank, index) => (
              <div key={index} className="grid gap-3 grid-cols-[1fr_auto] items-start p-4 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-sec)]">Nama Bank / E-Wallet</label>
                    <input 
                      value={bank.bankName} 
                      onChange={e => handleBankChange(index, 'bankName', e.target.value)}
                      className="w-full p-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--primary)] outline-none text-sm font-medium" 
                      placeholder="e.g. Bank BCA / GoPay"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-sec)]">Atas Nama</label>
                    <input 
                      value={bank.accountName} 
                      onChange={e => handleBankChange(index, 'accountName', e.target.value)}
                      className="w-full p-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--primary)] outline-none text-sm" 
                      placeholder="e.g. Budi Santoso"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-[var(--text-sec)]">Nomor Rekening / No HP</label>
                    <input 
                      value={bank.accountNumber} 
                      onChange={e => handleBankChange(index, 'accountNumber', e.target.value)}
                      className="w-full p-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--primary)] outline-none font-mono text-sm" 
                      placeholder="e.g. 1234567890" inputMode="numeric"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => removeBank(index)}
                  className="p-2 text-[var(--text-sec)] hover:text-red-500 hover:bg-red-50 rounded-full transition-colors self-center mt-4 sm:mt-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed sm:sticky bottom-16 sm:bottom-4 left-0 right-0 p-4 sm:px-0 bg-[var(--surface)] sm:bg-transparent border-t border-[var(--border)] sm:border-0 z-10 flex justify-end">
        <button 
          onClick={handleSave}
          className={cn(
            "w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95",
            saved 
              ? "bg-green-500 text-white shadow-green-500/20" 
              : "bg-[var(--primary)] text-white hover:opacity-90 shadow-[var(--primary)]/20"
          )}
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Tersimpan</span>
            </>
          ) : (
            'Simpan Pengaturan'
          )}
        </button>
      </div>
    </div>
  );
}
