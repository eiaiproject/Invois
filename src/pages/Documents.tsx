import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getInvoices, getReceipts, getBusiness } from '../lib/db';
import { seedOnce } from '../lib/seed';
import { formatIDR, formatDateISO } from '../lib/format';
import { effectiveInvoiceStatus } from '../types';
import type { Invoice, Receipt } from '../types';
import { useToast } from '../context/toastContext';
import { Plus, Download } from 'lucide-react';
import { Seo } from '../components/SEO';

type Doc = { kind: 'invoice'; data: Invoice } | { kind: 'receipt'; data: Receipt };

export function Documents() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const firstSheetButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const sheetOpenerRef = useRef<HTMLElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const typeParam = searchParams.get('type');
  const filter: 'all' | 'invoice' | 'receipt' = typeParam === 'invoice' || typeParam === 'receipt' ? typeParam : 'all';
  const search = searchParams.get('q') || '';
  const hasQuery = !!search.trim();
  const filterLabels: Record<string, string> = { all: 'All', invoice: 'Invoices', receipt: 'Receipts' };

  const load = async () => {
    setError(false);
    try {
      await seedOnce();
      const [invoices, receipts] = await Promise.all([getInvoices(), getReceipts()]);
      const all: Doc[] = [
        ...invoices.map(d => ({ kind: 'invoice' as const, data: d })),
        ...receipts.map(d => ({ kind: 'receipt' as const, data: d })),
      ].sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));
      setDocs(all);
    } catch (err) {
      console.error(err);
      setError(true);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const [invoices, receipts, biz] = await Promise.all([getInvoices(), getReceipts(), getBusiness()]);
      if (!biz) { toast('Set up your business profile in Settings first.', 'danger'); return; }
      const { downloadAllAsZip } = await import('../lib/pdf');
      await downloadAllAsZip(invoices, receipts, biz);
    } catch (err) {
      console.error(err);
      toast('Failed to download documents.', 'danger');
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
      const q = next.q ?? '';
      if (q.trim()) params.set('q', q);
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
    const q = search.trim().toLowerCase();
    if (q) {
      return d.data.number?.toLowerCase().includes(q) ||
             d.data.clientSnapshot?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  const emptyCopy = {
    all: { title: 'No documents yet', body: 'Create an invoice or a receipt to get started.' },
    invoice: { title: 'No invoices yet', body: 'Create your first invoice to get started.' },
    receipt: { title: 'No receipts yet', body: 'Create a receipt for a payment you received.' },
  }[filter];
  const emptyTitle = hasQuery ? 'No matches' : emptyCopy.title;
  const emptyBody = hasQuery ? 'Try a different search.' : emptyCopy.body;
  const showCreate = !hasQuery;
  const createType = filter === 'receipt' ? 'receipt' : 'invoice';

  let summary = 'Loading…';
  if (docs) summary = `${docs.length} total`;
  else if (error) summary = 'Could not load';

  let content: ReactNode;
  if (!docs) {
    content = error ? (
      <div className="empty" role="alert">
        <h3>Could not load documents</h3>
        <p>Your saved documents are still on this device. Try again.</p>
        <button type="button" className="btn btn-primary" onClick={() => void load()}>Try again</button>
      </div>
    ) : (
      <>
        <div className="skeleton skeleton-search" />
        <div className="filter-row">
          <div className="skeleton skeleton-chip skeleton-chip-sm" />
          <div className="skeleton skeleton-chip" />
          <div className="skeleton skeleton-chip" />
        </div>
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </>
    );
  } else {
    content = (
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
            <h3>{emptyTitle}</h3>
            <p>{emptyBody}</p>
            <div className="empty-actions">
              {showCreate && (
                <button type="button" className="btn btn-primary" onClick={() => nav(`/documents/new/${createType}`)}>
                  Create {createType === 'receipt' ? 'Receipt' : 'Invoice'}
                </button>
              )}
              {showCreate && filter === 'all' && (
                <button type="button" className="btn btn-secondary" onClick={() => nav('/documents/new/receipt')}>
                  Create Receipt
                </button>
              )}
              {hasQuery && (
                <button type="button" className="btn btn-secondary" onClick={() => updateListState({ q: '' })}>
                  Clear search
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="doc-list">
            {filtered.map(d => {
              const status = d.kind === 'invoice' ? effectiveInvoiceStatus(d.data) : d.data.status;
              return (
                <Link key={d.data.id} to={`/documents/${d.kind}/${d.data.id}`} className="doc-card document-card">
                  <div className="meta">
                    <div className="row1">
                      <span className="num-doc">{d.data.number}</span>
                      <span className={`badge badge-${status}`}>{status}</span>
                      <span className="badge badge-type">{d.kind}</span>
                    </div>
                    <div className="client">
                      {d.data.clientSnapshot?.name || 'No client'} · <span className="num">{formatDateISO(d.kind === 'invoice' ? d.data.issueDate : d.data.paymentDate)}</span>
                    </div>
                  </div>
                  <span className="total num">{formatIDR(d.kind === 'invoice' ? d.data.total : d.data.amountPaid)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      <Seo title="Documents" description="Manage your invoices and receipts." />
      <div className="page-head">
        <div>
          <h1>Documents</h1>
          <p className="sub">{summary}</p>
        </div>
        {docs && docs.length > 0 && (
          <div className="toolbar-row">
            <button type="button" className="btn btn-secondary" onClick={handleDownloadAll} disabled={downloading}>
              <Download size={16} aria-hidden="true" />
              {downloading ? 'Downloading…' : 'Download All'}
            </button>
            <button type="button" className="btn btn-primary" onClick={openSheet}>
              <Plus size={16} aria-hidden="true" />
              Create
            </button>
          </div>
        )}
      </div>

      {content}

      {showSheet && (
        <dialog ref={sheetRef} className="scrim" aria-labelledby="create-document-title" onClose={() => setShowSheet(false)}>
          <div className="sheet">
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
