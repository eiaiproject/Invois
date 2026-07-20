import { formatIDR } from '../lib/format';
import type { Client, Invoice, InvoiceItem, Item, Receipt } from '../types';

export function renderClientSuggestions(
  isReceipt: boolean,
  rec: Partial<Receipt>,
  inv: Partial<Invoice>,
  clients: Client[],
  onSelect: (id: string) => void,
) {
  const clientName = isReceipt ? (rec.clientSnapshot?.name || '') : (inv.clientSnapshot?.name || '');
  if (!clientName.trim()) return null;
  const t = clientName.toLowerCase().trim();
  const matches = clients.filter(c => c.name.toLowerCase() !== t && c.name.toLowerCase().includes(t));
  if (matches.length === 0) return null;
  return (
    <div id="client-suggestions" className="suggestion-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0 }}>
      {matches.slice(0, 5).map(c => (
        <button key={c.id} type="button" className="suggestion-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => onSelect(c.id)}>
          <span className="avatar-small">{c.name.charAt(0).toUpperCase()}</span>
          <span style={{ fontWeight: 600 }}>{c.name}</span>
          {c.email && <span className="item-meta">{c.email}</span>}
        </button>
      ))}
    </div>
  );
}

export function renderItemSuggestions(
  item: InvoiceItem,
  idx: number,
  items: Item[],
  onPick: (idx: number, name: string, price: number) => void,
) {
  if (!item.name.trim()) return null;
  const t = item.name.toLowerCase().trim();
  const matches = items.filter(c => c.name.toLowerCase() !== t && c.name.toLowerCase().includes(t));
  if (matches.length === 0) return null;
  return (
    <div id={`item-${item.id}-suggestions`} className="suggestion-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 140 }}>
      {matches.slice(0, 4).map(c => (
        <button key={c.id} type="button" className="suggestion-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => onPick(idx, c.name, c.price)}>
          <span style={{ fontWeight: 600 }}>{c.name}</span>
          <span className="item-meta">{formatIDR(c.price)}</span>
        </button>
      ))}
    </div>
  );
}
