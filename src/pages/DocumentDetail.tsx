import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoice, getReceipt, getReceipts, deleteInvoice, deleteReceipt, saveInvoice, getBusiness } from '../lib/db';
import { useToast } from '../context/toast';
import { formatIDR, formatDateISO, copyInvoiceText, copyReceiptText } from '../lib/format';
import type { Invoice, Receipt, BusinessProfile } from '../types';
import { nowISO } from '../types';

export function DocumentDetail() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const nav = useNavigate();
  const { toast } = useToast();
  const isReceipt = type === 'receipt';

  const [doc, setDoc] = useState<Invoice | Receipt | undefined>();
  const [biz, setBiz] = useState<BusinessProfile | undefined>();
  const [linkedReceipt, setLinkedReceipt] = useState<Receipt | undefined>();

  useEffect(() => {
    if (!id) return;
    (async () => {
      setBiz(await getBusiness());
      setLinkedReceipt(undefined);
      if (isReceipt) {
        setDoc(await getReceipt(id));
      } else {
        setDoc(await getInvoice(id));
        const receipts = await getReceipts();
        setLinkedReceipt(receipts.find(r => r.invoiceId === id && r.status !== 'cancelled'));
      }
    })();
  }, [id, isReceipt]);

  if (!doc) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>;

  const handleDelete = async () => {
    if (!confirm(`Delete ${doc.number}?`)) return;
    try {
      if (isReceipt) await deleteReceipt(doc.id);
      else await deleteInvoice(doc.id);
      toast(`${doc.number} deleted`, 'success');
      nav('/documents');
    } catch (err) {
      console.error(err);
      toast('Failed to delete document.', 'danger');
    }
  };

  const handleMarkPaid = async () => {
    const inv = doc as Invoice;
    try {
      const updated = { ...inv, status: 'paid' as const, updatedAt: nowISO() };
      await saveInvoice(updated);
      toast('Invoice marked as paid.', 'success');
      setDoc(updated);
    } catch (err) {
      console.error(err);
      toast('Failed to mark invoice as paid.', 'danger');
    }
  };

  const handleMarkSent = async () => {
    const inv = doc as Invoice;
    try {
      const updated = { ...inv, status: 'sent' as const, updatedAt: nowISO() };
      await saveInvoice(updated);
      toast('Invoice marked as sent.', 'success');
      setDoc(updated);
    } catch (err) {
      console.error(err);
      toast('Failed to mark invoice as sent.', 'danger');
    }
  };

  const handleCreateReceipt = () => {
    const inv = doc as Invoice;
    if (inv.status !== 'paid') {
      toast('Mark this invoice as paid before creating a receipt.', 'danger');
      return;
    }
    if (linkedReceipt) {
      nav(`/documents/receipt/${linkedReceipt.id}`);
      return;
    }
    const params = new URLSearchParams({
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      clientName: inv.clientSnapshot?.name || '',
      amount: String(inv.total),
    });
    if (inv.clientId) params.set('clientId', inv.clientId);
    nav(`/documents/new/receipt?${params.toString()}`);
  };

  const handleNewDocument = () => {
    if (isReceipt) nav('/documents/new/receipt');
    else nav('/documents/new/invoice');
  };

  const handleDownloadPDF = async () => {
    if (!biz) return;
    const { generateInvoicePDF, generateReceiptPDF, downloadPDF } = await import('../lib/pdf');
    if (isReceipt) {
      downloadPDF(generateReceiptPDF(doc as Receipt, biz), `${doc.number}.pdf`);
    } else {
      downloadPDF(generateInvoicePDF(doc as Invoice, biz), `${doc.number}.pdf`);
    }
    toast('PDF downloaded.', 'success');
  };

  const handleCopyText = async () => {
    try {
      let text = '';
      if (isReceipt) {
        text = copyReceiptText(doc as Receipt);
      } else {
        text = copyInvoiceText(doc as Invoice);
      }
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard. Paste in chat to share.', 'success');
    } catch {
      toast('Failed to copy to clipboard.', 'danger');
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="num">{doc.number}</h1>
          <p className="sub">
            {isReceipt ? 'Receipt' : 'Invoice'} · <span className="num">{formatDateISO((doc as any).issueDate || (doc as any).paymentDate)}</span>
          </p>
        </div>
        <span className={`badge badge-${doc.status}`}>{doc.status}</span>
      </div>

      {/* Summary */}
      <div className="card card-pad-lg detail-card">
        <div className="detail-summary">
          <div>
            <div className="detail-label">{isReceipt ? 'Paid by' : 'Bill To'}</div>
            <div className="detail-name">{doc.clientSnapshot?.name || '—'}</div>
            {doc.clientSnapshot?.email && <div className="detail-contact">{doc.clientSnapshot.email}</div>}
            {doc.clientSnapshot?.phone && <div className="detail-contact">{doc.clientSnapshot.phone}</div>}
          </div>
          <div className="right">
            <div className="detail-label">{isReceipt ? 'Amount Paid' : 'Total'}</div>
            <div className="detail-amount num">
              {formatIDR(isReceipt ? (doc as Receipt).amountPaid : (doc as Invoice).total)}
            </div>
          </div>
        </div>
      </div>

      {/* Items (invoice only) */}
      {!isReceipt && (
        <div className="card card-pad-lg detail-card">
          <div className="section-title">Items</div>
          {(doc as Invoice).items.map((item, idx) => (
            <div key={idx} className="item-row">
              <div>
                <div className="item-name">{item.name}</div>
                {item.description && <div className="item-meta">{item.description}</div>}
                <div className="item-meta"><span className="num">{item.quantity}</span> × <span className="num">{formatIDR(item.price)}</span></div>
              </div>
              <div className="item-amount num">{formatIDR(item.amount)}</div>
            </div>
          ))}
          <div className="totals-right">
            <div className="totals-line">Subtotal: <span className="num">{formatIDR((doc as Invoice).subtotal)}</span></div>
            {(doc as Invoice).discount > 0 && <div className="totals-line">Discount: <span className="num">-{formatIDR((doc as Invoice).discount)}</span></div>}
            <div className="totals-line">Tax ({(doc as Invoice).taxRate}%): <span className="num">{formatIDR((doc as Invoice).taxAmount)}</span></div>
            <div className="totals-grand num">Total: {formatIDR((doc as Invoice).total)}</div>
          </div>
        </div>
      )}

      {/* Payment */}
      {!isReceipt && (doc as Invoice).bankName && (
        <div className="card card-pad-lg detail-card">
          <div className="section-title">Payment Method</div>
          <div className="item-name">{(doc as Invoice).bankName}</div>
          <div className="num">{(doc as Invoice).bankAccountNumber}</div>
          <div className="detail-contact">{(doc as Invoice).bankAccountHolder}</div>
        </div>
      )}

      {/* Notes */}
      {(isReceipt ? (doc as Receipt).notes : ((doc as Invoice).notes || (doc as Invoice).terms)) && (
        <div className="card card-pad-lg detail-card">
          {(doc as Invoice).notes && (
            <div>
              <div className="section-title">Notes</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{(doc as Invoice).notes}</div>
            </div>
          )}
          {!isReceipt && (doc as Invoice).terms && (
            <div className="mt-12">
              <div className="section-title">Terms</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{(doc as Invoice).terms}</div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="detail-actions">
        <button className="btn btn-primary btn-block btn-lg" onClick={handleDownloadPDF}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download PDF
        </button>
        <button className="btn btn-secondary btn-block" onClick={handleCopyText}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Copy as plain text
        </button>
        {!isReceipt && (doc as Invoice).status === 'draft' && (
          <button className="btn btn-primary btn-block" style={{ background: 'var(--color-accent)' }} onClick={handleMarkSent}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            Mark as Sent
          </button>
        )}
        {!isReceipt && (doc as Invoice).status !== 'paid' && (doc as Invoice).status !== 'cancelled' && (
          <button className="btn btn-primary btn-block" style={{ background: 'var(--color-success)' }} onClick={handleMarkPaid}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12"/></svg>
            Mark as Paid
          </button>
        )}
        {!isReceipt && (doc as Invoice).status === 'paid' && !linkedReceipt && (
            <button className="btn btn-secondary btn-block" onClick={handleCreateReceipt}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h4"/></svg>
              Create Receipt from this Invoice
            </button>
        )}
        {!isReceipt && linkedReceipt && (
          <button className="btn btn-secondary btn-block" onClick={() => nav(`/documents/receipt/${linkedReceipt.id}`)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h4"/></svg>
            View Receipt
          </button>
        )}
        <button className="btn btn-secondary btn-block" onClick={() => nav(`/documents/${type}/${id}/edit`)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button className="btn btn-secondary btn-block" onClick={handleNewDocument}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M12 5v14M5 12h14"/></svg>
          {isReceipt ? 'New Receipt' : 'New Invoice'}
        </button>
        <button className="btn btn-danger btn-block" onClick={handleDelete}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Delete
        </button>
      </div>
    </div>
  );
}
