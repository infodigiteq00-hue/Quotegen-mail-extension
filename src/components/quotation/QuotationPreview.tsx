import { forwardRef } from 'react';
import type { LineItemColumn, ProductItem, QuotationData } from '@/types/quotation';
import { calculateSubtotal, calculateTax, calculateGrandTotal, formatCurrency } from '@/utils/quotation';
import {
  fitsEntireDocumentOnOnePage,
  getLayoutHeights,
  LETTERHEAD_TOP_RESERVE_MM,
  paginateTableRowsOnly,
} from '@/utils/quotationPagination';
import {
  extrasHeadingBarText,
  extrasShouldShowHeadingBar,
  paginateExtrasBlocks,
  type ExtrasChunk,
} from '@/utils/extrasPagination';
import { getQuotationTemplateVisuals } from '@/utils/quotationTemplateStyles';

function previewCellStyle(col: LineItemColumn, cellPadding: string): React.CSSProperties {
  const base: React.CSSProperties = { padding: cellPadding };
  if (col.role === 'quantity' || col.role === 'unitPrice' || col.role === 'lineTotal') {
    return { ...base, textAlign: 'right' };
  }
  return base;
}

function renderLineCell(item: ProductItem, col: LineItemColumn): React.ReactNode {
  switch (col.role) {
    case 'name':
      return <span style={{ fontWeight: 500 }}>{item.name || '—'}</span>;
    case 'description':
      return <span style={{ color: '#666', fontSize: '9pt' }}>{item.description || '—'}</span>;
    case 'quantity':
      return item.quantity;
    case 'unitPrice':
      return formatCurrency(item.unitPrice);
    case 'lineTotal':
      return <span style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</span>;
    case 'custom':
      return <span style={{ color: '#444', fontSize: '9pt' }}>{item.customValues[col.id]?.trim() || '—'}</span>;
    default:
      return '—';
  }
}

interface QuotationPreviewProps {
  data: QuotationData;
  /** Built-in layout preset from the header template dropdown. */
  templateId?: string;
}

const bannerBleed: React.CSSProperties = {
  width: 'calc(100% + 40mm)',
  marginLeft: '-20mm',
  marginRight: '-20mm',
  display: 'block',
};

const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(({ data, templateId }, ref) => {
  const subtotal = calculateSubtotal(data.products);
  const tax = calculateTax(subtotal - data.discount, data.taxRate);
  const grandTotal = calculateGrandTotal(subtotal, data.discount, tax);
  const b = data.branding;
  const theme = b.themeColor || '#1565c0';
  const tv = getQuotationTemplateVisuals(templateId, theme);
  const usingLetterhead = !!(b.useLetterhead && b.letterheadDataUrl);
  const showHeaderBanner = !usingLetterhead && !!b.headerImageDataUrl;
  const showFooterBanner = !usingLetterhead && !!b.footerImageDataUrl;
  const showDefaultHeader = !usingLetterhead && !showHeaderBanner;

  const hasExtras = !!(data.deliveryInstructions || data.terms || data.notes);
  /** Delivery / terms / notes packed by estimated height; new page only when the current sheet is full. */
  const extrasPages = hasExtras ? paginateExtrasBlocks(data.deliveryInstructions, data.terms, data.notes) : [];

  const layoutHeights = getLayoutHeights({
    showHeaderBanner,
    showFooterBanner,
    showDefaultHeader,
    usingLetterhead,
    hasFooterText: !usingLetterhead && !!b.footerText,
    hasExtras,
    templateId,
  });

  const singlePageDoc = fitsEntireDocumentOnOnePage(data.products, layoutHeights);
  const tablePages = paginateTableRowsOnly(data.products, layoutHeights);

  /** Quote # + dates: shown once in the Bill To block on page 1 only (not repeated in headers). */
  const billToQuoteMeta = (
    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 'min(100%, 200px)' }}>
      <div style={tv.quoteBadge}>{data.quotationNumber || 'QT-XXXX-XXXX'}</div>
      <div style={{ fontSize: '8pt', color: '#666', marginTop: '6px', lineHeight: 1.45 }}>
        Date: {data.date}
        <br />
        Valid Until: {data.validUntil}
      </div>
    </div>
  );

  const defaultHeaderBlock = showDefaultHeader && (
    <div style={tv.defaultHeaderRow}>
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
          <div style={tv.headerTitle}>QUOTATION</div>
          {b.companyName && <div style={{ fontSize: '9pt', color: '#444', marginTop: '4px', fontWeight: 600 }}>{b.companyName}</div>}
          {b.addressLine && <div style={{ fontSize: '8pt', color: '#666' }}>{b.addressLine}</div>}
          {b.contactLine && <div style={{ fontSize: '8pt', color: '#666' }}>{b.contactLine}</div>}
        </div>
      </div>
    </div>
  );

  const headerBannerBlock = showHeaderBanner && (
    <div style={{ ...bannerBleed, marginTop: '-20mm', marginBottom: '16px', flexShrink: 0 }}>
      <img src={b.headerImageDataUrl} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  );

  const topChrome = (
    <>
      {headerBannerBlock}
      {defaultHeaderBlock}
    </>
  );

  const footerChrome = (
    <>
      {showFooterBanner && (
        <div
          style={{
            ...bannerBleed,
            marginTop: '12px',
            marginBottom: showFooterBanner && b.footerText ? '8px' : 0,
            flexShrink: 0,
          }}
        >
          <img src={b.footerImageDataUrl} alt="" style={{ width: '100%', height: 'auto', display: 'block', verticalAlign: 'bottom' }} />
        </div>
      )}
      {!usingLetterhead && b.footerText && (
        <div
          style={{
            marginTop: showFooterBanner ? 0 : '20px',
            paddingTop: showFooterBanner ? 0 : '20px',
            paddingBottom: 0,
            marginBottom: 0,
            borderTop: showFooterBanner ? 'none' : '1px solid #e8eaed',
            textAlign: 'center',
            fontSize: '7pt',
            color: '#999',
            flexShrink: 0,
          }}
        >
          {b.footerText}
        </div>
      )}
    </>
  );

  const clientBlock = (
    <div
      style={{
        ...tv.clientBlock,
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '20px',
        flexWrap: 'wrap',
        ...(usingLetterhead
          ? {
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              border: '1px solid rgba(15, 23, 42, 0.1)',
              boxShadow: '0 1px 6px rgba(0, 0, 0, 0.05)',
              padding: '14px 18px',
            }
          : {}),
      }}
    >
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <div style={{ fontSize: '7pt', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Bill To</div>
        <div style={{ fontWeight: 600 }}>{data.client.name || 'Client Name'}</div>
        {data.client.company && <div style={{ color: '#555' }}>{data.client.company}</div>}
        {data.client.address && <div style={{ color: '#555', fontSize: '9pt' }}>{data.client.address}</div>}
        {data.client.email && <div style={{ color: '#555', fontSize: '9pt' }}>{data.client.email}</div>}
        {data.client.phone && <div style={{ color: '#555', fontSize: '9pt' }}>{data.client.phone}</div>}
      </div>
      <div style={{ flex: '0 0 auto', maxWidth: '100%' }}>{billToQuoteMeta}</div>
    </div>
  );

  const letterheadBodySpacer =
    usingLetterhead ? (
      <div style={{ flexShrink: 0, height: `${LETTERHEAD_TOP_RESERVE_MM}mm`, width: '100%' }} aria-hidden />
    ) : null;

  const renderTable = (slice: ProductItem[], globalStartIndex: number) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', tableLayout: 'auto' }}>
      <thead>
        <tr style={tv.tableHeadRow}>
          <th
            style={{
              padding: tv.tableCellPadding,
              textAlign: 'left',
              fontSize: '8pt',
              fontWeight: 600,
              color: tv.tableHeadCellColor,
            }}
          >
            #
          </th>
          {data.lineItemColumns.map(col => (
            <th
              key={col.id}
              style={{
                padding: tv.tableCellPadding,
                textAlign: col.role === 'quantity' || col.role === 'unitPrice' || col.role === 'lineTotal' ? 'right' : 'left',
                fontSize: '8pt',
                fontWeight: 600,
                color: tv.tableHeadCellColor,
              }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {slice.map((item, i) => (
          <tr key={item.id} style={tv.tableBodyRow(globalStartIndex + i)}>
            <td style={{ padding: tv.tableCellPadding, color: '#999', fontSize: '9pt' }}>{globalStartIndex + i + 1}</td>
            {data.lineItemColumns.map(col => (
              <td key={col.id} style={previewCellStyle(col, tv.tableCellPadding)}>
                {renderLineCell(item, col)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const totalsBlock = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px', flexShrink: 0 }}>
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            marginTop: '4px',
            ...tv.totalsTopBorder,
            fontWeight: 700,
            fontSize: '12pt',
            color: theme,
          }}
        >
          <span>Total</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  );

  const renderExtrasChunks = (chunks: ExtrasChunk[]) => (
    <>
      {chunks.map((ch, i) => {
        const showBar = extrasShouldShowHeadingBar(ch, chunks.slice(0, i));
        return (
          <div key={`${ch.section}-${i}`} style={{ marginBottom: i < chunks.length - 1 ? '14px' : 0 }}>
            {showBar && (
              <div style={{ fontSize: '8pt', fontWeight: 600, color: theme, textTransform: 'uppercase', marginBottom: '4px' }}>
                {extrasHeadingBarText(ch)}
              </div>
            )}
            <div style={{ fontSize: '9pt', color: '#555', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{ch.text}</div>
          </div>
        );
      })}
    </>
  );

  const rowStarts: number[] = [];
  let acc = 0;
  for (const slice of tablePages) {
    rowStarts.push(acc);
    acc += slice.length;
  }

  const tablePageCount = singlePageDoc ? 1 : tablePages.length;
  const totalPages = tablePageCount + extrasPages.length;

  const pageShellBase = (pageIndex: number, pageCount: number): React.CSSProperties => ({
    width: '210mm',
    minHeight: '297mm',
    maxWidth: '100%',
    boxSizing: 'border-box',
    /* Top/side padding only — bottom is flush so footer sits on the page edge */
    paddingTop: '20mm',
    paddingLeft: '20mm',
    paddingRight: '20mm',
    paddingBottom: 0,
    fontFamily: tv.fontFamily,
    fontSize: '10pt',
    color: tv.bodyColor,
    lineHeight: 1.5,
    position: 'relative',
    backgroundColor: 'white',
    backgroundImage: usingLetterhead ? `url(${b.letterheadDataUrl})` : undefined,
    backgroundSize: '210mm 297mm',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'top left',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    pageBreakAfter: pageIndex < pageCount - 1 ? 'always' : 'auto',
    breakAfter: pageIndex < pageCount - 1 ? 'page' : 'auto',
    marginBottom: pageIndex < pageCount - 1 ? '10px' : 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  });

  /** At least A4; height grows with content so rows are never clipped (pagination stays conservative). */
  const previewPageShellStyle = (pageIndex: number, pageCount: number): React.CSSProperties => ({
    ...pageShellBase(pageIndex, pageCount),
    height: 'auto',
    minHeight: '297mm',
    overflow: 'visible',
  });

  const tablePageMiddle = (slice: ProductItem[], pageIndex: number, includeTotals: boolean) => {
    const startIdx = rowStarts[pageIndex] ?? 0;
    return (
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'visible' }}>
        {letterheadBodySpacer}
        {pageIndex === 0 && clientBlock}
        {renderTable(slice, startIdx)}
        {includeTotals && totalsBlock}
        <div style={{ flex: '1 1 auto', minHeight: '1mm' }} aria-hidden />
      </div>
    );
  };

  return (
    <div ref={ref} style={{ background: 'transparent' }}>
      {singlePageDoc && !hasExtras ? (
        <div key={0} className="quotation-a4-page" style={previewPageShellStyle(0, 1)}>
          <div style={{ flexShrink: 0 }}>{topChrome}</div>
          {tablePageMiddle(tablePages[0] ?? [], 0, true)}
          <div style={{ flexShrink: 0, flexGrow: 0, marginTop: 'auto', alignSelf: 'stretch' }}>{footerChrome}</div>
        </div>
      ) : (
        <>
          {(singlePageDoc ? [tablePages[0] ?? []] : tablePages).map((slice, pageIndex) => {
            const isLastTablePage = pageIndex === (singlePageDoc ? 0 : tablePages.length - 1);
            return (
              <div key={`t-${pageIndex}`} className="quotation-a4-page" style={previewPageShellStyle(pageIndex, totalPages)}>
                <div style={{ flexShrink: 0 }}>{topChrome}</div>
                {tablePageMiddle(slice, pageIndex, isLastTablePage)}
                <div style={{ flexShrink: 0, flexGrow: 0, marginTop: 'auto', alignSelf: 'stretch' }}>{footerChrome}</div>
              </div>
            );
          })}
          {hasExtras &&
            extrasPages.map((chunks, ei) => (
              <div key={`x-${ei}`} className="quotation-a4-page" style={previewPageShellStyle(tablePageCount + ei, totalPages)}>
                <div style={{ flexShrink: 0 }}>{topChrome}</div>
                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'visible' }}>
                  {letterheadBodySpacer}
                  {renderExtrasChunks(chunks)}
                  <div style={{ flex: '1 1 auto', minHeight: '1mm' }} aria-hidden />
                </div>
                <div style={{ flexShrink: 0, flexGrow: 0, marginTop: 'auto', alignSelf: 'stretch' }}>{footerChrome}</div>
              </div>
            ))}
        </>
      )}
    </div>
  );
});

QuotationPreview.displayName = 'QuotationPreview';
export default QuotationPreview;
