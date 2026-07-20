import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getItems, saveItem, getItem } from '../lib/db';
import { useToast } from '../context/toast';
import { formatIDR } from '../lib/format';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
import { Plus } from 'reicon';
import { Reicon } from '../components/Reicon';
import { newId, nowISO } from '../types';
import type { Item } from '../types';

const EMPTY_ITEM_FORM = {
  name: '', description: '', unit: 'project', price: 0,
};

export function Items() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';

  const load = async () => setItems(await getItems());
  useEffect(() => { load(); }, []);

  const filtered = (items || []).filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q);
  });

  const updateSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    const q = value.trim();
    if (q) params.set('q', q);
    else params.delete('q');
    setSearchParams(params, { replace: true });
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Items</h1>
          <p className="sub">{items ? `${items.length} items & services` : 'Loading…'}</p>
        </div>
        {items && items.length > 0 && (
          <Link to="/items/new" className="btn btn-primary">
            <Reicon icon={Plus} size={16} />
            Add Item
          </Link>
        )}
      </div>

      <input
        className="input search-box"
        aria-label="Search items"
        placeholder="Search items…"
        value={search}
        onChange={e => updateSearch(e.target.value)}
        enterKeyHint="search"
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      />

      {!items ? (
        <>
          <div className="skeleton" style={{ height: 44, borderRadius: 'var(--radius-md)', marginBottom: 12 }} />
          <div className="skeleton-row">
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: 180 }} />
              <div className="skeleton skeleton-text short" />
            </div>
            <div className="skeleton" style={{ width: 80, height: 20, borderRadius: 4 }} />
          </div>
          <div className="skeleton-row">
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: 140 }} />
              <div className="skeleton skeleton-text short" />
            </div>
            <div className="skeleton" style={{ width: 80, height: 20, borderRadius: 4 }} />
          </div>
          <div className="skeleton-row">
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: 160 }} />
              <div className="skeleton skeleton-text short" />
            </div>
            <div className="skeleton" style={{ width: 80, height: 20, borderRadius: 4 }} />
          </div>
        </>
      ) : (
        <>
      {filtered.length === 0 ? (
        <div className="empty">
          <h3>{search ? 'No matches' : 'No items yet'}</h3>
          <p>{search ? 'Try a different search.' : 'Add your services or products to quickly add them to invoices.'}</p>
          {!search && <Link to="/items/new" className="btn btn-primary">Add Item</Link>}
        </div>
      ) : (
        <div className="doc-list">
          {filtered.map(item => (
            <Link key={item.id} to={`/items/${item.id}`} className="doc-card">
              <div className="meta">
                <div className="row1">
                  <span className="card-title">{item.name}</span>
                </div>
                <div className="client">{item.description || item.unit || '—'}</div>
              </div>
              <span className="total num">{formatIDR(item.price)}</span>
            </Link>
          ))}
        </div>
      )}
        </>
      )}

    </div>
  );
}

export function ItemEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY_ITEM_FORM);
  const [initialForm, setInitialForm] = useState(EMPTY_ITEM_FORM);
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  useUnsavedChanges(dirty);

  useEffect(() => {
    if (!id) return;
    getItem(id).then(i => {
      if (i) {
        const next = { name: i.name, description: i.description || '', unit: i.unit || 'project', price: i.price };
        setForm(next);
        setInitialForm(next);
      }
    });
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setErrors({ name: 'Enter an item name.' });
      document.getElementById('item-name')?.focus();
      toast('Item name is required.', 'danger');
      return;
    }
    if (form.price <= 0) {
      setErrors({ price: 'Enter a price greater than 0.' });
      document.getElementById('item-price')?.focus();
      toast('Price must be greater than 0.', 'danger');
      return;
    }
    const now = nowISO();
    const existing = id ? await getItem(id) : undefined;
    const item = {
      id: id || newId(),
      name: form.name.trim(),
      description: form.description || undefined,
      unit: form.unit || undefined,
      price: form.price,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await saveItem(item);
    setInitialForm(form);
    toast(isEdit ? 'Item updated.' : 'Item added.', 'success');
    nav('/items');
  };

  return (
    <div>
      <div className="page-head">
        <h1>{isEdit ? 'Edit' : 'New'} Item</h1>
      </div>
      <div className="card card-pad-lg">
        <div className="field">
          <label className="field-label" htmlFor="item-name">Item Name *</label>
          <input id="item-name" name="itemName" autoComplete="off" className="input" value={form.name} onChange={e => { setErrors(prev => ({ ...prev, name: undefined })); setForm(f => ({ ...f, name: e.target.value })); }} placeholder="e.g. Logo Design…" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'item-name-error' : undefined} />
          {errors.name && <div id="item-name-error" className="field-error" role="alert">{errors.name}</div>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="item-description">Description</label>
          <textarea id="item-description" name="description" autoComplete="off" className="textarea" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description…" />
        </div>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="item-price">Default Price (Rp) *</label>
            <input id="item-price" name="price" className="input num" type="number" min="0" value={form.price} onChange={e => { setErrors(prev => ({ ...prev, price: undefined })); setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 })); }} inputMode="numeric" aria-invalid={!!errors.price} aria-describedby={errors.price ? 'item-price-error' : undefined} />
            {errors.price && <div id="item-price-error" className="field-error" role="alert">{errors.price}</div>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="item-unit">Unit</label>
            <select id="item-unit" name="unit" className="select" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              <option value="project">Project</option>
              <option value="hour">Hour</option>
              <option value="month">Month</option>
              <option value="piece">Piece</option>
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary btn-block" onClick={handleSave}>{isEdit ? 'Save Changes' : 'Add Item'}</button>
          <button className="btn btn-secondary" onClick={() => nav('/items')}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
