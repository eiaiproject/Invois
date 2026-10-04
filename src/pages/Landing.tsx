import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Check, DocumentText, Share } from 'reicon';
import { Reicon } from '../components/Reicon';
import { Seo } from '../components/SEO';

const navLinks = [
  { label: 'How it works', href: '#workflow' },
  { label: 'What you get', href: '#features' },
  { label: 'Privacy & limits', href: '#trust' },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

const isTypingTarget = (node: EventTarget | null) => {
  const el = node as HTMLElement | null;
  if (!el?.tagName) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
};

export function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Sticky header border appears once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll reveals. The hiding class is added here, after the observer exists,
  // and removed on cleanup so content can never stay invisible.
  useEffect(() => {
    const container = rootRef.current;
    if (!container) return;
    const targets = Array.from(container.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!targets.length || !('IntersectionObserver' in window)) return;
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
      { threshold: 0.12, rootMargin: '0px 0px -50px 0px' },
    );
    targets.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      container.classList.remove('reveal-ready');
    };
  }, []);

  // Mobile drawer: Escape closes it and hands focus back to the toggle, and the
  // drawer closes on its own once the desktop breakpoint hides it.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileNavOpen(false);
      hamburgerRef.current?.focus();
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const handleDesktop = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) setMobileNavOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    desktop.addEventListener('change', handleDesktop);
    return () => {
      document.removeEventListener('keydown', handleKey);
      desktop.removeEventListener('change', handleDesktop);
    };
  }, [mobileNavOpen]);

  const scrollToId = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    history.replaceState(null, '', `#${id}`);
    // The click handler below prevents the default fragment navigation, which
    // is what normally moves focus to a skip-link target. Restore it here.
    if (el instanceof HTMLElement && (el.id === 'main-content' || el.hasAttribute('tabindex'))) {
      el.focus({ preventScroll: true });
    }
  }, []);

  // Anchor navigation, including the drawer links
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute('href')?.slice(1);
      if (!id) return;
      if (!document.getElementById(id)) return;
      event.preventDefault();
      scrollToId(id);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [scrollToId]);

  // Number keys jump to sections; skipped while typing or with modifiers held
  useEffect(() => {
    const sectionIds = ['workflow', 'features', 'trust'];
    const handleKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      const index = Number.parseInt(event.key, 10);
      if (index >= 1 && index <= 3) scrollToId(sectionIds[index - 1]!);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [scrollToId]);

  return (
    <div className="landing" ref={rootRef}>
      <Seo
        title="Offline Invoice & Receipt Maker"
        description="Create professional invoices and receipts offline, save business data on your device, and export clean PDFs from desktop or mobile."
      />
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* Header */}
      <header className={`l-header${scrolled ? ' scrolled' : ''}`}>
        <div className="l-header-inner">
          <Link to="/" className="brand" aria-label="Invois home">
            <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
            <span>Invois</span>
          </Link>

          <nav className="l-nav" aria-label="Main navigation">
            {navLinks.map(link => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
          </nav>

          <div className="l-header-actions">
            <Link to="/dashboard" className="btn btn-secondary btn-sm">Open dashboard</Link>
            <button
              ref={hamburgerRef}
              type="button"
              className="l-hamburger"
              onClick={() => setMobileNavOpen(open => !open)}
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              <Reicon icon={mobileNavOpen ? X : Menu} size={20} />
            </button>
          </div>
        </div>

        {/* Drawer is display:none while closed, so its links are not focusable */}
        <nav
          id="mobile-nav"
          className={`l-mobile-nav${mobileNavOpen ? ' open' : ''}`}
          aria-label="Mobile navigation"
        >
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileNavOpen(false)}
            >{link.label}</a>
          ))}
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section className="l-hero">
          <div className="l-hero-inner">
            <div className="l-hero-text">
              <h1 className="l-hero-heading">Create professional invoices and receipts, even offline.</h1>
              <p>
                Save clients and items, export clean PDFs, and turn paid invoices into
                receipts without entering the same details twice.
              </p>
              <div className="l-hero-actions">
                <Link to="/documents/new/invoice" className="btn btn-primary btn-lg l-cta-primary">
                  Create your first invoice
                </Link>
                <Link to="/dashboard" className="btn btn-secondary btn-lg">Open dashboard</Link>
              </div>
              <ul className="l-hero-assurance" aria-label="Product highlights">
                <li>Works offline</li>
                <li>Stored on this device</li>
                <li>Shareable PDF exports</li>
                <li>No account required</li>
              </ul>
            </div>

            {/* Decorative mock document, described once for assistive tech */}
            <figure className="l-preview">
              <div className="l-preview-stage" aria-hidden="true">
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
                          <td className="amount-col">Rp 24.000.000</td>
                        </tr>
                        <tr>
                          <td className="name-col">Logo &amp; Brand Kit</td>
                          <td className="qty-col">1</td>
                          <td className="amount-col">Rp 8.000.000</td>
                        </tr>
                        <tr>
                          <td className="name-col">Content Writing</td>
                          <td className="qty-col">12</td>
                          <td className="amount-col">Rp 12.000.000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="l-totals">
                    <div className="l-totals-row">
                      <span>Subtotal</span><span>Rp 44.000.000</span>
                    </div>
                    <div className="l-totals-row">
                      <span>Tax (11%)</span><span>Rp 4.840.000</span>
                    </div>
                    <div className="l-totals-grand">
                      <span>Total</span><span className="l-total-value">Rp 48.840.000</span>
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

                <div className="l-phone">
                  <div className="l-phone-notch"><div className="l-phone-notch-bar" /></div>
                  <div className="l-phone-content">
                    <div className="l-phone-receipt-badge">
                      <Reicon icon={Check} size={8} />
                      Receipt
                    </div>
                    <div className="l-phone-title">RCPT-2026-07-0001</div>
                    <div className="l-phone-client">Acme Corp &middot; Paid</div>
                    <div className="l-phone-line">
                      <span className="l-phone-line-name">Website Redesign</span>
                      <span className="l-phone-line-amt">Rp 24.000.000</span>
                    </div>
                    <div className="l-phone-line">
                      <span className="l-phone-line-name">Logo &amp; Brand Kit</span>
                      <span className="l-phone-line-amt">Rp 8.000.000</span>
                    </div>
                    <div className="l-phone-line">
                      <span className="l-phone-line-name">Content Writing</span>
                      <span className="l-phone-line-amt">Rp 12.000.000</span>
                    </div>
                    <div className="l-phone-total">
                      <span>Total</span>
                      <span>Rp 48.840.000</span>
                    </div>
                    <div className="l-phone-share">Share PDF</div>
                  </div>
                </div>
              </div>
              <figcaption className="sr-only">
                Example of a paid invoice and its matching receipt, shown on desktop and on a phone.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Workflow: how to use the app */}
        <section className="l-section" id="workflow" aria-labelledby="workflow-title">
          <div className="l-section-inner">
            <div data-reveal>
              <h2 id="workflow-title">Three steps. That's it.</h2>
            </div>

            <div className="l-workflow-steps">
              <div className="l-wf-step" data-reveal data-reveal-delay="0">
                <div className="l-wf-line-col">
                  <div className="l-wf-num">1</div>
                  <div className="l-wf-connector" />
                </div>
                <div className="l-wf-body">
                  <h3>Add client &amp; items</h3>
                  <p>Pick a saved client, then add items with prices, quantities, and tax.</p>
                </div>
              </div>
              <div className="l-wf-step" data-reveal data-reveal-delay="1">
                <div className="l-wf-line-col">
                  <div className="l-wf-num">2</div>
                  <div className="l-wf-connector" />
                </div>
                <div className="l-wf-body">
                  <h3>Send invoice</h3>
                  <p>Download the PDF or share it. Numbers stay in order.</p>
                </div>
              </div>
              <div className="l-wf-step" data-reveal data-reveal-delay="2">
                <div className="l-wf-line-col">
                  <div className="l-wf-num">3</div>
                </div>
                <div className="l-wf-body">
                  <h3>Mark paid &amp; create receipt</h3>
                  <p>Record the payment, then generate the receipt.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits: why the data stays connected */}
        <section className="l-section l-proof" id="features" aria-labelledby="features-title">
          <div className="l-section-inner">
            <div className="l-proof-head" data-reveal>
              <h2 id="features-title">Enter the details once.</h2>
              <p className="l-section-sub">
                Client, item, payment, and receipt data stay connected across the entire document lifecycle.
              </p>
            </div>

            <div className="l-proof-ledger" data-reveal data-reveal-delay="1">
              <div className="l-proof-row">
                <span className="l-proof-step">Reuse</span>
                <div>
                  <h3>Reusable business data</h3>
                  <p>Choose saved clients and catalog items, then adjust quantities, tax, discounts, notes, and payment details.</p>
                </div>
                <span className="l-proof-code">INV-2026-07-0001</span>
              </div>
              <div className="l-proof-row">
                <span className="l-proof-step">Export</span>
                <div>
                  <h3>Consistent documents</h3>
                  <p>Use the same details to create a clean invoice PDF without entering the information again.</p>
                </div>
                <span className="l-proof-code">PDF</span>
              </div>
              <div className="l-proof-row">
                <span className="l-proof-step">Receipt</span>
                <div>
                  <h3>Connected receipts</h3>
                  <p>Turn a paid invoice into a matching receipt while keeping the original details connected.</p>
                </div>
                <span className="l-proof-code">RCPT-2026-07-0001</span>
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

        {/* Privacy and product limits */}
        <section className="l-trust" id="trust" aria-labelledby="trust-title">
          <div className="l-trust-inner">
            <div data-reveal>
              <h2 id="trust-title">Know where your data lives.</h2>
            </div>
            <p data-reveal data-reveal-delay="1">
              Invois creates commercial invoices and receipts, records due dates and payment
              status, and produces shareable PDFs. It does not file taxes, connect to accounting
              software, or sync your records to a cloud service. Records are stored in this
              browser's IndexedDB on this device.
            </p>
            <dl className="l-faq-list" data-reveal data-reveal-delay="2">
              <div className="l-faq-item">
                <dt>Does it sync?</dt>
                <dd>No. There is no server and no account. Records stay in this browser on this device, and nothing is uploaded.</dd>
              </div>
              <div className="l-faq-item">
                <dt>Can I use it for taxes?</dt>
                <dd>No. It produces commercial documents and tracks due dates and payment status. Filing stays with your accountant or tax software.</dd>
              </div>
              <div className="l-faq-item">
                <dt>Can I lose my records?</dt>
                <dd>
                  Records live in this browser. Clearing site data, using a private window, or
                  changing devices may remove or separate them. In Settings, Export Data saves
                  one JSON file with your invoices, receipts, clients, items, and business
                  profile, and Import Data restores it on this or another device. A PDF export
                  is a document to share, not a backup.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section className="l-cta" aria-labelledby="cta-title">
          <div className="l-cta-inner" data-reveal>
            <h2 id="cta-title">Create your first invoice</h2>
            <p>
              Fill in the details, preview the PDF, and share it when ready.
              Your draft stays on this device.
            </p>
            <div className="l-cta-actions">
              <Link to="/documents/new/invoice" className="btn btn-primary btn-lg">
                Create your first invoice
              </Link>
              <Link to="/dashboard" className="btn btn-secondary btn-lg">Open dashboard</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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