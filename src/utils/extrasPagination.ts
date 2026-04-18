/** ~72 chars per line at ~170mm printable width, 9pt */
const CHARS_PER_LINE = 72;
const LINE_HEIGHT_MM = 4.15;
/** Space for section heading line */
const SECTION_HEADING_MM = 8.5;

export type ExtrasSectionKey = 'delivery' | 'terms' | 'notes';

export type ExtrasChunk = {
  section: ExtrasSectionKey;
  /** First chunk of this section on this page run */
  showSectionHeading: boolean;
  /** " (continued)" when not the first chunk of the section body */
  isContinuedBody: boolean;
  text: string;
};

/**
 * Printable body height for extras (below page chrome). Slightly generous so we don’t
 * orphan a few lines on the next sheet when there is still room.
 */
const DEFAULT_TEXT_BUDGET_MM = 200;

function estimateParagraphHeightMm(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const lines = Math.max(1, Math.ceil(t.length / CHARS_PER_LINE));
  return lines * LINE_HEIGHT_MM;
}

/** Height for one chunk given what already sits on this page (headings for new section / continued). */
function chunkNeedForPagePosition(ch: ExtrasChunk, precedingOnPage: ExtrasChunk[]): number {
  const startOfPage = precedingOnPage.length === 0;
  let h = estimateParagraphHeightMm(ch.text);
  if (ch.showSectionHeading) {
    h += SECTION_HEADING_MM;
  } else if (startOfPage && ch.isContinuedBody) {
    h += SECTION_HEADING_MM;
  } else if (!startOfPage && precedingOnPage.length > 0) {
    const prev = precedingOnPage[precedingOnPage.length - 1]!;
    if (prev.section !== ch.section && ch.isContinuedBody) {
      h += SECTION_HEADING_MM;
    }
  }
  return h;
}

function estimatePageChunksHeightMm(chunks: ExtrasChunk[]): number {
  let sum = 0;
  const preceding: ExtrasChunk[] = [];
  for (const ch of chunks) {
    sum += chunkNeedForPagePosition(ch, preceding);
    preceding.push(ch);
  }
  return sum;
}

/** If two consecutive pages are short enough to fit one budget together, merge (fixes stray 3–4 line pages). */
function mergeWhenCombinedFitsOnePage(pages: ExtrasChunk[][], budgetMm: number): ExtrasChunk[][] {
  if (pages.length < 2) return pages;
  const out = pages.map(p => [...p]);
  for (let i = 0; i < out.length - 1; ) {
    const cur = out[i]!;
    const nxt = out[i + 1]!;
    const combined = [...cur, ...nxt];
    if (estimatePageChunksHeightMm(combined) <= budgetMm) {
      out[i] = combined;
      out.splice(i + 1, 1);
      continue;
    }
    i++;
  }
  return out.filter(p => p.length > 0);
}

/** Split long text into chunks so we can pack flexibly across pages. */
function splitBodyIntoSmallChunks(body: string, maxChars: number): string[] {
  const t = body.trim();
  if (!t) return [];
  const out: string[] = [];
  let i = 0;
  while (i < t.length) {
    if (i + maxChars >= t.length) {
      out.push(t.slice(i).trim());
      break;
    }
    const slice = t.slice(i, i + maxChars);
    let cut = slice.lastIndexOf('\n\n');
    if (cut < maxChars * 0.2) cut = slice.lastIndexOf('\n');
    if (cut < 24) cut = slice.lastIndexOf(' ');
    if (cut < 24) cut = maxChars;
    const end = i + cut;
    out.push(t.slice(i, end).trim());
    i = end;
    while (i < t.length && /\s/.test(t[i]!)) i++;
  }
  return out.filter(Boolean);
}

function buildAllChunks(
  delivery: string | undefined,
  terms: string | undefined,
  notes: string | undefined
): ExtrasChunk[] {
  const specs: { section: ExtrasSectionKey; title: string; body: string }[] = [];
  if (delivery?.trim()) specs.push({ section: 'delivery', title: 'Delivery Instructions', body: delivery });
  if (terms?.trim()) specs.push({ section: 'terms', title: 'Terms & Conditions', body: terms });
  if (notes?.trim()) specs.push({ section: 'notes', title: 'Notes', body: notes });

  const chunks: ExtrasChunk[] = [];
  const MAX_CHUNK = 420;

  for (const spec of specs) {
    const parts = splitBodyIntoSmallChunks(spec.body, MAX_CHUNK);
    parts.forEach((text, idx) => {
      chunks.push({
        section: spec.section,
        showSectionHeading: idx === 0,
        isContinuedBody: idx > 0,
        text,
      });
    });
  }
  return chunks;
}

export const EXTRAS_SECTION_LABEL: Record<ExtrasSectionKey, string> = {
  delivery: 'Delivery Instructions',
  terms: 'Terms & Conditions',
  notes: 'Notes',
};

/** Section title / “(continued)” — must stay in sync with chunkNeedForPagePosition. */
export function extrasShouldShowHeadingBar(ch: ExtrasChunk, precedingOnPage: ExtrasChunk[]): boolean {
  const startOfPage = precedingOnPage.length === 0;
  if (ch.showSectionHeading) return true;
  if (startOfPage && ch.isContinuedBody) return true;
  if (!startOfPage && precedingOnPage.length > 0) {
    const prev = precedingOnPage[precedingOnPage.length - 1]!;
    if (prev.section !== ch.section && ch.isContinuedBody && !ch.showSectionHeading) return true;
  }
  return false;
}

export function extrasHeadingBarText(ch: ExtrasChunk): string {
  const base = EXTRAS_SECTION_LABEL[ch.section];
  if (ch.showSectionHeading) return base;
  return `${base} (continued)`;
}

/**
 * Pack chunks into pages: fill each page up to `textBudgetMm`, then merge tail pages if they fit together.
 */
export function packExtrasChunksIntoPages(chunks: ExtrasChunk[], textBudgetMm = DEFAULT_TEXT_BUDGET_MM): ExtrasChunk[][] {
  if (chunks.length === 0) return [];

  const pages: ExtrasChunk[][] = [];
  let cur: ExtrasChunk[] = [];
  let usedMm = 0;

  for (const ch of chunks) {
    const need = chunkNeedForPagePosition(ch, cur);

    if (usedMm + need > textBudgetMm && cur.length > 0) {
      pages.push(cur);
      cur = [];
      usedMm = 0;
    }

    cur.push(ch);
    usedMm += chunkNeedForPagePosition(ch, cur.slice(0, -1));
  }
  if (cur.length) pages.push(cur);

  return mergeWhenCombinedFitsOnePage(pages, textBudgetMm);
}

export function paginateExtrasBlocks(
  delivery: string | undefined,
  terms: string | undefined,
  notes: string | undefined
): ExtrasChunk[][] {
  const chunks = buildAllChunks(delivery, terms, notes);
  return packExtrasChunksIntoPages(chunks);
}

export function extrasTotalCharCount(delivery: string | undefined, terms: string | undefined, notes: string | undefined): number {
  return (delivery?.length ?? 0) + (terms?.length ?? 0) + (notes?.length ?? 0);
}
