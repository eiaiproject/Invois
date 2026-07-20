import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Home, DocumentText, Users, Box, Settings } from 'reicon';
import { Reicon } from './Reicon';

const mobileNav = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/documents', label: 'Documents', icon: DocumentText },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/items', label: 'Items', icon: Box },
  { to: '/settings', label: 'Settings', icon: Settings },
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
            <Reicon icon={n.icon} size={20} /> {n.label}
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
            <Reicon icon={n.icon} size={22} /> {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
