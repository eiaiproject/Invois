import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardStats, getBusiness } from '../lib/db';
import { formatIDR } from '../lib/format';
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

function loadDashboard() {
  if (!dashboardLoadPromise) {
    dashboardLoadPromise = (async () => ({
      biz: await getBusiness(),
      stats: await getDashboardStats(),
    }))().finally(() => { dashboardLoadPromise = null; });
  }
  return dashboardLoadPromise;
}

export function Dashboard() {
  const [biz, setBiz] = useState<BusinessProfile | undefined>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState(false);
  const nav = useNavigate();

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

  if (!stats) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>;

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <h1 className="greet">{greet}</h1>
      {biz?.name && <div className="biz-name">{biz.name}</div>}
      {loadError && <p className="muted mt-8">Dashboard data could not load. Try refreshing the page.</p>}

      <div className="quick-actions hide-mobile">
        <button className="btn btn-primary btn-lg" onClick={() => nav('/documents/new/invoice')}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Create Invoice
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => nav('/documents/new/receipt')}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
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
        <button className="btn btn-primary btn-block" onClick={() => nav('/documents/new/invoice')}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Create Invoice
        </button>
        <button className="btn btn-secondary btn-block" onClick={() => nav('/documents/new/receipt')}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Create Receipt
        </button>
      </div>
    </div>
  );
}
