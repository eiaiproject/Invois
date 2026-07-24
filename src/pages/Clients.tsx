import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getClients, getClient, saveClient } from '../lib/db';
import { useToast } from '../context/toast';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
import { Plus } from 'reicon';
import { Reicon } from '../components/Reicon';
import { SEO } from '../components/SEO';
import { newId, nowISO } from '../types';
import type { Client } from '../types';

const EMPTY_CLIENT_FORM = {
  name: '', email: '', phone: '', address: '', taxId: '', notes: '',
};

export function Clients() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';

  const load = async () => setClients(await getClients());
  useEffect(() => { load(); }, []);

  const filtered = (clients || []).filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const updateSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    const q = value.trim();
    if (q) params.set('q', q);
    else params.delete('q');
    setSearchParams(params, { replace: true });
  };

  return (
    <div>
      <SEO title="Clients" description="Manage your clients." />
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p className="sub">{clients ? `${clients.length} clients` : 'Loading…'}</p>
        </div>
        {clients && clients.length > 0 && (
          <Link to="/clients/new" className="btn btn-primary">
            <Reicon icon={Plus} size={16} />
            Add Client
          </Link>
        )}
      </div>

      <input
        className="input search-box"
        aria-label="Search clients"
        placeholder="Search clients…"
        value={search}
        onChange={e => updateSearch(e.target.value)}
        enterKeyHint="search"
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      />

      {!clients ? (
        <>
          <div className="skeleton" style={{ height: 44, borderRadius: 'var(--radius-md)', marginBottom: 12 }} />
          <div className="skeleton-row">
            <div className="skeleton skeleton-avatar" />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: 180 }} />
              <div className="skeleton skeleton-text short" />
            </div>
          </div>
          <div className="skeleton-row">
            <div className="skeleton skeleton-avatar" />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: 140 }} />
              <div className="skeleton skeleton-text short" />
            </div>
          </div>
          <div className="skeleton-row">
            <div className="skeleton skeleton-avatar" />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: 160 }} />
              <div className="skeleton skeleton-text short" />
            </div>
          </div>
        </>
      ) : (
        <>
      {filtered.length === 0 ? (
        <div className="empty">
          <h3>{search ? 'No matches' : 'No clients yet'}</h3>
          <p>{search ? 'Try a different search.' : 'Add your first client to save their details for future invoices.'}</p>
          {!search && <Link to="/clients/new" className="btn btn-primary">Add Client</Link>}
        </div>
      ) : (
        <div className="doc-list">
          {filtered.map(c => (
            <Link key={c.id} to={`/clients/${c.id}`} className="doc-card">
              <div className="avatar">{c.name.charAt(0).toUpperCase()}</div>
              <div className="meta">
                <div className="row1">
                  <span className="card-title">{c.name}</span>
                </div>
                <div className="client">{c.email || c.phone || 'No contact info'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
        </>
      )}

    </div>
  );
}

export function ClientEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY_CLIENT_FORM);
  const [initialForm, setInitialForm] = useState(EMPTY_CLIENT_FORM);
  const [nameError, setNameError] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  useUnsavedChanges(dirty);

  useEffect(() => {
    if (!id) return;
    getClient(id).then(c => {
      if (c) {
        const next = { name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '', taxId: c.taxId || '', notes: c.notes || '' };
        setForm(next);
        setInitialForm(next);
      }
    });
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setNameError('Enter a client name.');
      document.getElementById('client-name')?.focus();
      toast('Client name is required.', 'danger');
      return;
    }
    const now = nowISO();
    const existing = id ? await getClient(id) : undefined;
    const client = {
      id: id || newId(),
      name: form.name.trim(),
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      taxId: form.taxId || undefined,
      notes: form.notes || undefined,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await saveClient(client);
    setInitialForm(form);
    toast(isEdit ? 'Client updated.' : 'Client added.', 'success');
    nav('/clients');
  };

  return (
    <div>
      <SEO title={isEdit ? 'Edit Client' : 'New Client'} description="Client details." />
      <div className="page-head">
        <h1>{isEdit ? 'Edit' : 'New'} Client</h1>
      </div>
      <div className="card card-pad-lg">
        <div className="field">
          <label className="field-label" htmlFor="client-name">Client Name *</label>
          <input id="client-name" name="clientName" autoComplete="organization" className="input" value={form.name} onChange={e => { setNameError(''); setForm(f => ({ ...f, name: e.target.value })); }} placeholder="PT Example…" aria-invalid={!!nameError} aria-describedby={nameError ? 'client-name-error' : undefined} />
          {nameError && <div id="client-name-error" className="field-error" role="alert">{nameError}</div>}
        </div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="client-email">Email</label>
            <input id="client-email" name="email" type="email" autoComplete="email" spellCheck={false} className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="hello@example.com…" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="client-phone">Phone / WhatsApp</label>
            <input id="client-phone" name="phone" type="tel" autoComplete="tel" className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+62 812-…" />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="client-address">Address</label>
          <textarea id="client-address" name="address" autoComplete="street-address" className="textarea" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address…" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="client-tax-id">NPWP / NIK (optional)</label>
          <input id="client-tax-id" name="taxId" autoComplete="off" className="input" value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} placeholder="Tax ID or ID number…" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="client-notes">Notes (optional)</label>
          <textarea id="client-notes" name="notes" autoComplete="off" className="textarea" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any internal notes…" />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={handleSave}>{isEdit ? 'Save Changes' : 'Add Client'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => nav('/clients')}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
