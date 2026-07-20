import type { Dispatch, SetStateAction } from 'react';
import { formatIDR, formatIDRInput, parseIDRInput } from '../lib/format';
import { renderClientSuggestions, renderItemSuggestions } from './DocumentEditorSuggestions';
import type { Client, EditorValidationError, Invoice, InvoiceItem, Item, Receipt, Totals } from './editorTypes';

export type DocumentEditorFormProps = Readonly<{
  isReceipt: boolean;
  saving: boolean;
  saveLabel: string;
  inv: Partial<Invoice>;
  rec: Partial<Receipt>;
  lineItems: InvoiceItem[];
  totals: Totals;
  expanded: Record<string, boolean>;
  validationError: EditorValidationError | null;
  clients: Client[];
  items: Item[];
  setInv: Dispatch<SetStateAction<Partial<Invoice>>>;
  setRec: Dispatch<SetStateAction<Partial<Receipt>>>;
  setExpanded: Dispatch<SetStateAction<Record<string, boolean>>>;
  setValidationError: Dispatch<SetStateAction<EditorValidationError | null>>;
  selectClient: (id: string) => void;
  pickItem: (idx: number, name: string, price: number) => void;
  updateLineItem: (idx: number, field: 'name' | 'description' | 'quantity' | 'price' | 'unit', value: string | number) => void;
  addLineItem: () => void;
  removeLineItem: (idx: number) => void;
  handleSave: () => void;
}>;

function toggleSection(setExpanded: DocumentEditorFormProps['setExpanded'], key: string) {
  setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
}

function SectionTitle(props: Readonly<{ title: string; open: boolean; onToggle: () => void }>) {
  const { title, open, onToggle } = props;
  return (
    <button type="button" className="section-title" aria-expanded={open} onClick={onToggle} style={{ width: '100%' }}>
      {title} {open ? '▾' : '▸'}
    </button>
  );
}

function BasicInfoSection(props: Readonly<Pick<DocumentEditorFormProps, 'isReceipt' | 'inv' | 'rec' | 'expanded' | 'setInv' | 'setRec' | 'setExpanded'>>) {
  const { isReceipt, inv, rec, expanded, setInv, setRec, setExpanded } = props;
  return (
    <>
      <SectionTitle title="Basic Info" open={expanded.basic ?? false} onToggle={() => toggleSection(setExpanded, 'basic')} />
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
    </>
  );
}

function ClientSection(props: Readonly<Pick<DocumentEditorFormProps, 'isReceipt' | 'inv' | 'rec' | 'clients' | 'expanded' | 'validationError' | 'setInv' | 'setRec' | 'setExpanded' | 'setValidationError' | 'selectClient'>>) {
  const { isReceipt, inv, rec, clients, expanded, validationError, setInv, setRec, setExpanded, setValidationError, selectClient } = props;
  const clientName = isReceipt ? (rec.clientSnapshot?.name || '') : (inv.clientSnapshot?.name || '');
  const ariaError = validationError?.fieldId === 'document-client-name' ? 'document-client-name-error' : undefined;
  return (
    <>
      <SectionTitle title="Client" open={expanded.client ?? false} onToggle={() => toggleSection(setExpanded, 'client')} />
      {expanded.client && (
        <div className="mt-8">
          <div className="field" style={{ position: 'relative' }}>
            <label className="field-label" htmlFor="document-client-name">Client Name</label>
            <input
              id="document-client-name"
              name="clientName"
              autoComplete="organization"
              className="input"
              placeholder="Search or enter client name…"
              value={clientName}
              onChange={e => {
                setValidationError(err => err?.fieldId === 'document-client-name' ? null : err);
                if (isReceipt) setRec(r => ({ ...r, clientId: undefined, clientSnapshot: { ...r.clientSnapshot, name: e.target.value } }));
                else setInv(i => ({ ...i, clientId: undefined, clientSnapshot: { ...i.clientSnapshot, name: e.target.value } }));
              }}
              onFocus={e => e.target.select()}
              aria-invalid={ariaError ? true : undefined}
              aria-describedby={ariaError}
              role="combobox"
              aria-expanded={false}
              aria-autocomplete="list"
              aria-controls="client-suggestions"
            />
            {validationError?.fieldId === 'document-client-name' && <div id="document-client-name-error" className="field-error" role="alert">{validationError.message}</div>}
          </div>
          {renderClientSuggestions(isReceipt, rec, inv, clients, selectClient)}
        </div>
      )}
    </>
  );
}

function ItemsSection(props: Readonly<Pick<DocumentEditorFormProps, 'lineItems' | 'items' | 'expanded' | 'validationError' | 'setExpanded' | 'setValidationError' | 'pickItem' | 'updateLineItem' | 'addLineItem' | 'removeLineItem'>>) {
  const { lineItems, items, expanded, validationError, setExpanded, setValidationError, pickItem, updateLineItem, addLineItem, removeLineItem } = props;
  return (
    <>
      <SectionTitle title="Items" open={expanded.items ?? false} onToggle={() => toggleSection(setExpanded, 'items')} />
      {expanded.items && (
        <div className="mt-8">
          {lineItems.map((item, idx) => {
            const errorFieldId = `item-${item.id}-name`;
            const showError = validationError?.fieldId === errorFieldId;
            return (
              <div key={item.id} style={{ marginBottom: 16 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    id={errorFieldId}
                    className="input"
                    name={`item-${idx + 1}-name`}
                    aria-label={`Item ${idx + 1} name`}
                    placeholder="Type item name or search catalog…"
                    value={item.name}
                    onChange={e => { setValidationError(err => err?.fieldId === errorFieldId ? null : err); updateLineItem(idx, 'name', e.target.value); }}
                    onFocus={e => e.target.select()}
                    style={{ fontWeight: 600, marginBottom: 6 }}
                    aria-invalid={showError ? true : undefined}
                    aria-describedby={showError ? `${errorFieldId}-error` : undefined}
                    role="combobox"
                    aria-expanded={false}
                    aria-autocomplete="list"
                    aria-controls={`item-${item.id}-suggestions`}
                  />
                  {renderItemSuggestions(item, idx, items, pickItem)}
                </div>
                {showError && <div id={`${errorFieldId}-error`} className="field-error" role="alert">{validationError.message}</div>}
                <div className="field-row-3" style={{ marginBottom: 4 }}>
                  <div>
                    <label className="field-label" htmlFor={`item-${item.id}-quantity`}>Qty</label>
                    <input id={`item-${item.id}-quantity`} name={`item-${idx + 1}-quantity`} type="number" className="input num" min="1" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', Math.max(1, Number.parseInt(e.target.value) || 1))} />
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
            );
          })}
          <button type="button" className="btn btn-secondary btn-sm" onClick={addLineItem}>+ Add item</button>
        </div>
      )}
    </>
  );
}

function AdjustmentsSection(props: Readonly<Pick<DocumentEditorFormProps, 'inv' | 'totals' | 'expanded' | 'setInv' | 'setExpanded'>>) {
  const { inv, totals, expanded, setInv, setExpanded } = props;
  return (
    <>
      <SectionTitle title="Adjustments" open={expanded.adjustments ?? false} onToggle={() => toggleSection(setExpanded, 'adjustments')} />
      {expanded.adjustments && (
        <div className="mt-8">
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="invoice-discount">Discount (Rp)</label>
              <input id="invoice-discount" name="discount" className="input num" value={formatIDRInput(inv.discount || 0)} onChange={e => setInv(i => ({ ...i, discount: parseIDRInput(e.target.value) }))} inputMode="numeric" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="invoice-tax-rate">Tax (%)</label>
              <input id="invoice-tax-rate" name="taxRate" type="number" className="input num" min="0" max="100" value={inv.taxRate ?? 11} onChange={e => setInv(i => ({ ...i, taxRate: Number.parseFloat(e.target.value) || 0 }))} />
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
  );
}

function PaymentSection(props: Readonly<Pick<DocumentEditorFormProps, 'isReceipt' | 'inv' | 'rec' | 'totals' | 'expanded' | 'validationError' | 'setInv' | 'setRec' | 'setExpanded' | 'setValidationError'>>) {
  const { isReceipt, inv, rec, totals, expanded, validationError, setInv, setRec, setExpanded, setValidationError } = props;
  const showAmountError = validationError?.fieldId === 'amount-paid';
  return (
    <>
      <SectionTitle title="Payment" open={expanded.payment ?? false} onToggle={() => toggleSection(setExpanded, 'payment')} />
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
              <input
                id="amount-paid"
                name="amountPaid"
                className="input num"
                value={formatIDRInput(rec.amountPaid || 0)}
                onChange={e => { setValidationError(err => err?.fieldId === 'amount-paid' ? null : err); setRec(r => ({ ...r, amountPaid: parseIDRInput(e.target.value) })); }}
                inputMode="numeric"
                aria-invalid={showAmountError ? true : undefined}
                aria-describedby={showAmountError ? 'amount-paid-error' : undefined}
              />
              {showAmountError && <div id="amount-paid-error" className="field-error" role="alert">{validationError.message}</div>}
            </div>
          )}
          {!isReceipt && (
            <div className="totals">
              <div className="row grand"><span>Total</span><span className="v num">{formatIDR(totals.total)}</span></div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function NotesSection(props: Readonly<Pick<DocumentEditorFormProps, 'isReceipt' | 'inv' | 'rec' | 'expanded' | 'setInv' | 'setRec' | 'setExpanded'>>) {
  const { isReceipt, inv, rec, expanded, setInv, setRec, setExpanded } = props;
  return (
    <>
      <SectionTitle title="Notes & Terms" open={expanded.notes ?? false} onToggle={() => toggleSection(setExpanded, 'notes')} />
      {expanded.notes && (
        <div className="mt-8">
          <div className="field">
            <label className="field-label" htmlFor="document-notes">Notes</label>
            <textarea
              id="document-notes"
              name="notes"
              autoComplete="off"
              className="textarea"
              rows={2}
              value={isReceipt ? (rec.notes || '') : (inv.notes || '')}
              onChange={e => (isReceipt ? setRec(r => ({ ...r, notes: e.target.value })) : setInv(i => ({ ...i, notes: e.target.value })))}
              placeholder="Thank you for your business…"
            />
          </div>
          {!isReceipt && (
            <div className="field">
              <label className="field-label" htmlFor="document-terms">Terms</label>
              <textarea
                id="document-terms"
                name="terms"
                autoComplete="off"
                className="textarea"
                rows={2}
                value={inv.terms || ''}
                onChange={e => setInv(i => ({ ...i, terms: e.target.value }))}
                placeholder="Payment is due within 7 days…"
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function DocumentEditorForm(props: DocumentEditorFormProps) {
  const { isReceipt, saving, saveLabel, rec, totals, expanded, validationError, clients, items, lineItems,
    inv, setInv, setRec, setExpanded, setValidationError, selectClient, pickItem, updateLineItem, addLineItem, removeLineItem, handleSave } = props;
  return (
    <div className="card card-pad-lg">
      <BasicInfoSection isReceipt={isReceipt} inv={inv} rec={rec} expanded={expanded} setInv={setInv} setRec={setRec} setExpanded={setExpanded} />
      <ClientSection isReceipt={isReceipt} inv={inv} rec={rec} clients={clients} expanded={expanded} validationError={validationError} setInv={setInv} setRec={setRec} setExpanded={setExpanded} setValidationError={setValidationError} selectClient={selectClient} />
      {!isReceipt && <ItemsSection lineItems={lineItems} items={items} expanded={expanded} validationError={validationError} setExpanded={setExpanded} setValidationError={setValidationError} pickItem={pickItem} updateLineItem={updateLineItem} addLineItem={addLineItem} removeLineItem={removeLineItem} />}
      {!isReceipt && <AdjustmentsSection inv={inv} totals={totals} expanded={expanded} setInv={setInv} setExpanded={setExpanded} />}
      <PaymentSection isReceipt={isReceipt} inv={inv} rec={rec} totals={totals} expanded={expanded} validationError={validationError} setInv={setInv} setRec={setRec} setExpanded={setExpanded} setValidationError={setValidationError} />
      <NotesSection isReceipt={isReceipt} inv={inv} rec={rec} expanded={expanded} setInv={setInv} setRec={setRec} setExpanded={setExpanded} />

      {isReceipt && (
        <div className="totals mt-16">
          <div className="row grand"><span>Total</span><span className="v num">{formatIDR(rec.amountPaid || 0)}</span></div>
        </div>
      )}

      <div className="action-bar">
        <button type="button" className="btn btn-primary btn-block" onClick={handleSave} disabled={saving}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
