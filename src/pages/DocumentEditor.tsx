import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getInvoice, getReceipt, getReceipts, saveInvoice, saveReceipt, getBusiness, getClients, getItems, nextNumber, peekNextNumber } from '../lib/db';
import { useToast } from '../context/toast';
import { formatIDR, formatIDRInput, parseIDRInput, calcTotals, formatDateISO, copyInvoiceText, copyReceiptText } from '../lib/format';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
import type { Invoice, Receipt, InvoiceItem, BusinessProfile, Client, Item } from '../types';
import { addDaysISO, newId, nowISO, todayISO } from '../types';

type EditorValidationError = { fieldId: string; message: string; section: string };

function blankInvoice(number: string, biz?: BusinessProfile): Partial<Invoice> {
  return {
    number,
    status: 'draft',
    issueDate: todayISO(),
    dueDate: addDaysISO(7),
    clientSnapshot: { name: '' },
    items: [{ id: newId(), name: '', description: '', quantity: 1, price: 0, amount: 0 }],
    subtotal: 0, discount: 0, taxRate: biz?.defaultTaxRate ?? 11, taxAmount: 0, total: 0,
    paymentMethod: 'Bank Transfer',
    bankName: biz?.bankName, bankAccountNumber: biz?.bankAccountNumber, bankAccountHolder: biz?.bankAccountHolder,
    notes: biz?.defaultNotes, terms: biz?.defaultTerms,
  };
}

function blankReceipt(number: string): Partial<Receipt> {
  return {
    number,
    status: 'paid',
    paymentDate: todayISO(),
    clientSnapshot: { name: '' },
    amountPaid: 0,
    paymentMethod: 'Bank Transfer',
  };
}

export function DocumentEditor() {
  const { type, id } = useParams<{ type: string; id?: string }>();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  const { toast } = useToast();
  const isReceipt = type === 'receipt';
  const isEdit = !!id;

  const [biz, setBiz] = useState<BusinessProfile | undefined>();
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [preview, setPreview] = useState(false);
  const [suggestedNumber, setSuggestedNumber] = useState('');

  // Invoice state
  const [inv, setInv] = useState<Partial<Invoice>>({});
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);
  // Receipt state
  const [rec, setRec] = useState<Partial<Receipt>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    basic: true, client: true, items: true, adjustments: true, payment: false, notes: false,
  });
  const [validationError, setValidationError] = useState<EditorValidationError | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const stateSnapshot = useMemo(
    () => JSON.stringify(isReceipt ? { rec } : { inv, lineItems }),
    [inv, isReceipt, lineItems, rec]
  );
  const dirty = !loading && !!initialSnapshot && stateSnapshot !== initialSnapshot && !saving;
  useUnsavedChanges(dirty);

  // Load data
  useEffect(() => {
    setLoading(true);
    setInitialSnapshot('');
    setValidationError(null);
    (async () => {
      const [bizData, clientData, itemData] = await Promise.all([getBusiness(), getClients(), getItems()]);
      setBiz(bizData);
      setClients(clientData);
      setItems(itemData);

      if (isReceipt && id === undefined) {
        const params = new URLSearchParams(query);
        const clientId = params.get('clientId') || undefined;
        const client = clientId ? clientData.find(c => c.id === clientId) : undefined;
        const amount = parseIDRInput(params.get('amount') || '');
        const number = await peekNextNumber('receipt');
        setSuggestedNumber(number);
        setRec({
          ...blankReceipt(number),
          invoiceId: params.get('invoiceId') || undefined,
          invoiceNumber: params.get('invoiceNumber') || undefined,
          clientId: client?.id,
          clientSnapshot: {
            name: client?.name || params.get('clientName') || '',
            email: client?.email,
            phone: client?.phone,
            address: client?.address,
          },
          amountPaid: amount,
        });
        setLoading(false);
        return;
      }
      if (!isReceipt && id === undefined) {
        const num = await peekNextNumber('invoice');
        setSuggestedNumber(num);
        const invData = blankInvoice(num, bizData);
        setInv(invData);
        setLineItems(invData.items || []);
        setLoading(false);
        return;
      }
      // Edit mode
      if (id) {
        if (isReceipt) {
          const existing = await getReceipt(id);
          if (existing) setRec(existing);
        } else {
          const existing = await getInvoice(id);
          if (existing) {
            setInv(existing);
            setLineItems(existing.items);
          }
        }
      }
      setLoading(false);
    })();
  }, [type, id]);

  useEffect(() => {
    if (!loading && !initialSnapshot) setInitialSnapshot(stateSnapshot);
  }, [initialSnapshot, loading, stateSnapshot]);

  // ─── Invoice calculations ───
  const updateLineItem = (idx: number, field: 'name' | 'description' | 'quantity' | 'price' | 'unit', value: string | number) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const next = { ...item, [field]: value };
      if (field === 'quantity' || field === 'price') next.amount = Number(item.quantity) * Number(item.price);
      return next;
    }));
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { id: newId(), name: '', description: '', quantity: 1, price: 0, amount: 0 }]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  const filledLineItems = lineItems.filter(i => i.name.trim());
  const totals = calcTotals(
    filledLineItems.map(i => ({ quantity: i.quantity, price: i.price })),
    inv.discount || 0,
    inv.taxRate || 0
  );

  const buildInvoice = (status?: Invoice['status']): Invoice => {
    return {
      id: inv.id || newId(),
      number: inv.number || '',
      status: status || inv.status || 'draft',
      issueDate: inv.issueDate || todayISO(),
      dueDate: inv.dueDate,
      clientId: inv.clientId,
      clientSnapshot: inv.clientSnapshot || { name: '' },
      items: filledLineItems.map(i => ({
        ...i,
        name: i.name.trim(),
        amount: i.quantity * i.price,
      })),
      subtotal: totals.subtotal,
      discount: inv.discount || 0,
      taxRate: inv.taxRate || 0,
      taxAmount: totals.taxAmount,
      total: totals.total,
      paymentMethod: inv.paymentMethod,
      bankName: inv.bankName,
      bankAccountNumber: inv.bankAccountNumber,
      bankAccountHolder: inv.bankAccountHolder,
      notes: inv.notes,
      terms: inv.terms,
      createdAt: inv.createdAt || nowISO(),
      updatedAt: nowISO(),
    };
  };

  const buildReceipt = (status?: Receipt['status']): Receipt => ({
    id: rec.id || newId(),
    number: rec.number || '',
    status: status || rec.status || 'paid',
    paymentDate: rec.paymentDate || todayISO(),
    invoiceId: rec.invoiceId,
    invoiceNumber: rec.invoiceNumber,
    clientId: rec.clientId,
    clientSnapshot: rec.clientSnapshot || { name: '' },
    amountPaid: rec.amountPaid || 0,
    paymentMethod: rec.paymentMethod,
    notes: rec.notes,
    createdAt: rec.createdAt || nowISO(),
    updatedAt: nowISO(),
  });

  // ─── Validation ───
  const validate = (): EditorValidationError | null => {
    const clientName = isReceipt ? rec.clientSnapshot?.name : inv.clientSnapshot?.name;
    if (!clientName?.trim()) return { fieldId: 'document-client-name', message: 'Enter a client name.', section: 'client' };
    if (!isReceipt) {
      const hasItem = lineItems.some(i => i.name.trim());
      const firstItemId = lineItems[0] ? `item-${lineItems[0].id}-name` : 'catalog-item';
      if (!hasItem) return { fieldId: firstItemId, message: 'Add at least one item.', section: 'items' };
    }
    if (isReceipt && !rec.amountPaid) return { fieldId: 'amount-paid', message: 'Enter the amount paid.', section: 'payment' };
    return null;
  };

  const showValidationError = (err: EditorValidationError) => {
    setExpanded(prev => ({ ...prev, [err.section]: true }));
    setValidationError(err);
    toast(err.message, 'danger');
    window.setTimeout(() => document.getElementById(err.fieldId)?.focus(), 0);
  };

  const saveNumber = async (kind: 'invoice' | 'receipt', current: string | undefined) => {
    if (isEdit) return current || '';
    if (!current || current === suggestedNumber) return nextNumber(kind);
    return current;
  };

  // ─── Save ───
  const handleSave = async (status?: string) => {
    const err = validate();
    if (err) { showValidationError(err); return; }
    setSaving(true);
    try {
      if (isReceipt) {
        const r = { ...buildReceipt(status as Receipt['status']), number: await saveNumber('receipt', rec.number) };
        if (r.invoiceId && !isEdit) {
          const existingReceipt = (await getReceipts()).find(existing =>
            existing.invoiceId === r.invoiceId &&
            existing.status !== 'cancelled'
          );
          if (existingReceipt) {
            toast('Receipt already exists for this invoice.', 'danger');
            nav(`/documents/receipt/${existingReceipt.id}`);
            return;
          }
        }
        await saveReceipt(r);
        if (r.invoiceId && r.status === 'paid') {
          const linkedInvoice = await getInvoice(r.invoiceId);
          if (linkedInvoice && linkedInvoice.status !== 'paid') {
            await saveInvoice({ ...linkedInvoice, status: 'paid', updatedAt: nowISO() });
          }
        }
        setInitialSnapshot(stateSnapshot);
        toast('Receipt saved.', 'success');
      } else {
        const i = { ...buildInvoice(status as Invoice['status']), number: await saveNumber('invoice', inv.number) };
        await saveInvoice(i);
        setInitialSnapshot(stateSnapshot);
        toast('Invoice saved.', 'success');
      }
      nav('/documents');
    } catch (err) {
      console.error(err);
      toast('Failed to save. Please try again.', 'danger');
    } finally { setSaving(false); }
  };

  // ─── PDF ───
  const handleDownloadPDF = async () => {
    if (!biz) { toast('Set up your business profile first.', 'danger'); return; }
    const { generateInvoicePDF, generateReceiptPDF, downloadPDF } = await import('../lib/pdf');
    if (isReceipt) {
      const r = buildReceipt();
      const doc = generateReceiptPDF(r, biz);
      downloadPDF(doc, `${r.number}.pdf`);
      toast('PDF downloaded.', 'success');
    } else {
      const i = buildInvoice();
      const doc = generateInvoicePDF(i, biz);
      downloadPDF(doc, `${i.number}.pdf`);
      toast('PDF downloaded.', 'success');
    }
  };

  const handleCopyText = async () => {
    try {
      let text = '';
      if (isReceipt) {
        text = copyReceiptText(buildReceipt());
      } else {
        text = copyInvoiceText(buildInvoice());
      }
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard. Paste in chat to share.', 'success');
    } catch {
      toast('Failed to copy to clipboard.', 'danger');
    }
  };

  const selectClient = (clientId: string) => {
    const c = clients.find(cl => cl.id === clientId);
    if (!c) return;
    if (isReceipt) {
      setRec(r => ({ ...r, clientId: c.id, clientSnapshot: { name: c.name, email: c.email, phone: c.phone, address: c.address } }));
    } else {
      setInv(r => ({ ...r, clientId: c.id, clientSnapshot: { name: c.name, email: c.email, phone: c.phone, address: c.address } }));
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" />;</div>;

  // ─── Live preview (inline) ───
  const renderInvoicePreview = () => {
    const i = buildInvoice();
    return (
      <div className="pdf-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            {biz?.name && <div style={{ fontWeight: 700, fontSize: 14 }}>{biz.name}</div>}
            {biz?.address && <div className="meta" style={{ fontSize: 10, marginTop: 2 }}>{biz.address}</div>}
            {biz?.email && <div className="meta" style={{ fontSize: 10 }}>{biz.email}</div>}
            {biz?.phone && <div className="meta" style={{ fontSize: 10 }}>{biz.phone}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--color-primary)' }}>INVOICE</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>No: <span className="num">{i.number}</span></div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Date: <span className="num">{formatDateISO(i.issueDate)}</span></div>
            {i.dueDate && <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Due: <span className="num">{formatDateISO(i.dueDate)}</span></div>}
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Bill To</div>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{i.clientSnapshot.name || '—'}</div>
        {i.clientSnapshot.address && <div style={{ fontSize: 10 }}>{i.clientSnapshot.address}</div>}
        <table>
          <thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {i.items.map(item => (
              <tr key={item.id}>
                <td>{item.name || '—'}</td>
                <td className="num">{item.quantity}</td>
                <td className="num">{formatIDR(item.price)}</td>
                <td className="num">{formatIDR(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Subtotal: <b className="num">{formatIDR(i.subtotal)}</b></div>
          {i.discount > 0 && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Discount: <b className="num">-{formatIDR(i.discount)}</b></div>}
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Tax (<span className="num">{i.taxRate}</span>%): <b className="num">{formatIDR(i.taxAmount)}</b></div>
          <div className="grand-total"><span>Total</span><span className="num">{formatIDR(i.total)}</span></div>
        </div>
      </div>
    );
  };

  const renderReceiptPreview = () => {
    const r = buildReceipt();
    return (
      <div className="pdf-page">
        <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 20, color: 'var(--color-primary)' }}>RECEIPT</div>
        <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Payment received</div>
        <div className="badge-paid-pill" style={{ margin: '10px 0', display: 'inline-block' }}>PAID</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 8 }}>
          No: <span className="num">{r.number}</span><br />
          {r.invoiceNumber && <>Invoice Ref: <span className="num">{r.invoiceNumber}</span><br /></>}
          Date: <span className="num">{formatDateISO(r.paymentDate)}</span><br />
          {r.paymentMethod && <>Method: {r.paymentMethod}</>}
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Received From</div>
          <div style={{ fontWeight: 600, fontSize: 12 }}>{r.clientSnapshot.name || '—'}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Amount Paid</div>
          <div className="num" style={{ fontWeight: 800, fontSize: 20, color: 'var(--color-primary)', marginTop: 4 }}>{formatIDR(r.amountPaid)}</div>
        </div>
        {r.notes && <div style={{ marginTop: 12, fontSize: 10, color: 'var(--color-text-muted)' }}>{r.notes}</div>}
      </div>
    );
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{isEdit ? 'Edit' : 'New'} {isReceipt ? 'Receipt' : 'Invoice'}</h1>
          <p className="sub">{inv.number || rec.number}</p>
        </div>
        <button type="button" className="btn btn-ghost" aria-pressed={preview} onClick={() => setPreview(p => !p)}>
          {preview ? 'Edit form' : 'Preview PDF'}
        </button>
      </div>

      {/* Mobile preview toggle */}
      {preview && (
        <div className="hide-desktop">
          {isReceipt ? renderReceiptPreview() : renderInvoicePreview()}
          <div className="action-bar">
            <button type="button" className="btn btn-primary btn-block" onClick={handleDownloadPDF}>Download PDF</button>
            <button type="button" className="btn btn-secondary btn-block" onClick={handleCopyText}>Copy as plain text</button>
          </div>
          <button type="button" className="btn btn-ghost btn-block mt-12" onClick={() => setPreview(false)}>Back to editor</button>
        </div>
      )}

      {!preview && (
        <div className={`split editor-preview`}>
          <div>
            {/* ─── Form ─── */}
            <div className="card card-pad-lg">

              {/* Basic info */}
              <button type="button" className="section-title" aria-expanded={expanded.basic} onClick={() => setExpanded(e => ({ ...e, basic: !e.basic }))} style={{ width: '100%' }}>
                Basic Info {expanded.basic ? '▾' : '▸'}
              </button>
              {expanded.basic && (
                <div className="mt-8">
                  <div className="field">
                    <label className="field-label" htmlFor="document-number">Number</label>
                    {isReceipt ? (
                      <input id="document-number" name="documentNumber" autoComplete="off" className="input" value={rec.number || ''} onChange={e => setRec(r => ({ ...r, number: e.target.value }))} />
                    ) : (
                      <input id="document-number" name="documentNumber" autoComplete="off" className="input" value={inv.number || ''} onChange={e => setInv(i => ({ ...i, number: e.target.value }))} />
                    )}
                  </div>
                  {isReceipt ? (
                    <div className="field">
                      <label className="field-label" htmlFor="payment-date">Payment Date</label>
                      <input id="payment-date" name="paymentDate" type="date" className="input" value={rec.paymentDate || ''} onChange={e => setRec(r => ({ ...r, paymentDate: e.target.value }))} />
                    </div>
                  ) : (
                    <div className="field-row">
                      <div className="field">
                        <label className="field-label" htmlFor="issue-date">Issue Date</label>
                        <input id="issue-date" name="issueDate" type="date" className="input" value={inv.issueDate || ''} onChange={e => setInv(i => ({ ...i, issueDate: e.target.value }))} />
                      </div>
                      <div className="field">
                        <label className="field-label" htmlFor="due-date">Due Date</label>
                        <input id="due-date" name="dueDate" type="date" className="input" value={inv.dueDate || ''} onChange={e => setInv(i => ({ ...i, dueDate: e.target.value }))} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Client */}
              <button type="button" className="section-title" aria-expanded={expanded.client} onClick={() => setExpanded(e => ({ ...e, client: !e.client }))} style={{ width: '100%' }}>
                Client {expanded.client ? '▾' : '▸'}
              </button>
              {expanded.client && (
                <div className="mt-8">
                  <div className="field" style={{ position: 'relative' }}>
                    <label className="field-label" htmlFor="document-client-name">Client Name</label>
                    {isReceipt ? (
                      <input id="document-client-name" name="clientName" autoComplete="organization" className="input" placeholder="Search or enter client name…" value={rec.clientSnapshot?.name || ''} onChange={e => {
                        setValidationError(err => err?.fieldId === 'document-client-name' ? null : err);
                        setRec(r => ({ ...r, clientId: undefined, clientSnapshot: { ...r.clientSnapshot, name: e.target.value } }));
                      }} onFocus={e => e.target.select()} aria-invalid={validationError?.fieldId === 'document-client-name'} aria-describedby={validationError?.fieldId === 'document-client-name' ? 'document-client-name-error' : undefined} role="combobox" aria-expanded={false} aria-autocomplete="list" />
                    ) : (
                      <input id="document-client-name" name="clientName" autoComplete="organization" className="input" placeholder="Search or enter client name…" value={inv.clientSnapshot?.name || ''} onChange={e => {
                        setValidationError(err => err?.fieldId === 'document-client-name' ? null : err);
                        setInv(i => ({ ...i, clientId: undefined, clientSnapshot: { ...i.clientSnapshot, name: e.target.value } }));
                      }} onFocus={e => e.target.select()} aria-invalid={validationError?.fieldId === 'document-client-name'} aria-describedby={validationError?.fieldId === 'document-client-name' ? 'document-client-name-error' : undefined} role="combobox" aria-expanded={false} aria-autocomplete="list" />
                    )}
                    {validationError?.fieldId === 'document-client-name' && <div id="document-client-name-error" className="field-error" role="alert">{validationError.message}</div>}
                  </div>
                  {/* Client suggestions */}
                  {(() => {
                    const clientName = isReceipt ? (rec.clientSnapshot?.name || '') : (inv.clientSnapshot?.name || '');
                    if (!clientName.trim()) return null;
                    const t = clientName.toLowerCase().trim();
                    const matches = clients.filter(c => c.name.toLowerCase() !== t && c.name.toLowerCase().includes(t));
                    if (matches.length === 0) return null;
                    return (
                      <div className="suggestion-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0 }} role="listbox">
                        {matches.slice(0, 5).map(c => (
                          <button key={c.id} type="button" role="option" className="suggestion-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => selectClient(c.id)}>
                            <span className="avatar-small">{c.name.charAt(0).toUpperCase()}</span>
                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                            {c.email && <span className="item-meta">{c.email}</span>}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Items (invoice only) */}
              {!isReceipt && (
                <>
                  <button type="button" className="section-title" aria-expanded={expanded.items} onClick={() => setExpanded(e => ({ ...e, items: !e.items }))} style={{ width: '100%' }}>
                    Items {expanded.items ? '▾' : '▸'}
                  </button>
                  {expanded.items && (
                    <div className="mt-8">
	                      {lineItems.map((item, idx) => (
	                        <div key={item.id} style={{ marginBottom: 16 }}>
	                          <div style={{ position: 'relative' }}>
	                            <input id={`item-${item.id}-name`} className="input" name={`item-${idx + 1}-name`} aria-label={`Item ${idx + 1} name`} placeholder="Type item name or search catalog…" value={item.name} onChange={e => { setValidationError(err => err?.fieldId === `item-${item.id}-name` ? null : err); updateLineItem(idx, 'name', e.target.value); }} onFocus={e => e.target.select()} style={{ fontWeight: 600, marginBottom: 6 }} aria-invalid={validationError?.fieldId === `item-${item.id}-name`} aria-describedby={validationError?.fieldId === `item-${item.id}-name` ? `item-${item.id}-name-error` : undefined} role="combobox" aria-expanded={false} aria-autocomplete="list" />
	                            {item.name.trim() && (() => {
	                              const t = item.name.toLowerCase().trim();
	                              const matches = items.filter(c => c.name.toLowerCase() !== t && c.name.toLowerCase().includes(t));
	                              if (matches.length === 0) return null;
	                              return (
	                                <div className="suggestion-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 140 }} role="listbox">
	                                  {matches.slice(0, 4).map(c => (
	                                    <button key={c.id} type="button" role="option" className="suggestion-dropdown-item" onMouseDown={e => e.preventDefault()} onClick={() => { updateLineItem(idx, 'name', c.name); updateLineItem(idx, 'price', c.price); }}>
	                                      <span style={{ fontWeight: 600 }}>{c.name}</span>
	                                      <span className="item-meta">{formatIDR(c.price)}</span>
	                                    </button>
	                                  ))}
	                                </div>
	                              );
	                            })()}
	                          </div>
	                          {validationError?.fieldId === `item-${item.id}-name` && <div id={`item-${item.id}-name-error`} className="field-error" role="alert">{validationError.message}</div>}
	                          <div className="field-row-3" style={{ marginBottom: 4 }}>
                            <div>
                              <label className="field-label" htmlFor={`item-${item.id}-quantity`}>Qty</label>
                              <input id={`item-${item.id}-quantity`} name={`item-${idx + 1}-quantity`} type="number" className="input num" min="1" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                            </div>
                            <div>
                              <label className="field-label" htmlFor={`item-${item.id}-price`}>Price</label>
                              <input id={`item-${item.id}-price`} name={`item-${idx + 1}-price`} className="input num" value={formatIDRInput(item.price)} onChange={e => updateLineItem(idx, 'price', parseIDRInput(e.target.value))} inputMode="numeric" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="field-label">Amount</span>
                              <span style={{ padding: '11px 14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)', minHeight: 44, display: 'flex', alignItems: 'center' }}>{formatIDR(item.quantity * item.price)}</span>
                            </div>
                          </div>
                          {lineItems.length > 1 && (
                            <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => removeLineItem(idx)}>Remove item</button>
                          )}
                        </div>
                      ))}
                      <button type="button" className="btn btn-secondary btn-sm" onClick={addLineItem}>+ Add item</button>
                    </div>
                  )}
                </>
              )}

              {/* Adjustments (invoice only) */}
              {!isReceipt && (
                <>
                  <button type="button" className="section-title" aria-expanded={expanded.adjustments} onClick={() => setExpanded(e => ({ ...e, adjustments: !e.adjustments }))} style={{ width: '100%' }}>
                    Adjustments {expanded.adjustments ? '▾' : '▸'}
                  </button>
                  {expanded.adjustments && (
                    <div className="mt-8">
                      <div className="field-row">
                        <div className="field">
                          <label className="field-label" htmlFor="invoice-discount">Discount (Rp)</label>
                          <input id="invoice-discount" name="discount" className="input num" value={formatIDRInput(inv.discount || 0)} onChange={e => setInv(i => ({ ...i, discount: parseIDRInput(e.target.value) }))} inputMode="numeric" />
                        </div>
                        <div className="field">
                          <label className="field-label" htmlFor="invoice-tax-rate">Tax (%)</label>
                          <input id="invoice-tax-rate" name="taxRate" type="number" className="input num" min="0" max="100" value={inv.taxRate ?? 11} onChange={e => setInv(i => ({ ...i, taxRate: parseFloat(e.target.value) || 0 }))} />
                        </div>
                      </div>
                      <div className="totals">
                        <div className="row"><span className="muted">Subtotal</span><span className="v num">{formatIDR(totals.subtotal)}</span></div>
                        {totals.discount > 0 && <div className="row"><span className="muted">Discount</span><span className="v num">-{formatIDR(totals.discount)}</span></div>}
                        <div className="row"><span className="muted">Tax ({inv.taxRate || 0}%)</span><span className="v num">{formatIDR(totals.taxAmount)}</span></div>
                        <div className="row grand"><span>Total</span><span className="v num">{formatIDR(totals.total)}</span></div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Payment */}
              <button type="button" className="section-title" aria-expanded={expanded.payment} onClick={() => setExpanded(e => ({ ...e, payment: !e.payment }))} style={{ width: '100%' }}>
                Payment {expanded.payment ? '▾' : '▸'}
              </button>
              {expanded.payment && (
                <div className="mt-8">
                  <div className="field">
                    <label className="field-label" htmlFor="payment-method">Payment Method</label>
                    {isReceipt ? (
                      <input id="payment-method" name="paymentMethod" autoComplete="off" className="input" value={rec.paymentMethod || ''} onChange={e => setRec(r => ({ ...r, paymentMethod: e.target.value }))} placeholder="Bank Transfer…" />
                    ) : (
                      <>
                        <input id="payment-method" name="paymentMethod" autoComplete="off" className="input" value={inv.paymentMethod || ''} onChange={e => setInv(i => ({ ...i, paymentMethod: e.target.value }))} placeholder="Bank Transfer…" />
                        <div className="field-row" style={{ marginTop: 8 }}>
                          <div className="field">
                            <label className="field-label" htmlFor="invoice-bank-name">Bank</label>
                            <input id="invoice-bank-name" name="bankName" autoComplete="off" className="input" value={inv.bankName || ''} onChange={e => setInv(i => ({ ...i, bankName: e.target.value }))} />
                          </div>
                          <div className="field">
                            <label className="field-label" htmlFor="invoice-bank-account-number">Account Number</label>
                            <input id="invoice-bank-account-number" name="bankAccountNumber" autoComplete="off" className="input num" value={inv.bankAccountNumber || ''} onChange={e => setInv(i => ({ ...i, bankAccountNumber: e.target.value }))} />
                          </div>
                        </div>
                        <div className="field">
                          <label className="field-label" htmlFor="invoice-bank-account-holder">Account Holder</label>
                          <input id="invoice-bank-account-holder" name="bankAccountHolder" autoComplete="off" className="input" value={inv.bankAccountHolder || ''} onChange={e => setInv(i => ({ ...i, bankAccountHolder: e.target.value }))} />
                        </div>
                      </>
                    )}
                  </div>
	                  {isReceipt && (
	                    <div className="field">
	                      <label className="field-label" htmlFor="amount-paid">Amount Paid (Rp)</label>
	                      <input id="amount-paid" name="amountPaid" className="input num" value={formatIDRInput(rec.amountPaid || 0)} onChange={e => { setValidationError(err => err?.fieldId === 'amount-paid' ? null : err); setRec(r => ({ ...r, amountPaid: parseIDRInput(e.target.value) })); }} inputMode="numeric" aria-invalid={validationError?.fieldId === 'amount-paid'} aria-describedby={validationError?.fieldId === 'amount-paid' ? 'amount-paid-error' : undefined} />
	                      {validationError?.fieldId === 'amount-paid' && <div id="amount-paid-error" className="field-error" role="alert">{validationError.message}</div>}
	                    </div>
	                  )}
                  {!isReceipt && (
                    <div className="totals">
                      <div className="row grand"><span>Total</span><span className="v num">{formatIDR(totals.total)}</span></div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <button type="button" className="section-title" aria-expanded={expanded.notes} onClick={() => setExpanded(e => ({ ...e, notes: !e.notes }))} style={{ width: '100%' }}>
                Notes &amp; Terms {expanded.notes ? '▾' : '▸'}
              </button>
              {expanded.notes && (
                <div className="mt-8">
                  <div className="field">
                    <label className="field-label" htmlFor="document-notes">Notes</label>
                    <textarea id="document-notes" name="notes" autoComplete="off" className="textarea" rows={2} value={isReceipt ? (rec.notes || '') : (inv.notes || '')} onChange={e => isReceipt ? setRec(r => ({ ...r, notes: e.target.value })) : setInv(i => ({ ...i, notes: e.target.value }))} placeholder="Thank you for your business…" />
                  </div>
                  {!isReceipt && (
                    <div className="field">
                      <label className="field-label" htmlFor="document-terms">Terms</label>
                      <textarea id="document-terms" name="terms" autoComplete="off" className="textarea" rows={2} value={inv.terms || ''} onChange={e => setInv(i => ({ ...i, terms: e.target.value }))} placeholder="Payment is due within 7 days…" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile totals summary */}
            {isReceipt && (
              <div className="totals mt-16">
                <div className="row grand"><span>Total</span><span className="v num">{formatIDR(rec.amountPaid || 0)}</span></div>
              </div>
            )}

            {/* Actions */}
            <div className="action-bar">
              <button type="button" className="btn btn-primary btn-block" onClick={() => handleSave()} disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save'}
              </button>
            </div>
          </div>

          {/* Desktop preview pane */}
          <div className="preview-pane hide-mobile">
            {isReceipt ? renderReceiptPreview() : renderInvoicePreview()}
            <div className="form-actions mt-16">
              <button type="button" className="btn btn-secondary" onClick={handleDownloadPDF}>Download PDF</button>
              <button type="button" className="btn btn-secondary" onClick={handleCopyText}>Copy as plain text</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
