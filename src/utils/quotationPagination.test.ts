import { describe, expect, it } from 'vitest';
import {
  getLayoutHeights,
  paginateTableRowsOnly,
  fitsEntireDocumentOnOnePage,
  A4_INNER_HEIGHT_MM,
  getEffectiveTableRowMm,
} from '@/utils/quotationPagination';
import type { ProductItem } from '@/types/quotation';

function makeProducts(n: number): ProductItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `id-${i}`,
    name: `Item ${i}`,
    description: '',
    quantity: 1,
    unitPrice: 1,
    total: 1,
    customValues: {},
  }));
}

describe('paginateTableRowsOnly', () => {
  it('returns one page when the full document fits', () => {
    const h = getLayoutHeights({
      showHeaderBanner: false,
      showFooterBanner: false,
      showDefaultHeader: true,
      usingLetterhead: false,
      hasFooterText: true,
      hasExtras: true,
    });
    const few = makeProducts(3);
    expect(fitsEntireDocumentOnOnePage(few, h)).toBe(true);
    const pages = paginateTableRowsOnly(few, h);
    expect(pages.length).toBe(1);
    expect(pages[0]).toHaveLength(3);
  });

  it('partitions all rows contiguously with no gaps', () => {
    const h = getLayoutHeights({
      showHeaderBanner: true,
      showFooterBanner: true,
      showDefaultHeader: false,
      usingLetterhead: false,
      hasFooterText: true,
      hasExtras: true,
    });
    const many = makeProducts(15);
    expect(fitsEntireDocumentOnOnePage(many, h)).toBe(false);
    const pages = paginateTableRowsOnly(many, h);
    const joined = pages.flat();
    expect(joined).toHaveLength(15);
    expect(joined.map(p => p.name)).toEqual(many.map(p => p.name));
    /* Must not leave a “table + summary” split where every line item sat on page 1 only (that clipped rows). */
    expect(pages.length).toBeGreaterThan(1);
  });

  it('uses fixed inner height constant', () => {
    expect(A4_INNER_HEIGHT_MM).toBe(277);
  });

  it('uses taller row budget for Modern Minimal so “one page” fit is not underestimated', () => {
    expect(getEffectiveTableRowMm('modern')).toBeGreaterThan(getEffectiveTableRowMm('professional'));
    const hModern = getLayoutHeights({
      showHeaderBanner: false,
      showFooterBanner: false,
      showDefaultHeader: true,
      usingLetterhead: false,
      hasFooterText: false,
      hasExtras: false,
      templateId: 'modern',
    });
    const hDefault = getLayoutHeights({
      showHeaderBanner: false,
      showFooterBanner: false,
      showDefaultHeader: true,
      usingLetterhead: false,
      hasFooterText: false,
      hasExtras: false,
    });
    const medium = makeProducts(14);
    expect(fitsEntireDocumentOnOnePage(medium, hModern)).toBe(false);
    expect(fitsEntireDocumentOnOnePage(medium, hDefault)).toBe(false);
  });
});
