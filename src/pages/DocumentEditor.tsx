import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DuplicateReceiptError, getInvoice, getReceipt, getReceipts, saveInvoice, saveReceiptAndSyncInvoice, getBusiness, getClients, getItems, nextNumber, peekNextNumber } from '../lib/db';
import { seedOnce } from '../lib/seed';
import { useToast } from '../context/toastContext';
import { formatIDR, parseIDRInput, calcTotals, formatDateISO, copyInvoiceText, copyReceiptText } from '../lib/format';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
import type { Invoice, Receipt, InvoiceItem, BusinessProfile, Client, Item } from '../types';
import { addDaysISO, newId, nowISO, todayISO } from '../types';
import { DocumentEditorForm } from '../components/DocumentEditorForm';
import { LoadingScreen } from '../components/LoadingScreen';
import type { EditorValidationError } from '../components/editorTypes';

function renderInvoicePreview(i: Invoice, biz: BusinessProfile | undefined) {
  return (
    <div className="pdf-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          {biz?.name && <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{biz.name}</div>}
          {biz?.address && <div className="meta" style={{ fontSize: '0.625rem', marginTop: 2 }}>{biz.address}</div>}
          {biz?.email && <div className="meta" style={{ fontSize: '0.625rem' }}>{biz.email}</div>}
          {biz?.phone && <div className="meta" style={{ fontSize: '0.625rem' }}>{biz.phone}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)' }}>INVOICE</div>
          <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', marginTop: 4 }}>No: <span className="num">{i.number}</span></div>
          <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>Date: <span className="num">{formatDateISO(i.issueDate)}</span></div>
          {i.dueDate && <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>Due: <span className="num">{formatDateISO(i.dueDate)}</span></div>}
        </div>
      </div>
      <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Bill To</div>
      <div style={{ fontWeight: 600, fontSize: '0.75rem' }}>{i.clientSnapshot.name || '-'}</div>
      {i.clientSnapshot.address && <div style={{ fontSize: '0.625rem' }}>{i.clientSnapshot.address}</div>}
      <div className="pdf-table-wrap" role="region" aria-labelledby="invoice-items-caption" tabIndex={0}>
        <table>
          <caption id="invoice-items-caption" className="sr-only">Invoice line items</caption>
          <thead><tr><th scope="col">Description</th><th scope="col" className="num">Qty</th><th scope="col" className="num">Price</th><th scope="col" className="num">Amount</th></tr></thead>
          <tbody>
            {i.items.map(item => (
              <tr key={item.id}>
                <td>{item.name || '-'}</td>
                <td className="num">{item.quantity}</td>
                <td className="num">{formatIDR(item.price)}</td>
                <td className="num">{formatIDR(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Subtotal: <b className="num">{formatIDR(i.subtotal)}</b></div>
        {i.discount > 0 && <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Discount: <b className="num">-{formatIDR(i.discount)}</b></div>}
        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Tax (<span className="num">{i.taxRate}</span>%): <b className="num">{formatIDR(i.taxAmount)}</b></div>
        <div className="grand-total"><span>Total</span><span className="num">{formatIDR(i.total)}</span></div>
      </div>
    </div>
  );
}

function renderReceiptPreview(r: Receipt) {
  return (
    <div className="pdf-page">
      <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)' }}>RECEIPT</div>
      <div style={{ marginTop: 12, fontSize: '0.875rem', fontWeight: 600 }}>Payment received</div>
      <div className="badge-paid-pill" style={{ margin: '10px 0', display: 'inline-block' }}>PAID</div>
      <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
        No: <span className="num">{r.number}</span><br />
        {r.invoiceNumber && <>Invoice Ref: <span className="num">{r.invoiceNumber}</span><br /></>}
        Date: <span className="num">{formatDateISO(r.paymentDate)}</span><br />
        {r.paymentMethod && <>Method: {r.paymentMethod}</>}
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Received From</div>
        <div style={{ fontWeight: 600, fontSize: '0.75rem' }}>{r.clientSnapshot.name || '-'}</div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Amount Paid</div>
        <div className="num" style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)', marginTop: 4 }}>{formatIDR(r.amountPaid)}</div>
      </div>
      {r.notes && <div style={{ marginTop: 12, fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>{r.notes}</div>}
    </div>
  );
}

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
  const [linkedReceipt, setLinkedReceipt] = useState<Receipt | undefined>();

  // Invoice state
  const [inv, setInv] = useState<Partial<Invoice>>({});
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);
  // Receipt state
  const [rec, setRec] = useState<Partial<Receipt>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
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

  // Data loading
  const loadNewReceipt = async (clientData: Client[]) => {
    const params = new URLSearchParams(query);
    const clientId = params.get('clientId') || undefined;
    const amount = parseIDRInput(params.get('amount') || '');
    const number = await peekNextNumber('receipt');
    const client = clientId ? clientData.find(c => c.id === clientId) : undefined;
    setSuggestedNumber(number);
    setRec({
      ...blankReceipt(number),
      invoiceId: params.get('invoiceId') || undefined,
      invoiceNumber: params.get('invoiceNumber') || undefined,
      clientId,
      clientSnapshot: {
        name: client?.name || params.get('clientName') || '',
        email: client?.email,
        phone: client?.phone,
        address: client?.address,
      },
      amountPaid: amount,
    });
  };

  const loadNewInvoice = async (bizData: BusinessProfile | undefined) => {
    const num = await peekNextNumber('invoice');
    setSuggestedNumber(num);
    const invData = blankInvoice(num, bizData);
    setInv(invData);
    setLineItems(invData.items || []);
  };

  const loadExistingDoc = async (): Promise<boolean> => {
    if (!id) return true;
    if (isReceipt) {
      const existing = await getReceipt(id);
      if (!existing) return false;
      setRec(existing);
      return true;
    }
    const existing = await getInvoice(id);
    if (!existing) return false;
    setInv(existing);
    setLineItems(existing.items);
    const receipts = await getReceipts();
    setLinkedReceipt(receipts.find(r => r.invoiceId === id && r.status !== 'cancelled'));
    return true;
  };

  // Load data
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    setNotFound(false);
    setInitialSnapshot('');
    setValidationError(null);
    setLinkedReceipt(undefined);
    void (async () => {
      try {
        await seedOnce();
        const [bizData, clientData] = await Promise.all([getBusiness(), getClients()]);
        const itemData = await getItems();
        if (!active) return;
        setBiz(bizData);
        setClients(clientData);
        setItems(itemData);
        if (isReceipt && id === undefined) await loadNewReceipt(clientData);
        else if (!isReceipt && id === undefined) await loadNewInvoice(bizData);
        else {
          const found = await loadExistingDoc();
          if (active && !found) setNotFound(true);
        }
      } catch (err) {
        console.error(err);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, isReceipt, query, reloadKey]);

  useEffect(() => {
    if (!loading && !initialSnapshot) setInitialSnapshot(stateSnapshot);
  }, [initialSnapshot, loading, stateSnapshot]);

  // Invoice calculations
  const updateLineItem = (idx: number, field: 'name' | 'description' | 'quantity' | 'price' | 'unit', value: string | number) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const next = { ...item, [field]: value };
      if (field === 'quantity' || field === 'price') next.amount = Number(next.quantity) * Number(next.price);
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
      discount: totals.discount,
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

  // Validation
  const validate = (): EditorValidationError | null => {
    if (!isReceipt && inv.issueDate && inv.dueDate && inv.dueDate < inv.issueDate) {
      return { fieldId: 'due-date', message: 'Due date cannot be before the issue date.', section: 'basic' };
    }
    const clientName = isReceipt ? rec.clientSnapshot?.name : inv.clientSnapshot?.name;
    if (!clientName?.trim()) return { fieldId: 'document-client-name', message: 'Enter a client name.', section: 'client' };
    if (!isReceipt) {
      const hasItem = lineItems.some(i => i.name.trim());
      const firstItemId = lineItems[0] ? `item-${lineItems[0].id}-name` : 'catalog-item';
      if (!hasItem) return { fieldId: firstItemId, message: 'Add at least one item.', section: 'items' };
      if ((inv.discount || 0) > totals.subtotal) {
        return { fieldId: 'invoice-discount', message: 'Discount cannot be more than the subtotal.', section: 'adjustments' };
      }
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

  // Save helpers
  const runGuarded = async (action: () => Promise<void>) => {
    setSaving(true);
    try {
      await action();
    } catch (err) {
      console.error(err);
      const message = err instanceof DuplicateReceiptError ? err.message : 'Failed to save. Please try again.';
      toast(message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const saveReceiptFlow = async (status?: string) => {
    // Check for an existing receipt *before* allocating a number, so a rejected
    // duplicate does not burn a counter slot.
    if (rec.invoiceId && !isEdit) {
      const existingReceipt = (await getReceipts()).find(existing =>
        existing.invoiceId === rec.invoiceId &&
        existing.status !== 'cancelled'
      );
      if (existingReceipt) {
        toast('Receipt already exists for this invoice.', 'danger');
        nav(`/documents/receipt/${existingReceipt.id}`);
        return;
      }
    }
    const r = { ...buildReceipt(status as Receipt['status']), number: await saveNumber('receipt', rec.number) };
    await saveReceiptAndSyncInvoice(r);
    setInitialSnapshot(stateSnapshot);
    toast('Receipt saved.', 'success');
    nav('/documents');
  };

  const saveInvoiceFlow = async (status?: string) => {
    const i = { ...buildInvoice(status as Invoice['status']), number: await saveNumber('invoice', inv.number) };
    await saveInvoice(i);
    setInitialSnapshot(stateSnapshot);
    toast('Invoice saved.', 'success');
    nav('/documents');
  };

  // Save
  const handleSave = async (status?: string) => {
    const err = validate();
    if (err) { showValidationError(err); return; }
    if (!isReceipt && isEdit && linkedReceipt && totals.total !== (inv.total ?? 0)) {
      toast('This invoice has an active receipt. Delete or cancel the receipt before changing the total.', 'danger');
      return;
    }
    await runGuarded(() => isReceipt ? saveReceiptFlow(status) : saveInvoiceFlow(status));
  };

  // PDF
  const handleDownloadPDF = async () => {
    if (!biz) { toast('Set up your business profile first.', 'danger'); return; }
    try {
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
    } catch (err) {
      console.error(err);
      toast('Failed to download PDF.', 'danger');
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

  const pickItem = (idx: number, name: string, price: number) => {
    updateLineItem(idx, 'name', name);
    updateLineItem(idx, 'price', price);
  };

  if (loading) return <LoadingScreen />;

  if (loadError) {
    return (
      <div className="empty" role="alert">
        <h3>Could not load this document</h3>
        <p>Your saved data is still on this device. Try again, or return to the documents list.</p>
        <button type="button" className="btn btn-primary" onClick={() => setReloadKey(key => key + 1)}>Try again</button>
        <button type="button" className="btn btn-secondary" onClick={() => nav('/documents')}>Back to Documents</button>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="empty">
        <h3>Document not found</h3>
        <p>This document may have been deleted. Go back to the documents list.</p>
        <button type="button" className="btn btn-primary" onClick={() => nav('/documents')}>Back to Documents</button>
      </div>
    );
  }

  // Live preview (inline)
  const invoicePreview = isReceipt ? null : renderInvoicePreview(buildInvoice(), biz);
  const receiptPreview = isReceipt ? renderReceiptPreview(buildReceipt()) : null;

  let saveLabel = 'Save';
  if (saving) saveLabel = 'Saving…';
  else if (isEdit) saveLabel = 'Save Changes';
  const docTypeHeading = `${isEdit ? 'Edit' : 'New'} ${isReceipt ? 'Receipt' : 'Invoice'}`;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{docTypeHeading}</h1>
          <p className="sub">{inv.number || rec.number}</p>
        </div>
        <button type="button" className="btn btn-ghost" aria-pressed={preview} onClick={() => setPreview(p => !p)}>
          {preview ? 'Edit form' : 'Preview PDF'}
        </button>
      </div>

      {!isReceipt && linkedReceipt && (
        <p className="field-hint">
          This invoice has an active receipt, so its total is locked. Delete or cancel the receipt first to change the total.
        </p>
      )}

      {/* Mobile preview toggle */}
      {preview && (
        <div className="hide-desktop">
          {receiptPreview ?? invoicePreview}
          <div className="action-bar">
            <button type="button" className="btn btn-primary btn-block" onClick={handleDownloadPDF}>Download PDF</button>
            <button type="button" className="btn btn-secondary btn-block" onClick={handleCopyText}>Copy as plain text</button>
          </div>
          <button type="button" className="btn btn-ghost btn-block mt-12" onClick={() => setPreview(false)}>Back to editor</button>
        </div>
      )}

      {!preview && (
        <div className="split editor-preview">
          <div>
            <DocumentEditorForm
              isReceipt={isReceipt}
              saving={saving}
              saveLabel={saveLabel}
              inv={inv}
              rec={rec}
              lineItems={lineItems}
              totals={totals}
              expanded={expanded}
              validationError={validationError}
              clients={clients}
              items={items}
              setInv={setInv}
              setRec={setRec}
              setExpanded={setExpanded}
              setValidationError={setValidationError}
              selectClient={selectClient}
              pickItem={pickItem}
              updateLineItem={updateLineItem}
              addLineItem={addLineItem}
              removeLineItem={removeLineItem}
              handleSave={() => handleSave()}
            />
          </div>

          {/* Desktop preview pane */}
          <div className="preview-pane hide-mobile">
            {receiptPreview ?? invoicePreview}
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
