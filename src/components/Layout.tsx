import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const mobileNav = [
  { to: '/dashboard', label: 'Home', icon: <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 12l9-8 9 8"/><path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg> },
  { to: '/documents', label: 'Documents', icon: <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h4"/></svg> },
  { to: '/clients', label: 'Clients', icon: <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  { to: '/items', label: 'Items', icon: <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 7H4a1 1 0 00-1 1v12a2 2 0 002 2h14a2 2 0 002-2V8a1 1 0 00-1-1z"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg> },
  { to: '/settings', label: 'Settings', icon: <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
];

export function Layout({ children }: { children?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Scroll to top on navigation
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* ── Sidebar (desktop) ── */}
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
          Invois
        </div>
        <div className="sidebar-section">Menu</div>
        {mobileNav.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/dashboard'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            {n.icon} {n.label}
          </NavLink>
        ))}
        <div className="sidebar-bottom">
          <p className="legal">Invois — Commercial invoices &amp; receipts. Not a tax document unless stated otherwise.</p>
        </div>
      </aside>

      {/* ── Top bar (mobile) ── */}
      <header className={`top-bar${scrolled ? ' scrolled' : ''}`}>
        <div className="top-bar-inner">
          <div className="brand">
            <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
            Invois
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main" id="main-content" tabIndex={-1}>
        <div className="main-inner fade-in">
          {children ?? <Outlet />}
        </div>
      </main>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="bottom-nav">
        {mobileNav.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/dashboard'} className={({ isActive }) => isActive ? 'active' : ''}>
            {n.icon} {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
