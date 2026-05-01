import { Link, Outlet, useLocation } from 'react-router-dom';
import { FileText, History, Settings, PackagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export function Layout() {
  const location = useLocation();

  // On mount, check dark mode preference
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const navItems = [
    { name: 'Buat Invoice', path: '/', icon: FileText },
    { name: 'Riwayat', path: '/history', icon: History },
    { name: 'Katalog', path: '/catalog', icon: PackagePlus },
    { name: 'Pengaturan', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      <header className="flex-shrink-0 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 shadow-sm z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            
            <h1 className="font-bold text-xl tracking-tight text-[var(--text)]">Invois</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto p-4 md:py-8 min-h-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation & Desktop Sidebar behavior - Keeping it simple with bottom nav for mobile-first PWA */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] pb-safe z-20">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center py-3 px-2 flex-1 gap-1 text-xs font-medium transition-colors",
                  isActive ? "text-[var(--primary)]" : "text-[var(--text-sec)] hover:text-[var(--text)]"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop side-nav representation could be added here, but sticking to bottom nav format or simple header for MVP */}
      <nav className="hidden md:flex fixed top-[61px] bottom-0 left-0 w-64 bg-[var(--surface)] border-r border-[var(--border)] flex-col py-4">
        {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 font-medium transition-colors",
                  isActive ? "text-[var(--primary)] bg-[var(--primary)]/10 border-r-2 border-[var(--primary)]" : "text-[var(--text-sec)] hover:bg-[var(--border)]/50 hover:text-[var(--text)]"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
        })}
      </nav>
      {/* Adjust main content margin for desktop sidebar */}
      <style>{`
        @media (min-width: 768px) {
          main { margin-left: 16rem; }
          header > div { max-w: 100%; padding-left: 1rem; }
        }
      `}</style>
    </div>
  );
}
