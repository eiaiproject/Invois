import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Check, DocumentText, Share } from 'reicon';
import { Reicon } from '../components/Reicon';
import { SEO } from '../components/SEO';

const navLinks = [
  { label: 'How it works', href: '#workflow' },
  { label: 'What you get', href: '#features' },
  { label: 'Limits', href: '#trust' },
];

export function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Sticky header shadow
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Scroll-triggered reveals
  useEffect(() => {
    const container = rootRef.current;
    if (!container) return;
    const els = container.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) return;
    container.classList.add('reveal-ready');

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Close mobile nav on escape or anchor click
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileNavOpen]);

  // Smooth scroll for anchor links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute('href')?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Keyboard section navigation (1-3 keys jump to sections)
  useEffect(() => {
    const sectionIds = ['workflow', 'features', 'trust'];
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const num = Number.parseInt(e.key);
      if (num >= 1 && num <= 3) {
        const el = document.getElementById(sectionIds[num - 1]);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="landing" ref={rootRef}>
      <SEO title="Invoice & Receipt Maker" description="Offline-first invoice and receipt maker for freelancers and small businesses. Create invoices, generate receipts, and export PDFs from any device." />
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* ── Header ── */}
      <header className={`l-header${scrolled ? ' scrolled' : ''}`}>
        <div className="l-header-inner">
          <Link to="/" className="brand" aria-label="Invois home">
            <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
            <span>Invois</span>
          </Link>

          {/* Desktop nav */}
          <nav className="l-nav" aria-label="Main navigation">
            {navLinks.map(l => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>

          <div className="l-header-actions">
            <Link to="/dashboard" className="btn btn-secondary btn-sm">Dashboard</Link>
            {/* Mobile hamburger */}
            <button
              type="button"
              className="l-hamburger"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              <Reicon icon={mobileNavOpen ? X : Menu} size={20} />
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        <nav
          id="mobile-nav"
          className={`l-mobile-nav${mobileNavOpen ? ' open' : ''}`}
          aria-label="Mobile navigation"
        >
          {navLinks.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileNavOpen(false)}
            >{l.label}</a>
          ))}
        </nav>
      </header>

      <main id="main-content">
        {/* ── Hero ── */}
        <section className="l-hero">
          <div className="l-hero-inner">
            <div className="l-hero-text">
              <h1 className="l-hero-heading">Invoice and receipt maker that works offline.</h1>
              <p>
                Create invoices, convert paid work to receipts,
                and share PDFs — from any device, with no internet needed.
              </p>
              <div className="l-hero-actions">
                <Link to="/documents/new/invoice" className="btn btn-primary btn-lg l-cta-primary">
                  Create Invoice
                </Link>
                <Link to="/dashboard" className="btn btn-secondary btn-lg">Go to Dashboard</Link>
              </div>
              <ul className="l-hero-assurance" aria-label="Trust notes">
                <li>Works offline</li>
                <li>Data stays on this device</li>
                <li>PDF export, phone &amp; desktop</li>
              </ul>
            </div>

            {/* ── Product preview ── */}
            <div
              className="l-preview"
              role="img"
              aria-label="Example invoice for Acme Corp with line items, a $4,180 total, paid status, PDF export, share action, and a matching receipt preview."
            >
              <div className="l-preview-stage" aria-hidden="true">
                {/* Invoice card */}
                <div className="l-invoice-card">
                  <div className="l-invoice-header">
                    <div className="l-invoice-row">
                      <div>
                        <div className="l-invoice-label">Document</div>
                        <div className="l-invoice-title">Invoice</div>
                      </div>
                      <div className="l-invoice-number-block">
                        <div className="l-invoice-label">Number</div>
                        <div className="l-invoice-number">INV-2026-07-0001</div>
                      </div>
                    </div>
                    <div className="l-invoice-meta">
                      <div className="l-invoice-meta-item">
                        Issued <strong>Jul 4, 2026</strong>
                      </div>
                      <div className="l-invoice-meta-item">
                        Due <strong>Jul 11, 2026</strong>
                      </div>
                    </div>
                  </div>

                  <div className="l-client-row">
                    <div className="l-client-avatar">AC</div>
                    <div className="l-client-info">
                      <div className="l-client-name">Acme Corp</div>
                      <div className="l-client-email">billing@acme.com</div>
                    </div>
                  </div>

                  <div className="l-items">
                    <table>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className="qty-col">Qty</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="name-col">Website Redesign</td>
                          <td className="qty-col">1</td>
                          <td className="amount-col">$2,400.00</td>
                        </tr>
                        <tr>
                          <td className="name-col">Logo &amp; Brand Kit</td>
                          <td className="qty-col">1</td>
                          <td className="amount-col">$800.00</td>
                        </tr>
                        <tr>
                          <td className="name-col">Content Writing</td>
                          <td className="qty-col">12</td>
                          <td className="amount-col">$600.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="l-totals">
                    <div className="l-totals-row">
                      <span>Subtotal</span><span>$3,800.00</span>
                    </div>
                    <div className="l-totals-row">
                      <span>Tax (10%)</span><span>$380.00</span>
                    </div>
                    <div className="l-totals-grand">
                      <span>Total</span><span className="l-total-value">$4,180.00</span>
                    </div>
                  </div>

                  <div className="l-controls">
                    <span className="l-status-badge l-status-paid">
                      <Reicon icon={Check} size={10} />
                      Paid
                    </span>
                    <div className="l-controls-spacer" />
                    <span className="l-control-btn">
                      <Reicon icon={DocumentText} size={12} />
                      PDF
                    </span>
                    <span className="l-control-btn">
                      <Reicon icon={Share} size={12} />
                      Share
                    </span>
                  </div>
                </div>

                {/* Mobile phone preview */}
                <div className="l-phone">
                  <div className="l-phone-notch"><div className="l-phone-notch-bar" /></div>
                  <div className="l-phone-content">
                    <div className="l-phone-receipt-badge">
                      <Reicon icon={Check} size={8} />
                      Receipt
                    </div>
                    <div className="l-phone-title">RCPT-2026-07-0001</div>
                    <div className="l-phone-client">Acme Corp — Paid</div>
                    <div className="l-phone-line">
                      <span className="l-phone-line-name">Website Redesign</span>
                      <span className="l-phone-line-amt">$2,400</span>
                    </div>
                    <div className="l-phone-line">
                      <span className="l-phone-line-name">Logo &amp; Brand Kit</span>
                      <span className="l-phone-line-amt">$800</span>
                    </div>
                    <div className="l-phone-line">
                      <span className="l-phone-line-name">Content Writing</span>
                      <span className="l-phone-line-amt">$600</span>
                    </div>
                    <div className="l-phone-total">
                      <span>Total</span>
                      <span>$4,180</span>
                    </div>
                    <div className="l-phone-share">Share PDF</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Workflow ── */}
        <section className="l-section" id="workflow">
          <div className="l-section-inner">
            <div data-reveal>
              <h2>Three steps. That's it.</h2>
              <p className="l-section-sub">
                From first draft to paid receipt — a short, clear path.
              </p>
            </div>

            <div className="l-workflow-steps">
              <div className="l-wf-step" data-reveal data-reveal-delay="0">
                <div className="l-wf-line-col">
                  <div className="l-wf-num">1</div>
                  <div className="l-wf-connector" />
                </div>
                <div className="l-wf-body">
                  <h3>Add client &amp; items</h3>
                  <p>Pick a client from your catalog or add a new one. Add line items with prices, quantities, and tax.</p>
                </div>
              </div>
              <div className="l-wf-step" data-reveal data-reveal-delay="1">
                <div className="l-wf-line-col">
                  <div className="l-wf-num">2</div>
                  <div className="l-wf-connector" />
                </div>
                <div className="l-wf-body">
                  <h3>Send invoice</h3>
                  <p>Download a PDF or share it directly. Auto-numbering keeps your records in order.</p>
                </div>
              </div>
              <div className="l-wf-step" data-reveal data-reveal-delay="2">
                <div className="l-wf-line-col">
                  <div className="l-wf-num">3</div>
                </div>
                <div className="l-wf-body">
                  <h3>Mark paid &amp; create receipt</h3>
                  <p>Mark the invoice as paid, then create a matching receipt for your client.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="l-section l-proof" id="features">
          <div className="l-section-inner">
            <div className="l-proof-head" data-reveal>
              <h2>One invoice can carry the whole trail.</h2>
              <p className="l-section-sub">
                Client, item, PDF, payment, and receipt details stay connected without turning into an accounting suite.
              </p>
            </div>

            <div className="l-proof-ledger" data-reveal data-reveal-delay="1">
              <div className="l-proof-row">
                <span className="l-proof-step">Draft</span>
                <div>
                  <h3>Start from reusable business data</h3>
                  <p>Choose saved clients and items, then adjust quantities, tax, discounts, notes, and payment details in one editor.</p>
                </div>
                <span className="l-proof-code">INV-2026-07-0001</span>
              </div>
              <div className="l-proof-row">
                <span className="l-proof-step">Send</span>
                <div>
                  <h3>Export the document your client needs</h3>
                  <p>Download a clean PDF or share it directly from desktop or phone, even after working offline.</p>
                </div>
                <span className="l-proof-code">PDF / Share</span>
              </div>
              <div className="l-proof-row">
                <span className="l-proof-step">Paid</span>
                <div>
                  <h3>Close the loop with a receipt</h3>
                  <p>Mark an invoice as paid and create the matching receipt without rebuilding the same details.</p>
                </div>
                <span className="l-proof-code">Receipt</span>
              </div>
            </div>

            <dl className="l-capability-list" data-reveal data-reveal-delay="2" aria-label="Additional Invois features">
              <div>
                <dt>Desktop live preview</dt>
                <dd>Edit on one side and inspect the invoice or receipt preview beside it before exporting.</dd>
              </div>
              <div>
                <dt>Installable PWA</dt>
                <dd>Open Invois from your phone or desktop and keep working with locally saved data.</dd>
              </div>
              <div>
                <dt>Business defaults</dt>
                <dd>Save bank details, default notes, terms, and tax rate so each new invoice starts ready.</dd>
              </div>
              <div>
                <dt>Edit and delete records</dt>
                <dd>Update invoices, receipts, clients, and catalog items without leaving the app.</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ── Trust / Fit ── */}
        <section className="l-trust" id="trust">
          <div className="l-trust-inner">
            <div data-reveal>
              <h2>What Invois does — and doesn't do.</h2>
            </div>
            <p data-reveal data-reveal-delay="1">
              Invois creates commercial invoices and receipts. It tracks what's
              due and produces shareable PDFs. It does not file taxes, connect
              to accounting software, or sync to a cloud service. Your records
              stay on this device.
            </p>
            <dl className="l-faq-list" data-reveal data-reveal-delay="2">
              <div className="l-faq-item">
                <dt>Does it sync?</dt>
                <dd>No. Data lives on your device. Export PDFs to share.</dd>
              </div>
              <div className="l-faq-item">
                <dt>Can I use it for taxes?</dt>
                <dd>No. Use your accountant or tax software for filing.</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="l-cta">
          <div className="l-cta-inner" data-reveal>
            <h2>Create your first invoice</h2>
            <p>
              Fill in the details, preview the PDF, and share it when ready.
              Your draft stays on this device.
            </p>
            <div className="l-cta-actions">
              <Link to="/documents/new/invoice" className="btn btn-primary btn-lg">
                Create Invoice
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="l-footer">
        <div className="l-footer-inner">
          <div className="l-footer-brand">
            <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
            <span>Invois</span>
          </div>
          <p className="l-footer-meta">
            &copy; {new Date().getFullYear()} Invois. All data stays on your device.
          </p>
        </div>
      </footer>
    </div>
  );
}
