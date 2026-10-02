import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './context/toast';
import { Landing } from './pages/Landing';
import { seedOnce } from './lib/seed';
import './styles/landing.css';

function Seeder() {
  useEffect(() => { seedOnce().catch(err => console.error('Seeding failed:', err)); }, []);
  return null;
}

function NotFound() {
  return (
    <div className="empty">
      <h3>Page not found</h3>
      <p>The page you are looking for doesn&apos;t exist or has moved.</p>
      <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
    </div>
  );
}

const Dashboard = lazy(() => import('./pages/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));
const Documents = lazy(() => import('./pages/Documents').then(({ Documents }) => ({ default: Documents })));
const DocumentEditor = lazy(() => import('./pages/DocumentEditor').then(({ DocumentEditor }) => ({ default: DocumentEditor })));
const DocumentDetail = lazy(() => import('./pages/DocumentDetail').then(({ DocumentDetail }) => ({ default: DocumentDetail })));
const Clients = lazy(() => import('./pages/Clients').then(({ Clients }) => ({ default: Clients })));
const ClientEditor = lazy(() => import('./pages/Clients').then(({ ClientEditor }) => ({ default: ClientEditor })));
const Items = lazy(() => import('./pages/Items').then(({ Items }) => ({ default: Items })));
const ItemEditor = lazy(() => import('./pages/Items').then(({ ItemEditor }) => ({ default: ItemEditor })));
const Settings = lazy(() => import('./pages/Settings').then(({ Settings }) => ({ default: Settings })));

const routeFallback = (
  <div className="route-loading" role="status" aria-live="polite">
    <span className="spinner" aria-hidden="true" />
    <span>Loading…</span>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <Seeder />
          <Suspense fallback={routeFallback}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/documents/new/:type" element={<DocumentEditor />} />
                <Route path="/documents/:type/:id" element={<DocumentDetail />} />
                <Route path="/documents/:type/:id/edit" element={<DocumentEditor />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/new" element={<ClientEditor />} />
                <Route path="/clients/:id" element={<ClientEditor />} />
                <Route path="/items" element={<Items />} />
                <Route path="/items/new" element={<ItemEditor />} />
                <Route path="/items/:id" element={<ItemEditor />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </ToastProvider>
      </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
