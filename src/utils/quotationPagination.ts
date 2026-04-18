import type { ProductItem } from '@/types/quotation';

/** Vertical space for content: A4 height minus top padding only (bottom is flush with page edge). */
export const A4_INNER_HEIGHT_MM = 277;

/**
 * Space below the top margin on **every** page when a full-page letterhead image is used,
 * so tables / extras don’t draw over the header artwork. Must match QuotationPreview spacer height.
 */
export const LETTERHEAD_TOP_RESERVE_MM = 36;

/** Slack on mm-based row budget (descriptions vary in height; Modern has taller padded cells). */
const ROW_PAGE_SAFETY = 0.82;

/** Hard caps — secondary to mm math; avoid runaway counts if estimates drift. */
const MAX_ROWS_FIRST_PAGE = 14;
const MAX_ROWS_CONTINUE_PAGE = 16;

/**
 * Single source of truth for table row height in mm (wrapping descriptions, cell padding).
 * Must match or exceed typical rendered row height or “one page” fits checks lie and clip with overflow:hidden.
 */
export function getEffectiveTableRowMm(templateId?: string): number {
  if (templateId === 'modern') return 16;
  if (templateId === 'classic') return 14;
  return 13;
}

function tableHeadMm(templateId?: string): number {
  if (templateId === 'modern') return 11;
  return 9;
}

export interface LayoutHeightsMm {
  topChrome: number;
  bottomChrome: number;
  client: number;
  tableHead: number;
  row: number;
  totals: number;
  extras: number;
}

export function getLayoutHeights(options: {
  showHeaderBanner: boolean;
  showFooterBanner: boolean;
  showDefaultHeader: boolean;
  usingLetterhead: boolean;
  hasFooterText: boolean;
  hasExtras: boolean;
  /** Align row/table chrome estimates with QuotationPreview template (padding, borders). */
  templateId?: string;
}): LayoutHeightsMm {
  let topChrome = 26;
  if (options.showHeaderBanner) {
    topChrome = 46;
  } else if (options.usingLetterhead) {
    /* Same reserve on every sheet: body starts below letterhead band (see QuotationPreview). */
    topChrome = LETTERHEAD_TOP_RESERVE_MM;
  } else if (options.showDefaultHeader) {
    topChrome = 30;
  }

  let bottomChrome = 6;
  if (options.showFooterBanner) bottomChrome += 26;
  if (options.hasFooterText) bottomChrome += 10;

  /** Bill To + client lines + quote badge column (first page only in layout). */
  const client = 48;
  const tableHead = tableHeadMm(options.templateId);
  const row = getEffectiveTableRowMm(options.templateId);
  const totals = 32;
  /** Reserve more for long terms/notes so we don’t underestimate epilogue height */
  const extras = options.hasExtras ? 80 : 0;

  return { topChrome, bottomChrome, client, tableHead, row, totals, extras };
}

function contentHeightMm(
  h: LayoutHeightsMm,
  numRows: number,
  opts: { includeClient: boolean; includeTotals: boolean; includeExtras: boolean }
): number {
  const { topChrome, bottomChrome, client, tableHead, row, totals, extras } = h;
  return (
    topChrome +
    bottomChrome +
    (opts.includeClient ? client : 0) +
    tableHead +
    numRows * row +
    (opts.includeTotals ? totals : 0) +
    (opts.includeExtras ? extras : 0)
  );
}

/**
 * True if the full quotation (table + totals + text blocks) fits on one A4 page.
 */
export function fitsEntireDocumentOnOnePage(products: ProductItem[], h: LayoutHeightsMm): boolean {
  const inner = A4_INNER_HEIGHT_MM;
  const n = products.length;
  if (n === 0) return true;
  const includeExtras = h.extras > 0;
  return contentHeightMm(h, n, { includeClient: true, includeTotals: true, includeExtras }) <= inner;
}

/**
 * Split line items into contiguous pages using **table height only** (no totals/extras in the row budget).
 * Guarantees every product appears exactly once, in order.
 */
export function paginateTableRowsOnly(products: ProductItem[], h: LayoutHeightsMm): ProductItem[][] {
  const inner = A4_INNER_HEIGHT_MM;
  const { topChrome, bottomChrome, client, tableHead } = h;
  const thead = tableHead;
  /** Same mm as `h.row` — must match fitsEntireDocumentOnOnePage / contentHeightMm. */
  const rmm = h.row;

  const rawFirst = (inner - topChrome - bottomChrome - client - thead) / rmm;
  const rawMid = (inner - topChrome - bottomChrome - thead) / rmm;
  let maxFirst = Math.max(1, Math.floor(rawFirst * ROW_PAGE_SAFETY));
  let maxMid = Math.max(1, Math.floor(rawMid * ROW_PAGE_SAFETY));
  maxFirst = Math.min(maxFirst, MAX_ROWS_FIRST_PAGE);
  maxMid = Math.min(maxMid, MAX_ROWS_CONTINUE_PAGE);

  const n = products.length;
  if (n === 0) {
    return [[]];
  }

  if (fitsEntireDocumentOnOnePage(products, h)) {
    return [products];
  }

  const pages: ProductItem[][] = [];
  let i = 0;
  let firstLen = Math.min(maxFirst, n);

  /* If the full doc doesn’t fit on one sheet but our cap would place every row on the first table page only,
   * the next page would be “summary only” and the table would clip in a fixed-height preview. Force a split. */
  if (firstLen === n && n > maxMid) {
    firstLen = Math.min(maxFirst, Math.max(1, Math.ceil(n / 2)));
  }

  pages.push(products.slice(i, i + firstLen));
  i += firstLen;

  while (i < n) {
    const nextLen = Math.min(maxMid, n - i);
    pages.push(products.slice(i, i + nextLen));
    i += nextLen;
  }

  return pages;
}
