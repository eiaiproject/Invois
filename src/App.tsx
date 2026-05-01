import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import CreateInvoice from './pages/CreateInvoice';
import History from './pages/History';
import Catalog from './pages/Catalog';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<CreateInvoice />} />
          <Route path="history" element={<History />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
