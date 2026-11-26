import type { KeyboardEvent } from 'react';
import { formatIDR } from '../lib/format';
import type { Client, Invoice, InvoiceItem, Item, Receipt } from '../types';

export function getClientMatches(clientName: string, clients: Client[]): Client[] {
  const query = clientName.toLowerCase().trim();
  if (!query) return [];
  return clients.filter(c => c.name.toLowerCase() !== query && c.name.toLowerCase().includes(query));
}

export function getItemMatches(itemName: string, items: Item[]): Item[] {
  const query = itemName.toLowerCase().trim();
  if (!query) return [];
  return items.filter(i => i.name.toLowerCase() !== query && i.name.toLowerCase().includes(query));
}

function moveOptionFocus(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  const options = Array.from(
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
  );
  const index = options.indexOf(event.currentTarget);
  const next = event.key === 'ArrowDown' ? options[index + 1] : options[index - 1];
  next?.focus();
}

export function renderClientSuggestions(
  isReceipt: boolean,
  rec: Partial<Receipt>,
  inv: Partial<Invoice>,
  clients: Client[],
  onSelect: (id: string) => void,
) {
  const clientName = isReceipt ? (rec.clientSnapshot?.name || '') : (inv.clientSnapshot?.name || '');
  const matches = getClientMatches(clientName, clients);
  if (matches.length === 0) return null;
  return (
    <div
      id="client-suggestions"
      className="suggestion-dropdown"
      role="listbox"
      aria-label="Client suggestions"
      style={{ position: 'absolute', top: '100%', left: 0, right: 0 }}
    >
      {matches.slice(0, 5).map(c => (
        <button
          key={c.id}
          type="button"
          role="option"
          aria-selected={false}
          className="suggestion-dropdown-item"
          onMouseDown={e => e.preventDefault()}
          onKeyDown={moveOptionFocus}
          onClick={() => onSelect(c.id)}
        >
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
  const matches = getItemMatches(item.name, items);
  if (matches.length === 0) return null;
  return (
    <div
      id={`item-${item.id}-suggestions`}
      className="suggestion-dropdown"
      role="listbox"
      aria-label="Item suggestions"
      style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 140 }}
    >
      {matches.slice(0, 4).map(c => (
        <button
          key={c.id}
          type="button"
          role="option"
          aria-selected={false}
          className="suggestion-dropdown-item"
          onMouseDown={e => e.preventDefault()}
          onKeyDown={moveOptionFocus}
          onClick={() => onPick(idx, c.name, c.price)}
        >
          <span style={{ fontWeight: 600 }}>{c.name}</span>
          <span className="item-meta">{formatIDR(c.price)}</span>
        </button>
      ))}
    </div>
  );
}
