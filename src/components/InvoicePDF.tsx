import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { type Invoice, type Profile } from '@/lib/db';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf', fontWeight: 400, fontStyle: 'italic' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
  ]
});

// Since Roboto Mono might be hard to find a static TTF link for right now, let's fallback the mono class to Roboto 500
// But we can try to use a static URL if we have one. Let's just use Roboto for Mono space too to prevent errors.
Font.register({
  family: 'Roboto Mono',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 }, 
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
  ]
});

interface InvoicePDFProps {
  invoice: Invoice;
  profile: Profile;
}

export function InvoicePDF({ invoice, profile }: InvoicePDFProps) {
  const brandColor = profile.brandColor || '#10B981';

  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Roboto', fontSize: 10, color: '#1E293B' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
    brandInfo: { flex: 1, marginLeft: 10, fontSize: 10, color: '#1E293B' },
    brandName: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
    brandDetails: { fontSize: 9, color: '#64748B' },
    logoContainer: { maxWidth: 300 },
    logo: { height: 100, objectFit: 'contain' },
    titleBox: { alignItems: 'flex-end' },
    titleText: { fontSize: 24, fontWeight: 700, color: brandColor, letterSpacing: 2, marginBottom: 8 },
    invoiceNo: { fontSize: 12, fontWeight: 500, color: '#334155', marginBottom: 4 },
    dateRow: { flexDirection: 'row', justifyContent: 'space-between', width: 140, marginBottom: 2 },
    dateLabel: { color: '#64748B' },
    dateValue: { fontWeight: 500 },
    
    partiesRow: { flexDirection: 'row', gap: 20, marginBottom: 30 },
    partyCol: { flex: 1 },
    partyLabel: { color: '#64748B', fontSize: 9, marginBottom: 2, textTransform: 'uppercase' },
    partyName: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
    partyDetails: { color: '#475569', lineHeight: 1.4 },

    table: { marginBottom: 30 },
    tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 8, paddingHorizontal: 4, textTransform: 'uppercase', fontSize: 8, fontWeight: 500, color: '#64748B' },
    tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', borderBottomStyle: 'dashed' },
    colDesc: { flex: 4, paddingRight: 8 },
    colQty: { flex: 1, textAlign: 'center' },
    colPrice: { flex: 2, textAlign: 'right' },
    colTotal: { flex: 2, textAlign: 'right', fontFamily: 'Roboto Mono', fontWeight: 500 },
    itemBold: { fontWeight: 500, marginBottom: 2 },
    itemMono: { fontFamily: 'Roboto Mono' },

    totalsContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 40 },
    totalsBox: { width: 220 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    totalLabel: { color: '#64748B' },
    totalValue: { fontFamily: 'Roboto Mono', fontWeight: 500 },
    grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTopWidth: 2, borderTopColor: brandColor, alignItems: 'center' },
    grandTotalLabel: { fontSize: 12, fontWeight: 700, color: brandColor },
    grandTotalValue: { fontFamily: 'Roboto Mono', fontSize: 14, fontWeight: 700, color: brandColor },

    paymentBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 4, border: '1px solid #E5E7EB', marginBottom: 40 },
    paymentTitle: { fontSize: 9, textTransform: 'uppercase', color: '#64748B', marginBottom: 8, fontWeight: 500 },
    bankItem: { marginBottom: 6 },
    bankName: { fontWeight: 700, marginBottom: 2 },
    bankAccountPos: { flexDirection: 'row', gap: 6 },
    bankAccountNo: { fontFamily: 'Roboto Mono', fontWeight: 700 },

    footer: { position: 'absolute', bottom: 40, left: 40, right: 40 },
    notesTitle: { fontWeight: 500, marginBottom: 4, fontSize: 9 },
    notes: { fontStyle: 'italic', color: '#64748B', fontSize: 8, lineHeight: 1.4 },
    footerTextContainer: { borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 20, paddingTop: 12, alignItems: 'center' },
    footerTextPrimary: { fontWeight: 500, marginBottom: 2 },
    footerTextSecondary: { fontSize: 7, color: '#94A3B8' },
    footnote: { fontSize: 8, color: '#64748B', marginTop: 6, fontStyle: 'italic' }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.logoContainer}>
            {profile.logoUrl ? (
              <Image src={profile.logoUrl} style={styles.logo} />
            ) : (
              <View>
                <Text style={{ fontSize: 30, fontWeight: 700 }}>{profile.brandName || 'NAMA PERUSAHAAN'}</Text>
              </View>
            )}
          </View>
          <View style={styles.brandInfo}>
            <Text style={styles.brandName}>{profile.brandName || '-'}</Text>
            <Text style={styles.brandDetails}>{profile.address && profile.address}{profile.address && '\n'}{profile.contact && profile.contact}</Text>
          </View>
          <View style={styles.titleBox}>
            <Text style={styles.titleText}>INVOICE</Text>
            <Text style={styles.invoiceNo}>{invoice.invoiceNo}</Text>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Tanggal Invois</Text>
              <Text style={styles.dateValue}>{format(new Date(invoice.issueDate), 'dd MMM yyyy', { locale: localeID })}</Text>
            </View>

          </View>
        </View>

        {/* Parties */}
        <View style={styles.partiesRow}>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>DARI</Text>
            <Text style={styles.partyName}>{profile.brandName || '-'}</Text>
            <View>
                {profile.address && <Text style={styles.partyDetails}>{profile.address}</Text>}
                {profile.contact && <Text style={styles.partyDetails}>{profile.contact}</Text>}
              </View>
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>KEPADA</Text>
            <Text style={styles.partyName}>{invoice.clientName || 'Nama Klien'}</Text>
            <View>

              </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDesc}>DESKRIPSI BARANG/JASA</Text>
            <Text style={styles.colQty}>QTY</Text>
            <Text style={styles.colPrice}>HARGA SATUAN</Text>
            <Text style={styles.colTotal}>TOTAL</Text>
          </View>
          {invoice.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.itemBold}>{item.name || '-'}</Text>
              </View>
              <Text style={styles.colQty}>{item.qty}</Text>
              <Text style={[styles.colPrice, styles.itemMono]}>{formatCurrency(item.price).replace('Rp', '').trim()}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.qty * item.price).replace('Rp', '').trim()}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal).replace('Rp', '').trim()}</Text>
            </View>
            {invoice.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Diskon {invoice.discountType === 'percentage' ? `(${invoice.discount}%)` : ''}</Text>
                <Text style={styles.totalValue}>-{formatCurrency(
                  invoice.discountType === 'percentage' ? (invoice.subtotal * invoice.discount / 100) : invoice.discount
                ).replace('Rp', '').trim()}</Text>
              </View>
            )}
            {invoice.taxIncluded && invoice.taxRate > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>PPN ({invoice.taxRate}%)</Text>
                <Text style={styles.totalValue}>+{formatCurrency(
                  (invoice.subtotal - (invoice.discountType === 'percentage' ? (invoice.subtotal * invoice.discount / 100) : invoice.discount)) * (invoice.taxRate / 100)
                ).replace('Rp', '').trim()}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(invoice.grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        {profile.banks.length > 0 && (
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>METODE PEMBAYARAN</Text>
            {profile.banks.map((bank, i) => (
              <View key={i} style={styles.bankItem}>
                <Text style={styles.bankName}>{bank.bankName}</Text>
                <View style={styles.bankAccountPos}>
                  <Text style={styles.bankAccountNo}>{bank.accountNumber}</Text>
                  <Text>a.n {bank.accountName}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Footer info/notes */}
        <View style={styles.footer}>
          {invoice.notes && (
            <View>
              <Text style={styles.notesTitle}>Catatan:</Text>
              <Text style={styles.notes}>{invoice.notes}</Text>
            </View>
          )}
          {/* Footnote mandatory */}

          <View style={styles.footerTextContainer}>
            <Text style={styles.footerTextPrimary}>{profile.thankYouMessage || 'Terima kasih atas kepercayaan Anda.'}</Text>
            <Text style={styles.footerTextSecondary}>Dibuat menggunakan Invois - PWA</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
