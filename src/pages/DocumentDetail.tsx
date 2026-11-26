import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoice, getReceipt, getReceipts, deleteInvoice, deleteReceipt, saveInvoice, getBusiness, cancelInvoice, cancelReceipt } from '../lib/db';
import { useToast } from '../context/toastContext';
import { formatIDR, formatDateISO, copyInvoiceText, copyReceiptText } from '../lib/format';
import { Download, Copy, Send, Check, ReceiptText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Seo } from '../components/SEO';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingScreen } from '../components/LoadingScreen';
import type { Invoice, Receipt, BusinessProfile } from '../types';
import { effectiveInvoiceStatus, nowISO } from '../types';

export function DocumentDetail() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const nav = useNavigate();
  const { toast } = useToast();
  const isReceipt = type === 'receipt';

  const [doc, setDoc] = useState<Invoice | Receipt | undefined>();
  const [biz, setBiz] = useState<BusinessProfile | undefined>();
  const [linkedReceipt, setLinkedReceipt] = useState<Receipt | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    tone?: 'primary' | 'danger';
    run: () => void;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoaded(false);
    setLoadError(false);
    void (async () => {
      try {
        const bizData = await getBusiness();
        if (!active) return;
        setBiz(bizData);
        setLinkedReceipt(undefined);
        if (isReceipt) {
          const receipt = await getReceipt(id);
          if (active) setDoc(receipt);
        } else {
          const invoice = await getInvoice(id);
          if (!active) return;
          setDoc(invoice);
          const receipts = await getReceipts();
          if (active) {
            setLinkedReceipt(receipts.find(r => r.invoiceId === id && r.status !== 'cancelled'));
          }
        }
      } catch (err) {
        console.error(err);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => { active = false; };
  }, [id, isReceipt, reloadKey]);

  if (!loaded) return <LoadingScreen />;

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

  if (!doc) return (
    <div className="empty">
      <h3>Document not found</h3>
      <p>This document may have been deleted. Go back to the documents list.</p>
      <button type="button" className="btn btn-primary" onClick={() => nav('/documents')}>Back to Documents</button>
    </div>
  );

  const doDelete = async () => {
    setConfirmState(null);
    try {
      if (isReceipt) {
        const result = await deleteReceipt(doc.id);
        toast(result?.revertedInvoice ? `${doc.number} deleted. Linked invoice is now unpaid.` : `${doc.number} deleted`, 'success');
      } else {
        const linked = await deleteInvoice(doc.id);
        const plural = linked.length > 1 ? 's' : '';
        toast(
          linked.length
            ? `${doc.number} and ${linked.length} linked receipt${plural} deleted`
            : `${doc.number} deleted`,
          'success'
        );
      }
      nav('/documents');
    } catch (err) {
      console.error(err);
      toast('Failed to delete document.', 'danger');
    }
  };

  const askDelete = async () => {
    let message = 'This document will be permanently removed.';
    if (isReceipt) {
      message = (doc as Receipt).invoiceId
        ? 'If this was the only receipt for the linked invoice, that invoice will be marked as unpaid.'
        : 'This receipt will be permanently removed.';
    } else {
      const receipts = await getReceipts();
      const linkedCount = receipts.filter(r => r.invoiceId === doc.id).length;
      if (linkedCount > 0) {
        message = `${linkedCount} linked receipt${linkedCount > 1 ? 's' : ''} will be deleted too.`;
      }
    }
    setConfirmState({ title: `Delete ${doc.number}?`, message, confirmLabel: 'Delete', tone: 'danger', run: doDelete });
  };

  const doCancel = async () => {
    setConfirmState(null);
    try {
      if (isReceipt) {
        const result = await cancelReceipt(doc.id);
        if (result) setDoc(result.receipt);
        toast(result?.revertedInvoice ? 'Receipt cancelled. Linked invoice is now unpaid.' : 'Receipt cancelled.', 'success');
      } else {
        const updated = await cancelInvoice(doc.id);
        if (updated) setDoc(updated);
        toast('Invoice cancelled.', 'success');
      }
    } catch (err) {
      console.error(err);
      toast('Failed to cancel document.', 'danger');
    }
  };

  const askCancel = () => {
    setConfirmState({
      title: `Mark ${doc.number} as cancelled?`,
      message: isReceipt
        ? 'The receipt stays in your records as cancelled. If it was the last proof of payment, the linked invoice is marked as unpaid.'
        : linkedReceipt
          ? 'The invoice stays in your records as cancelled. Its linked receipt remains paid; cancel the receipt separately if the payment was reversed.'
          : 'The invoice stays in your records as cancelled and is excluded from outstanding totals.',
      confirmLabel: 'Mark as cancelled',
      run: doCancel,
    });
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
    if (!biz) {
      toast('Set up your business profile in Settings first.', 'danger');
      return;
    }
    try {
      const { generateInvoicePDF, generateReceiptPDF, downloadPDF } = await import('../lib/pdf');
      if (isReceipt) {
        downloadPDF(generateReceiptPDF(doc as Receipt, biz), `${doc.number}.pdf`);
      } else {
        downloadPDF(generateInvoicePDF(doc as Invoice, biz), `${doc.number}.pdf`);
      }
      toast('PDF downloaded.', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to download PDF.', 'danger');
    }
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

  const docType = isReceipt ? 'Receipt' : 'Invoice';
  const docTitle = doc ? `${doc.number} · ${docType}` : 'Document';
  const docDesc = doc ? `${docType} ${doc.number}` : 'Document details';
  const displayStatus = isReceipt ? doc.status : effectiveInvoiceStatus(doc as Invoice);

  return (
    <div>
      <Seo title={docTitle} description={docDesc} />
      <div className="page-head">
        <div>
          <h1 className="num">{doc.number}</h1>
          <p className="sub">
            {isReceipt ? 'Receipt' : 'Invoice'} · <span className="num">{formatDateISO(isReceipt ? (doc as Receipt).paymentDate : (doc as Invoice).issueDate)}</span>
          </p>
        </div>
        <span className={`badge badge-${displayStatus}`}>{displayStatus}</span>
      </div>

      {/* Summary */}
      <div className="card card-pad-lg detail-card">
        <div className="detail-summary">
          <div>
            <div className="detail-label">{isReceipt ? 'Paid by' : 'Bill To'}</div>
            <div className="detail-name">{doc.clientSnapshot?.name || '-'}</div>
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
          {(doc as Invoice).items.map((item) => (
            <div key={item.id} className="item-row">
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
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={handleDownloadPDF}>
          <Download size={16} aria-hidden="true" />
          Download PDF
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={handleCopyText}>
          <Copy size={16} aria-hidden="true" />
          Copy as plain text
        </button>
        {!isReceipt && (doc as Invoice).status === 'draft' && (
          <button type="button" className="btn btn-primary btn-block" style={{ background: 'var(--color-accent)' }} onClick={handleMarkSent}>
            <Send size={16} aria-hidden="true" />
            Mark as Sent
          </button>
        )}
        {!isReceipt && (doc as Invoice).status !== 'paid' && (doc as Invoice).status !== 'cancelled' && (
          <button type="button" className="btn btn-primary btn-block" style={{ background: 'var(--color-success)' }} onClick={handleMarkPaid}>
            <Check size={16} aria-hidden="true" />
            Mark as Paid
          </button>
        )}
        {!isReceipt && (doc as Invoice).status === 'paid' && !linkedReceipt && (
            <button type="button" className="btn btn-secondary btn-block" onClick={handleCreateReceipt}>
              <ReceiptText size={16} aria-hidden="true" />
              Create Receipt from this Invoice
            </button>
        )}
        {!isReceipt && linkedReceipt && (
          <button type="button" className="btn btn-secondary btn-block" onClick={() => nav(`/documents/receipt/${linkedReceipt.id}`)}>
            <ReceiptText size={16} aria-hidden="true" />
            View Receipt
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-block" onClick={() => nav(`/documents/${type}/${id}/edit`)}>
          <Pencil size={16} aria-hidden="true" />
          Edit
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={handleNewDocument}>
          <Plus size={16} aria-hidden="true" />
          {isReceipt ? 'New Receipt' : 'New Invoice'}
        </button>
        {doc.status !== 'cancelled' && (
          <button type="button" className="btn btn-secondary btn-block" onClick={askCancel}>
            <X size={16} aria-hidden="true" />
            {isReceipt ? 'Cancel Receipt' : 'Cancel Invoice'}
          </button>
        )}
        <button type="button" className="btn btn-danger btn-block" onClick={askDelete}>
          <Trash2 size={16} aria-hidden="true" />
          Delete
        </button>
      </div>

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ''}
        message={confirmState?.message ?? ''}
        confirmLabel={confirmState?.confirmLabel ?? 'Confirm'}
        tone={confirmState?.tone}
        onConfirm={() => confirmState?.run()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
