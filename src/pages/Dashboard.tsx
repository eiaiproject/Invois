import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardStats, getBusiness } from '../lib/db';
import { seedOnce } from '../lib/seed';
import { formatIDR } from '../lib/format';
import { Info, Plus } from 'lucide-react';
import { Seo } from '../components/SEO';
import type { BusinessProfile } from '../types';

interface Stats {
  unpaidTotal: number;
  paidTotal: number;
  overdueCount: number;
  recentDocs: Array<{
    kind: 'invoice' | 'receipt';
    id: string;
    number: string;
    status: string;
    clientSnapshot?: { name?: string };
    total?: number;
    amountPaid?: number;
  }>;
}

let dashboardLoadPromise: Promise<{ biz: BusinessProfile | undefined; stats: Stats }> | null = null;

async function fetchDashboardData() {
  try {
    // Wait for the first-run seeder so a fresh install shows its sample data.
    await seedOnce();
    return { biz: await getBusiness(), stats: await getDashboardStats() };
  } finally {
    dashboardLoadPromise = null;
  }
}

function loadDashboard() {
  dashboardLoadPromise ??= fetchDashboardData();
  return dashboardLoadPromise;
}

export function Dashboard() {
  const [biz, setBiz] = useState<BusinessProfile | undefined>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const nav = useNavigate();

  const infoDialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dlg = infoDialogRef.current;
    if (!dlg) return;
    if (infoOpen && !dlg.open) dlg.showModal();
    if (!infoOpen && dlg.open) dlg.close();
  }, [infoOpen]);
  useEffect(() => {
    if (!infoOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setInfoOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [infoOpen]);

  useEffect(() => {
    let mounted = true;
    setLoadError(false);
    setStats(null);
    void (async () => {
      try {
        const data = await loadDashboard();
        if (!mounted) return;
        setBiz(data.biz);
        setStats(data.stats);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setLoadError(true);
      }
    })();
    return () => { mounted = false; };
  }, [reloadKey]);

  if (loadError) return (
    <div>
      <Seo title="Dashboard" description="Overview of your invoices and receipts." />
      <div className="empty" role="alert">
        <h3>Dashboard data could not load</h3>
        <p>Your saved data is still on this device. Try again.</p>
        <button type="button" className="btn btn-primary" onClick={() => setReloadKey(key => key + 1)}>Try again</button>
      </div>
    </div>
  );

  if (!stats) return (
    <div>
      <div className="flex between center">
        <div>
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-subtitle" />
        </div>
        <div className="skeleton skeleton-icon" />
      </div>
      <div className="stat-grid mt-24">
        <div className="skeleton skeleton-stat" />
        <div className="skeleton skeleton-stat" />
        <div className="skeleton skeleton-stat" />
      </div>
      <div className="mt-24">
        <div className="skeleton skeleton-section" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </div>
  );

  const h = new Date().getHours();
  let greet: string;
  if (h < 12) greet = 'Good morning';
  else if (h < 17) greet = 'Good afternoon';
  else greet = 'Good evening';

  return (
    <div>
      <Seo title="Dashboard" description="Overview of your invoices and receipts." />
      <div className="flex between center">
        <div>
          <h1 className="greet">{greet}</h1>
          {biz?.name && <div className="biz-name">{biz.name}</div>}
        </div>
        <button type="button" className="btn btn-ghost btn-icon" onClick={() => setInfoOpen(true)} aria-label="App info" title="App info">
          <Info size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="quick-actions hide-mobile">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => nav('/documents/new/invoice')}>
          <Plus size={16} aria-hidden="true" />
          Create Invoice
        </button>
        <button type="button" className="btn btn-secondary btn-lg" onClick={() => nav('/documents/new/receipt')}>
          <Plus size={16} aria-hidden="true" />
          Create Receipt
        </button>
      </div>

      <div className="stat-grid mt-24">
        <div className="stat">
          <span className="label">Unpaid</span>
          <span className={`value num ${stats.unpaidTotal > 0 ? '' : 'muted'}`}>{formatIDR(stats.unpaidTotal)}</span>
        </div>
        <div className="stat">
          <span className="label">Paid this month</span>
          <span className={`value num ${stats.paidTotal > 0 ? 'success' : 'muted'}`}>{formatIDR(stats.paidTotal)}</span>
        </div>
        <div className="stat">
          <span className="label">Overdue</span>
          <span className={`value num ${stats.overdueCount > 0 ? 'danger' : 'muted'}`}>
            {stats.overdueCount} {stats.overdueCount === 1 ? 'invoice' : 'invoices'}
          </span>
        </div>
      </div>

      <div className="mt-24">
        <div className="section-title">Recent Documents</div>
        {stats.recentDocs.length === 0 ? (
          <div className="empty">
            <h3>No documents yet</h3>
            <p>Create your first invoice to get started.</p>
          </div>
        ) : (
          <div className="doc-list">
            {stats.recentDocs.map((doc) => {
              const isInvoice = doc.kind === 'invoice';
              return (
                <Link key={doc.id} to={`/documents/${isInvoice ? 'invoice' : 'receipt'}/${doc.id}`} className="doc-card document-card">
                  <div className="meta">
                    <div className="row1">
                      <span className="num-doc">{doc.number}</span>
                      <span className={`badge badge-${doc.status}`}>{doc.status}</span>
                    </div>
                    <div className="client">
                      {doc.clientSnapshot?.name || 'No client'} · {isInvoice ? 'Invoice' : 'Receipt'}
                    </div>
                  </div>
                  <span className="total num">{formatIDR(isInvoice ? doc.total || 0 : doc.amountPaid || 0)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="mobile-actions hide-desktop">
        <button type="button" className="btn btn-primary btn-block" onClick={() => nav('/documents/new/invoice')}>
          <Plus size={16} aria-hidden="true" />
          Create Invoice
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => nav('/documents/new/receipt')}>
          <Plus size={16} aria-hidden="true" />
          Create Receipt
        </button>
      </div>
      {infoOpen && (
        <dialog ref={infoDialogRef} className="scrim" aria-labelledby="app-info-title" onClose={() => setInfoOpen(false)}>
          <div className="sheet">
            <div className="sheet-handle" aria-hidden="true" />
            <h2 id="app-info-title">App Info</h2>
            <div className="stack-12">
              <div className="item-row">
                <span className="item-name">Version</span>
                <span className="item-meta num">{__APP_VERSION__}</span>
              </div>
              <div className="item-row">
                <span className="item-name">Build Date</span>
                <span className="item-meta">{new Date(__BUILD_DATE__).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="item-row">
                <span className="item-name">Author</span>
                <span className="item-meta">Anggie Irawan</span>
              </div>
              <div className="item-row">
                <span className="item-name">License</span>
                <span className="item-meta">MIT</span>
              </div>
            </div>
            <div className="actions mt-18">
              <button type="button" className="btn btn-primary" onClick={() => setInfoOpen(false)}>Close</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
