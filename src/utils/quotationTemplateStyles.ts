import type { CSSProperties } from 'react';

export type QuotationTemplateId = 'professional' | 'modern' | 'classic';

/**
 * One alpha for all zebra rows so a background watermark composites the same on every stripe
 * (mixed 0.85 vs 0.95 made it look “stronger/weaker” on alternate lines and vs Terms/Notes pages).
 */
export const ZEBRA_ROW_ALPHA = 0.92;

export interface QuotationTemplateVisuals {
  fontFamily: string;
  bodyColor: string;
  /** Table th/td padding — keep in sync with getEffectiveTableRowMm in quotationPagination */
  tableCellPadding: string;
  quoteBadge: CSSProperties;
  headerTitle: CSSProperties;
  defaultHeaderRow: CSSProperties;
  clientBlock: CSSProperties;
  tableHeadRow: CSSProperties;
  tableHeadCellColor: string;
  tableBodyRow: (rowIndex: number) => CSSProperties;
  totalsTopBorder: CSSProperties;
}

function isTemplateId(id: string): id is QuotationTemplateId {
  return id === 'professional' || id === 'modern' || id === 'classic';
}

export function resolveQuotationTemplateId(id: string | undefined): QuotationTemplateId {
  return id && isTemplateId(id) ? id : 'professional';
}

/**
 * Visual treatment for each built-in template. Branding `themeColor` still drives accents.
 */
export function getQuotationTemplateVisuals(templateId: string | undefined, themeColor: string): QuotationTemplateVisuals {
  const t = resolveQuotationTemplateId(templateId);

  if (t === 'modern') {
    return {
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      bodyColor: '#18181b',
      tableCellPadding: '10px 14px',
      quoteBadge: {
        background: 'transparent',
        color: themeColor,
        padding: '8px 16px',
        border: `2px solid ${themeColor}`,
        borderRadius: 0,
        fontSize: '9pt',
        fontWeight: 600,
        display: 'inline-block',
      },
      headerTitle: { fontSize: '22pt', fontWeight: 700, color: themeColor, letterSpacing: '-0.5px', lineHeight: 1.1 },
      defaultHeaderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        borderBottom: `1px solid #e4e4e7`,
        paddingBottom: '16px',
        gap: '16px',
        flexShrink: 0,
      },
      clientBlock: {
        background: '#fafafa',
        border: '1px solid #e4e4e7',
        borderRadius: 0,
        padding: '12px 16px',
        marginBottom: '20px',
        flexShrink: 0,
      },
      tableHeadRow: { background: '#f4f4f5', color: '#18181b', borderBottom: `2px solid ${themeColor}` },
      tableHeadCellColor: '#18181b',
      tableBodyRow: i => ({
        borderBottom: '1px solid #e4e4e7',
        background:
          i % 2 === 0 ? `rgba(255,255,255,${ZEBRA_ROW_ALPHA})` : `rgba(250,250,250,${ZEBRA_ROW_ALPHA})`,
      }),
      totalsTopBorder: { borderTop: `2px solid ${themeColor}` },
    };
  }

  if (t === 'classic') {
    return {
      fontFamily: "Georgia, 'Times New Roman', serif",
      bodyColor: '#1a1a1a',
      tableCellPadding: '8px 12px',
      quoteBadge: {
        background: '#2c2c2c',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: 0,
        fontSize: '9pt',
        fontWeight: 600,
        display: 'inline-block',
        border: `1px solid #1a1a1a`,
      },
      headerTitle: { fontSize: '22pt', fontWeight: 700, color: '#1a1a1a', letterSpacing: '0.5px', lineHeight: 1.1 },
      defaultHeaderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        borderBottom: `3px double ${themeColor}`,
        paddingBottom: '16px',
        gap: '16px',
        flexShrink: 0,
      },
      clientBlock: {
        background: '#faf8f5',
        border: '1px solid #d4d0c8',
        borderRadius: 0,
        padding: '12px 16px',
        marginBottom: '20px',
        flexShrink: 0,
      },
      tableHeadRow: {
        background: '#faf8f5',
        color: '#1a1a1a',
        borderTop: `3px double ${themeColor}`,
        borderBottom: '1px solid #333',
      },
      tableHeadCellColor: '#1a1a1a',
      tableBodyRow: i => ({
        borderBottom: '1px solid #e0ddd6',
        background:
          i % 2 === 0 ? `rgba(255,255,255,${ZEBRA_ROW_ALPHA})` : `rgba(250,248,245,${ZEBRA_ROW_ALPHA})`,
      }),
      totalsTopBorder: { borderTop: `2px solid ${themeColor}` },
    };
  }

  /* professional — default */
  return {
    fontFamily: "'Segoe UI', Arial, sans-serif",
    bodyColor: '#1a1a2e',
    tableCellPadding: '8px 12px',
    quoteBadge: {
      background: themeColor,
      color: 'white',
      padding: '8px 16px',
      borderRadius: '4px',
      fontSize: '9pt',
      fontWeight: 600,
      display: 'inline-block',
    },
    headerTitle: { fontSize: '22pt', fontWeight: 700, color: themeColor, letterSpacing: '-0.5px', lineHeight: 1.1 },
    defaultHeaderRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      borderBottom: `3px solid ${themeColor}`,
      paddingBottom: '16px',
      gap: '16px',
      flexShrink: 0,
    },
    clientBlock: {
      background: '#f5f7fa',
      padding: '12px 16px',
      borderRadius: '4px',
      marginBottom: '20px',
      flexShrink: 0,
    },
    tableHeadRow: { background: themeColor, color: 'white' },
    tableHeadCellColor: '#ffffff',
    tableBodyRow: i => ({
      borderBottom: '1px solid #e8eaed',
      background:
        i % 2 === 0 ? `rgba(255,255,255,${ZEBRA_ROW_ALPHA})` : `rgba(250,251,252,${ZEBRA_ROW_ALPHA})`,
    }),
    totalsTopBorder: { borderTop: `2px solid ${themeColor}` },
  };
}
