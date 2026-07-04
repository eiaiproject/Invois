import { useEffect, useState } from 'react';
import { getBusiness, saveBusiness } from '../lib/db';
import { useToast } from '../context/toast';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
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
    await saveBusiness(next);
    setInitialForm(next);
    toast('Settings saved.', 'success');
  };

  const update = (key: keyof BusinessProfile, value: any) => {
    if (key === 'name') setNameError('');
    setForm(f => ({ ...f, [key]: value }));
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <div className="card card-pad-lg detail-card">
        <div className="section-title">Business Profile</div>
        <div className="field">
          <label className="field-label" htmlFor="business-name">Business Name *</label>
          <input id="business-name" name="businessName" autoComplete="organization" className="input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your business name…" aria-invalid={!!nameError} aria-describedby={nameError ? 'business-name-error' : undefined} />
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
          <input id="default-tax-rate" name="defaultTaxRate" type="number" className="input num" min="0" max="100" value={form.defaultTaxRate ?? 11} onChange={e => update('defaultTaxRate', parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <button className="btn btn-primary btn-lg btn-block mb-24" onClick={handleSave}>
        Save Settings
      </button>

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
