import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getInvoices, getReceipts, getBusiness } from '../lib/db';
import { formatIDR, formatDateISO } from '../lib/format';
import { Plus, Download } from 'reicon';
import { Reicon } from '../components/Reicon';
import { SEO } from '../components/SEO';

type Doc = { kind: 'invoice' | 'receipt'; data: any };

export function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const firstSheetButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const sheetOpenerRef = useRef<HTMLElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();
  const typeParam = searchParams.get('type');
  const filter: 'all' | 'invoice' | 'receipt' = typeParam === 'invoice' || typeParam === 'receipt' ? typeParam : 'all';
  const search = searchParams.get('q') || '';
  const filterLabels: Record<string, string> = { all: 'All', invoice: 'Invoices', receipt: 'Receipts' };

  const load = async () => {
    try {
      const [invoices, receipts] = await Promise.all([getInvoices(), getReceipts()]);
      const all: Doc[] = [
        ...invoices.map(d => ({ kind: 'invoice' as const, data: d })),
        ...receipts.map(d => ({ kind: 'receipt' as const, data: d })),
      ].sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));
      setDocs(all);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const [invoices, receipts, biz] = await Promise.all([getInvoices(), getReceipts(), getBusiness()]);
      if (!biz) { alert('Please set up your business profile in Settings first.'); return; }
      const { downloadAllAsZip } = await import('../lib/pdf');
      await downloadAllAsZip(invoices, receipts, biz);
    } catch (err) {
      console.error(err);
      alert('Failed to download documents.');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const dlg = sheetRef.current;
    if (!dlg) return;
    if (showSheet && !dlg.open) dlg.showModal();
    if (!showSheet && dlg.open) dlg.close();
  }, [showSheet]);

  useEffect(() => {
    if (!showSheet) return;
    firstSheetButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSheet(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showSheet]);

  useEffect(() => {
    if (showSheet) return;
    sheetOpenerRef.current?.focus();
  }, [showSheet]);

  const openSheet = () => {
    sheetOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowSheet(true);
  };

  const closeSheet = () => setShowSheet(false);

  const updateListState = (next: { q?: string; type?: 'all' | 'invoice' | 'receipt' }) => {
    const params = new URLSearchParams(searchParams);
    if ('q' in next) {
      const q = next.q?.trim() || '';
      if (q) params.set('q', q);
      else params.delete('q');
    }
    if ('type' in next) {
      if (next.type && next.type !== 'all') params.set('type', next.type);
      else params.delete('type');
    }
    setSearchParams(params, { replace: true });
  };

  const filtered = (docs || []).filter(d => {
    if (filter !== 'all' && d.kind !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.data.number?.toLowerCase().includes(q) ||
             d.data.clientSnapshot?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      <SEO title="Documents" description="Manage your invoices and receipts." />
      <div className="page-head">
        <div>
          <h1>Documents</h1>
          <p className="sub">{docs ? `${docs.length} total` : 'Loading…'}</p>
        </div>
        {docs && docs.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={handleDownloadAll} disabled={downloading}>
              <Reicon icon={Download} size={16} />
              {downloading ? 'Downloading…' : 'Download All'}
            </button>
            <button type="button" className="btn btn-primary" onClick={openSheet}>
              <Reicon icon={Plus} size={16} />
              Create
            </button>
          </div>
        )}
      </div>

      {!docs ? (
        <>
          <div className="skeleton" style={{ height: 44, borderRadius: 'var(--radius-md)', marginBottom: 12 }} />
          <div className="filter-row">
            <div className="skeleton" style={{ width: 60, height: 44, borderRadius: 'var(--radius-pill)' }} />
            <div className="skeleton" style={{ width: 80, height: 44, borderRadius: 'var(--radius-pill)' }} />
            <div className="skeleton" style={{ width: 80, height: 44, borderRadius: 'var(--radius-pill)' }} />
          </div>
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </>
      ) : (
        <>
      <input
        className="input search-box"
        aria-label="Search documents"
        placeholder="Search documents…"
        value={search}
        onChange={e => updateListState({ q: e.target.value })}
        enterKeyHint="search"
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      />

      <div className="filter-row">
        {(['all', 'invoice', 'receipt'] as const).map(f => (
          <button type="button" key={f} className={`chip${filter === f ? ' active' : ''}`} aria-pressed={filter === f} onClick={() => updateListState({ type: f })}>
            {filterLabels[f]}
          </button>
        ))}
      </div>

        {filtered.length === 0 ? (
        <div className="empty">
          <h3>{search ? 'No matches' : 'No documents yet'}</h3>
          <p>{search ? 'Try a different search.' : 'Create your first invoice to get started.'}</p>
          {!search && <button type="button" className="btn btn-primary" onClick={() => nav('/documents/new/invoice')}>Create Invoice</button>}
        </div>
      ) : (
        <div className="doc-list">
          {filtered.map(d => (
            <Link key={d.data.id} to={`/documents/${d.kind}/${d.data.id}`} className="doc-card document-card">
              <div className="meta">
                <div className="row1">
                  <span className="num-doc">{d.data.number}</span>
                  <span className={`badge badge-${d.data.status}`}>{d.data.status}</span>
                  <span className="badge badge-type">{d.kind}</span>
                </div>
                <div className="client">
                  {d.data.clientSnapshot?.name || 'No client'} · <span className="num">{formatDateISO(d.data.issueDate || d.data.paymentDate)}</span>
                </div>
              </div>
              <span className="total num">{formatIDR(d.kind === 'invoice' ? d.data.total : d.data.amountPaid)}</span>
            </Link>
          ))}
        </div>
      )}
        </>
      )}

      {showSheet && (
        <dialog ref={sheetRef} className="scrim" aria-label="Close sheet" onClose={() => setShowSheet(false)}>
          <div className="sheet" aria-labelledby="create-document-title">
            <div className="sheet-handle" aria-hidden="true" />
            <h2 id="create-document-title">Create New</h2>
            <button type="button" ref={firstSheetButtonRef} className="btn btn-secondary btn-block mb-12" onClick={() => { setShowSheet(false); nav('/documents/new/invoice'); }}>
              Create Invoice
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => { setShowSheet(false); nav('/documents/new/receipt'); }}>
              Create Receipt
            </button>
            <div className="actions">
              <button type="button" className="btn btn-ghost btn-block" onClick={closeSheet}>Cancel</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
