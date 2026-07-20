import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardStats, getBusiness } from '../lib/db';
import { formatIDR } from '../lib/format';
import { InfoCircle, Plus } from 'reicon';
import { Reicon } from '../components/Reicon';
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
  const nav = useNavigate();

  useEffect(() => {
    if (!infoOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setInfoOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [infoOpen]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await loadDashboard();
        if (!mounted) return;
        setBiz(data.biz);
        setStats(data.stats);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setLoadError(true);
        setStats({ unpaidTotal: 0, paidTotal: 0, overdueCount: 0, recentDocs: [] });
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!stats) return (
    <div>
      <div className="flex between center">
        <div>
          <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 8, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 16, width: 120, borderRadius: 4 }} />
        </div>
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
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
      <div className="flex between center">
        <div>
          <h1 className="greet">{greet}</h1>
          {biz?.name && <div className="biz-name">{biz.name}</div>}
        </div>
        <button type="button" className="btn btn-ghost btn-icon" onClick={() => setInfoOpen(true)} aria-label="App info" title="App info">
          <Reicon icon={InfoCircle} size={20} />
        </button>
      </div>
      {loadError && <p className="muted mt-8">Dashboard data could not load. Try refreshing the page.</p>}

      <div className="quick-actions hide-mobile">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => nav('/documents/new/invoice')}>
          <Reicon icon={Plus} size={16} />
          Create Invoice
        </button>
        <button type="button" className="btn btn-secondary btn-lg" onClick={() => nav('/documents/new/receipt')}>
          <Reicon icon={Plus} size={16} />
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
          <Reicon icon={Plus} size={16} />
          Create Invoice
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => nav('/documents/new/receipt')}>
          <Reicon icon={Plus} size={16} />
          Create Receipt
        </button>
      </div>
      {infoOpen && (
        <dialog className="scrim" open onClick={() => setInfoOpen(false)} onKeyDown={e => { if (e.key === 'Escape' || e.key === ' ') setInfoOpen(false); }} aria-labelledby="app-info-title">
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 id="app-info-title">App Info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
            <div className="actions" style={{ marginTop: 18 }}>
              <button type="button" className="btn btn-primary" onClick={() => setInfoOpen(false)}>Close</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
