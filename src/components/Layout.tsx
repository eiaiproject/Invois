import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { House, FileText, Users, Box, Settings } from 'lucide-react';
import { SampleDataNotice } from './SampleDataNotice';

const mobileNav = [
  { to: '/dashboard', label: 'Home', icon: House },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/items', label: 'Items', icon: Box },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: { readonly children?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  const isFirstRoute = useRef(true);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Move focus into the new page on navigation, but not on first load.
  useEffect(() => {
    window.scrollTo(0, 0);
    if (isFirstRoute.current) {
      isFirstRoute.current = false;
      return;
    }
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [loc.pathname]);

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* Sidebar (desktop) */}
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
          <span>Invois</span>
        </div>
        <nav aria-label="Main navigation">
          <div className="sidebar-section">Menu</div>
          {mobileNav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/dashboard'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <n.icon size={20} aria-hidden="true" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="legal">Commercial invoices &amp; receipts. Not a tax document unless stated otherwise.</p>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className={`top-bar${scrolled ? ' scrolled' : ''}`}>
        <div className="top-bar-inner">
          <div className="brand">
            <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
            <span>Invois</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="main" id="main-content" tabIndex={-1}>
        <div className="main-inner fade-in">
          <SampleDataNotice />
          {children ?? <Outlet />}
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="bottom-nav" aria-label="Primary navigation">
        {mobileNav.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/dashboard'} className={({ isActive }) => isActive ? 'active' : ''}>
            <n.icon size={22} aria-hidden="true" /> {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
