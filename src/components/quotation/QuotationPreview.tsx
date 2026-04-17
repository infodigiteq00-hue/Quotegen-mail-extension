import { forwardRef } from 'react';
import type { QuotationData } from '@/types/quotation';
import { calculateSubtotal, calculateTax, calculateGrandTotal, formatCurrency } from '@/utils/quotation';

interface QuotationPreviewProps {
  data: QuotationData;
}

const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(({ data }, ref) => {
  const subtotal = calculateSubtotal(data.products);
  const tax = calculateTax(subtotal - data.discount, data.taxRate);
  const grandTotal = calculateGrandTotal(subtotal, data.discount, tax);
  const b = data.branding;
  const theme = b.themeColor || '#1565c0';
  const usingLetterhead = !!(b.useLetterhead && b.letterheadDataUrl);

  const pageStyle: React.CSSProperties = {
    width: '210mm',
    minHeight: '297mm',
    padding: '20mm',
    fontFamily: "'Segoe UI', Arial, sans-serif",
    fontSize: '10pt',
    color: '#1a1a2e',
    lineHeight: 1.5,
    position: 'relative',
    backgroundColor: 'white',
    backgroundImage: usingLetterhead ? `url(${b.letterheadDataUrl})` : undefined,
    backgroundSize: '210mm 297mm',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'top left',
  };

  return (
    <div ref={ref} className="shadow-lg" style={pageStyle}>
      {/* Header */}
      {!usingLetterhead && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: `3px solid ${theme}`, paddingBottom: '16px', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {b.logoDataUrl && (
              <div style={{ flexShrink: 0, width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={b.logoDataUrl}
                  alt="Logo"
                  style={{ maxHeight: '70px', maxWidth: '70px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '22pt', fontWeight: 700, color: theme, letterSpacing: '-0.5px', lineHeight: 1.1 }}>QUOTATION</div>
              {b.companyName && <div style={{ fontSize: '9pt', color: '#444', marginTop: '4px', fontWeight: 600 }}>{b.companyName}</div>}
              {b.addressLine && <div style={{ fontSize: '8pt', color: '#666' }}>{b.addressLine}</div>}
              {b.contactLine && <div style={{ fontSize: '8pt', color: '#666' }}>{b.contactLine}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ background: theme, color: 'white', padding: '8px 16px', borderRadius: '4px', fontSize: '9pt', fontWeight: 600, display: 'inline-block' }}>
              {data.quotationNumber || 'QT-XXXX-XXXX'}
            </div>
            <div style={{ fontSize: '8pt', color: '#666', marginTop: '6px' }}>
              Date: {data.date}<br />
              Valid Until: {data.validUntil}
            </div>
          </div>
        </div>
      )}

      {usingLetterhead && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '8mm', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
            {b.logoDataUrl ? (
              <div style={{ flexShrink: 0, width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={b.logoDataUrl}
                  alt="Logo"
                  style={{ maxHeight: '70px', maxWidth: '70px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{ fontSize: '20pt', fontWeight: 700, color: theme, letterSpacing: '-0.5px' }}>QUOTATION</div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ background: theme, color: 'white', padding: '6px 14px', borderRadius: '4px', fontSize: '9pt', fontWeight: 600, display: 'inline-block' }}>
              {data.quotationNumber || 'QT-XXXX-XXXX'}
            </div>
            <div style={{ fontSize: '8pt', color: '#666', marginTop: '6px' }}>
              Date: {data.date}<br />
              Valid Until: {data.validUntil}
            </div>
          </div>
        </div>
      )}

      {/* Client Info */}
      <div style={{ background: '#f5f7fa', padding: '12px 16px', borderRadius: '4px', marginBottom: '20px' }}>
        <div style={{ fontSize: '7pt', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Bill To</div>
        <div style={{ fontWeight: 600 }}>{data.client.name || 'Client Name'}</div>
        {data.client.company && <div style={{ color: '#555' }}>{data.client.company}</div>}
        {data.client.address && <div style={{ color: '#555', fontSize: '9pt' }}>{data.client.address}</div>}
        {data.client.email && <div style={{ color: '#555', fontSize: '9pt' }}>{data.client.email}</div>}
        {data.client.phone && <div style={{ color: '#555', fontSize: '9pt' }}>{data.client.phone}</div>}
      </div>

      {/* Products Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: theme, color: 'white' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '8pt', fontWeight: 600 }}>#</th>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '8pt', fontWeight: 600 }}>Item</th>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '8pt', fontWeight: 600 }}>Description</th>
            <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '8pt', fontWeight: 600 }}>Qty</th>
            <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '8pt', fontWeight: 600 }}>Unit Price</th>
            <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '8pt', fontWeight: 600 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.products.map((item, i) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e8eaed', background: i % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(250,251,252,0.85)' }}>
              <td style={{ padding: '8px 12px', color: '#999', fontSize: '9pt' }}>{i + 1}</td>
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>{item.name || '—'}</td>
              <td style={{ padding: '8px 12px', color: '#666', fontSize: '9pt' }}>{item.description || '—'}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <div style={{ width: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '9pt' }}>
            <span style={{ color: '#666' }}>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {data.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '9pt', color: '#e53935' }}>
              <span>Discount</span>
              <span>-{formatCurrency(data.discount)}</span>
            </div>
          )}
          {data.taxRate > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '9pt' }}>
              <span style={{ color: '#666' }}>Tax ({data.taxRate}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '4px', borderTop: `2px solid ${theme}`, fontWeight: 700, fontSize: '12pt', color: theme }}>
            <span>Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer sections */}
      {data.deliveryInstructions && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '8pt', fontWeight: 600, color: theme, textTransform: 'uppercase', marginBottom: '4px' }}>Delivery Instructions</div>
          <div style={{ fontSize: '9pt', color: '#555', whiteSpace: 'pre-wrap' }}>{data.deliveryInstructions}</div>
        </div>
      )}
      {data.terms && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '8pt', fontWeight: 600, color: theme, textTransform: 'uppercase', marginBottom: '4px' }}>Terms & Conditions</div>
          <div style={{ fontSize: '9pt', color: '#555', whiteSpace: 'pre-wrap' }}>{data.terms}</div>
        </div>
      )}
      {data.notes && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '8pt', fontWeight: 600, color: theme, textTransform: 'uppercase', marginBottom: '4px' }}>Notes</div>
          <div style={{ fontSize: '9pt', color: '#555', whiteSpace: 'pre-wrap' }}>{data.notes}</div>
        </div>
      )}

      {/* Bottom footer */}
      {!usingLetterhead && b.footerText && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e8eaed', textAlign: 'center', fontSize: '7pt', color: '#999' }}>
          {b.footerText}
        </div>
      )}
    </div>
  );
});

QuotationPreview.displayName = 'QuotationPreview';
export default QuotationPreview;
