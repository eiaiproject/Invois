import { useEffect, useRef, useState } from 'react';
import { getBusiness, saveBusiness, exportAllData, importAllData, type ExportData } from '../lib/db';
import { useToast } from '../context/toast';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
import { Download, Upload } from 'reicon';
import { Reicon } from '../components/Reicon';
import { SEO } from '../components/SEO';
import type { BusinessProfile } from '../types';

const DEFAULT: BusinessProfile = {
  id: 'biz-1',
  name: '',
  email: '',
  phone: '',
  address: '',
  taxId: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountHolder: '',
  defaultNotes: 'Thank you for your business.',
  defaultTerms: 'Payment is due within 7 days.',
  defaultTaxRate: 11,
};

export function Settings() {
  const [form, setForm] = useState<BusinessProfile>(DEFAULT);
  const [initialForm, setInitialForm] = useState<BusinessProfile>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [nameError, setNameError] = useState('');
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const dirty = !loading && JSON.stringify(form) !== JSON.stringify(initialForm);
  useUnsavedChanges(dirty);

  useEffect(() => {
    getBusiness().then(b => {
      if (b) {
        setForm(b);
        setInitialForm(b);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      toast('Could not load business profile.', 'danger');
    });
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setNameError('Enter your business name.');
      document.getElementById('business-name')?.focus();
      toast('Business name is required.', 'danger');
      return;
    }
    const next = { ...form, id: form.id || 'biz-1' };
    try {
      await saveBusiness(next);
      setInitialForm(next);
      toast('Settings saved.', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to save settings. Please try again.', 'danger');
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `invois-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Data exported successfully.', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to export data.', 'danger');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Importing will merge data with your existing records. Continue?')) {
      if (importRef.current) importRef.current.value = '';
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;
      const result = await importAllData(data);
      const total = Object.values(result.counts).reduce((s, n) => s + n, 0);
      toast(`Imported ${total} records successfully.`, 'success');
      // Reload to reflect changes
      window.location.reload();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to import data.';
      toast(msg, 'danger');
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const update = (key: keyof BusinessProfile, value: string | number | undefined) => setForm(f => ({ ...f, [key]: value }));

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>;

  return (
    <div>
      <SEO title="Settings" description="Business profile, export, and import settings." />
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <div className="card card-pad-lg detail-card">
        <div className="section-title">Business Profile</div>
        <div className="field">
          <label className="field-label" htmlFor="business-name">Business Name *</label>
          <input id="business-name" name="businessName" autoComplete="organization" className="input" value={form.name} onChange={e => { setNameError(''); update('name', e.target.value); }} placeholder="Your business name…" aria-invalid={!!nameError} aria-describedby={nameError ? 'business-name-error' : undefined} />
          {nameError && <div id="business-name-error" className="field-error" role="alert">{nameError}</div>}
        </div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="business-email">Email</label>
            <input id="business-email" name="email" type="email" autoComplete="email" spellCheck={false} className="input" value={form.email || ''} onChange={e => update('email', e.target.value)} placeholder="hello@business.com…" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="business-phone">Phone / WhatsApp</label>
            <input id="business-phone" name="phone" type="tel" autoComplete="tel" className="input" value={form.phone || ''} onChange={e => update('phone', e.target.value)} placeholder="+62 812-…" />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="business-address">Address</label>
          <textarea id="business-address" name="address" autoComplete="street-address" className="textarea" rows={2} value={form.address || ''} onChange={e => update('address', e.target.value)} placeholder="Full business address…" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="business-tax-id">NPWP (optional)</label>
          <input id="business-tax-id" name="taxId" autoComplete="off" className="input" value={form.taxId || ''} onChange={e => update('taxId', e.target.value)} placeholder="Tax ID number…" />
        </div>
      </div>

      <div className="card card-pad-lg detail-card">
        <div className="section-title">Bank Details</div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="bank-name">Bank Name</label>
            <input id="bank-name" name="bankName" autoComplete="off" className="input" value={form.bankName || ''} onChange={e => update('bankName', e.target.value)} placeholder="Bank BCA…" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="bank-account-number">Account Number</label>
            <input id="bank-account-number" name="bankAccountNumber" autoComplete="off" className="input num" value={form.bankAccountNumber || ''} onChange={e => update('bankAccountNumber', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="bank-account-holder">Account Holder</label>
          <input id="bank-account-holder" name="bankAccountHolder" autoComplete="off" className="input" value={form.bankAccountHolder || ''} onChange={e => update('bankAccountHolder', e.target.value)} />
        </div>
      </div>

      <div className="card card-pad-lg detail-card">
        <div className="section-title">Document Defaults</div>
        <div className="field">
          <label className="field-label" htmlFor="default-notes">Default Notes</label>
          <textarea id="default-notes" name="defaultNotes" autoComplete="off" className="textarea" rows={2} value={form.defaultNotes || ''} onChange={e => update('defaultNotes', e.target.value)} placeholder="Thank you for your business…" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="default-terms">Default Terms</label>
          <textarea id="default-terms" name="defaultTerms" autoComplete="off" className="textarea" rows={2} value={form.defaultTerms || ''} onChange={e => update('defaultTerms', e.target.value)} placeholder="Payment is due within 7 days…" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="default-tax-rate">Default Tax Rate (%)</label>
          <input id="default-tax-rate" name="defaultTaxRate" type="number" className="input num" min="0" max="100" value={form.defaultTaxRate ?? 11} onChange={e => update('defaultTaxRate', Number.parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <button type="button" className="btn btn-primary btn-lg btn-block mb-24" onClick={handleSave}>
        Save Settings
      </button>

      {/* ── Data Backup ── */}
      <div className="card card-pad-lg detail-card">
        <div className="section-title">Data Backup</div>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 14 }}>
          Export your invoices, receipts, clients, and items as a JSON file. Import to restore on this or another device.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            <Reicon icon={Download} size={16} />
            Export Data
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => importRef.current?.click()} disabled={importing}>
            <Reicon icon={Upload} size={16} />
            {importing ? 'Importing…' : 'Import Data'}
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
      </div>

      <div className="card card-pad detail-card">
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          This invoice is a commercial invoice and not an official tax invoice unless stated otherwise.
          <br />
          <span style={{ fontStyle: 'italic' }}>Invoice ini adalah dokumen tagihan komersial dan bukan Faktur Pajak resmi kecuali dinyatakan lain.</span>
        </p>
      </div>
    </div>
  );
}
