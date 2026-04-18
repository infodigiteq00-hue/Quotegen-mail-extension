import type { CompanyBranding, LineItemColumn, ProductItem, QuotationData } from '@/types/quotation';

/** Default branding fields (used for new quotations and migrating saved data). */
export const DEFAULT_COMPANY_BRANDING: CompanyBranding = {
  companyName: 'Your Company Name',
  addressLine: '123 Business Avenue, Suite 100',
  contactLine: 'info@yourcompany.com | (555) 123-4567',
  footerText: '',
  themeColor: '#1565c0',
  logoDataUrl: '/quotegen-logo.svg',
  headerImageDataUrl: '',
  footerImageDataUrl: '',
  letterheadDataUrl: '',
  useLetterhead: false,
};

export function generateQuotationNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `QT-${y}${m}-${seq}`;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Stable ids for built-in columns (labels are user-editable). */
export const DEFAULT_LINE_ITEM_COLUMNS: LineItemColumn[] = [
  { id: 'col-name', role: 'name', label: 'Item' },
  { id: 'col-description', role: 'description', label: 'Description' },
  { id: 'col-quantity', role: 'quantity', label: 'Qty' },
  { id: 'col-unitPrice', role: 'unitPrice', label: 'Unit Price' },
  { id: 'col-lineTotal', role: 'lineTotal', label: 'Total' },
];

function mergeLineItemColumns(saved: LineItemColumn[] | undefined): LineItemColumn[] {
  if (!saved?.length) {
    return DEFAULT_LINE_ITEM_COLUMNS.map(c => ({ ...c }));
  }
  const byRole = new Map(saved.filter(c => c.role !== 'custom').map(c => [c.role, c]));
  const builtins = DEFAULT_LINE_ITEM_COLUMNS.map(def => {
    const s = byRole.get(def.role);
    return s ? { ...def, label: s.label || def.label } : { ...def };
  });
  const customs = saved
    .filter(c => c.role === 'custom')
    .map(c => ({
      id: c.id || crypto.randomUUID(),
      role: 'custom' as const,
      label: c.label || 'Column',
    }));
  return [...builtins, ...customs];
}

/** Ensures new fields exist for data loaded from storage or older versions. */
export function normalizeQuotationData(data: QuotationData): QuotationData {
  return {
    ...data,
    lineItemColumns: mergeLineItemColumns(data.lineItemColumns),
    products: data.products.map(p => ({
      ...p,
      customValues: p.customValues ?? {},
    })),
    branding: { ...DEFAULT_COMPANY_BRANDING, ...data.branding },
  };
}

export function createEmptyProduct(): ProductItem {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    total: 0,
    customValues: {},
  };
}

export function calculateProductTotal(item: ProductItem): number {
  return item.quantity * item.unitPrice;
}

export function calculateSubtotal(products: ProductItem[]): number {
  return products.reduce((sum, p) => sum + p.total, 0);
}

export function calculateTax(subtotal: number, taxRate: number): number {
  return subtotal * (taxRate / 100);
}

export function calculateGrandTotal(subtotal: number, discount: number, tax: number): number {
  return subtotal - discount + tax;
}

export function getDefaultQuotation(): QuotationData {
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 30);

  return {
    quotationNumber: generateQuotationNumber(),
    date: formatDate(now),
    validUntil: formatDate(validUntil),
    client: { name: '', company: '', address: '', email: '', phone: '' },
    lineItemColumns: DEFAULT_LINE_ITEM_COLUMNS.map(c => ({ ...c })),
    products: [createEmptyProduct()],
    deliveryInstructions: '',
    terms: 'Payment due within 30 days of invoice date. All prices are in USD.',
    notes: '',
    discount: 0,
    taxRate: 0,
    branding: { ...DEFAULT_COMPANY_BRANDING },
  };
}

export interface ParsedLine {
  name: string;
  quantity: number | null;
  unitPrice: number | null;
  description: string;
  raw: string;
  confident: boolean;
}

export interface ParseResult {
  parsed: ParsedLine[];
  unparsed: string[];
  deliveryInstructions: string;
  notes: string;
  clientName: string;
  clientCompany: string;
}

// ─── Noise / meta detection ─────────────────────────────────────
const GREETING_RE = /^(hi|hello|hey|dear|good\s+(morning|afternoon|evening))\b/i;
const SIGN_OFF_RE = /^(regards|best|cheers|thanks|thank\s*you|sincerely|warm\s+regards|kind\s+regards|yours?\s+(truly|faithfully))\b/i;
const EMAIL_HEADER_RE = /^(from|to|cc|bcc|subject|date|sent|received):/i;
const PURE_INSTRUCTION_RE = /^(please\s+(note|ensure|mention|include|review|check|confirm)|kindly|note[:\s]|let\s+me\s+know|looking\s+forward|if\s+any\s+clarification|do\s+let|we\s+(need|require|want|would\s+like)\s+(a\s+)?quotation|do\s+not\s+repeat|please\s+read)/i;
const INSTRUCTION_KEYWORD_RE = /^(also\s+include|please\s+(note|ensure|mention|include|review|check|confirm)|kindly|note[:\s]|let\s+me\s+know|looking\s+forward|if\s+any\s+clarification|do\s+let|we\s+(need|require|want|would\s+like)\s+(a\s+)?quotation|do\s+not\s+repeat|please\s+read)/i;
// Prefixes on lines that ARE products but have instructional lead-ins
const PRODUCT_PREFIX_RE = /^(also\s+(?:add|looking\s+for|need|require|want|include)[:\s]*|we\s+(?:also\s+)?(?:need|require|want)[:\s]*|additionally[:\s]*|in\s+addition[:\s]*|please\s+(?:also\s+)?(?:add|quote|include)[:\s]*)/i;
const DELIVERY_RE = /\b(deliver|delivery|shipping|ship|dispatch|timeline|lead\s+time|turnaround|weeks?|days?)\b/i;
const INSTALLATION_RE = /\b(install|installation|erection|commissioning|setup|site\s+work)\b/i;
const TAX_FREIGHT_RE = /\b(tax|taxes|freight|transport|logistics|gst|vat|duty|duties|octroi)\b/i;
const WARRANTY_RE = /\b(warranty|guarantee|warrantee|amc|maintenance\s+contract)\b/i;

// ─── Product attribute patterns ─────────────────────────────────
const QTY_RE = /(?:qty|quantity|nos?|units?|pcs|pieces?|count|numbers?)[:\-=\s]*(\d+)/i;
const QTY_REVERSE_RE = /(\d+)\s*(?:qty|quantity)\b/i;
const QTY_WORD_MAP: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const QTY_WORD_RE = /(?:qty|quantity)[:\-=\s]*(one|two|three|four|five|six|seven|eight|nine|ten)\b/i;
const QTY_INLINE_RE = /(\d+)\s*(?:nos?|units?|pcs|pieces?|numbers?)\b/i;
const QTY_X_RE = /[x×]\s*(\d+)/i;
// Range qty: "3 or maybe 4" / "3 or 4" → pick first number
const QTY_RANGE_RE = /(\d+)\s*(?:or\s+(?:maybe\s+)?(\d+))\s*(?:nos?|units?|pcs|pieces?|numbers?)?\b/i;

const PRICE_PATTERNS = [
  /(?:budget)[:\-=\s]*(?:USD|\$|€|£|₹|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:-|–|to)\s*(?:USD|\$|€|£|₹|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:USD|dollars?)?/i,
  /(?:price|cost|rate|amount|value|approx\.?\s*price|expected\s*cost|estimated?\s*(?:cost|price|value))[:\-=\s]*(?:around|approx\.?|approximately|about|roughly|~)?\s*(?:USD|\$|€|£|₹|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:USD|dollars?)?/i,
  /(?:around|approx\.?|approximately|about|roughly|~)\s*(?:USD|\$|€|£|₹|Rs\.?)?\s*([\d,]{3,}(?:\.\d{1,2})?)\s*(?:USD|dollars?)?\s*(?:each|per\s+(?:unit|piece|item))?/i,
  /(?:USD|\$|€|£|₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:USD|dollars?)\s*(?:per\s+(?:unit|piece|item|each))?/i,
  /(?:budget)[:\-=\s]*(?:around|approx\.?|approximately|about|roughly|~)?\s*(?:USD|\$|€|£|₹|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:USD|dollars?)?/i,
];

const ATTR_PREFIXES = /^(moc|material|size|spec|specification|design\s*code|capacity|type|model|grade|finish|standard|code|rating|pressure|temperature|diameter|dia|length|width|height|weight|thickness|volume|flow|power|voltage)[:\-=\s]/i;

// Header-only labels (no values, just column headers)
const STANDALONE_LABEL_RE = /^\s*(?:qty|quantity|price|cost|rate|amount|total|subtotal|unit\s*price|s\.?\s*no\.?|sr\.?\s*no\.?|sl\.?\s*no\.?|item|description|particular|remarks?|name|product\s*name)\s*$/i;

// Words that are part of qty/price expressions and NOT meaningful product name words
const QTY_PRICE_FILLER_WORDS = /\b(qty|quantity|nos?|units?|pcs|pieces?|count|numbers?|price|cost(?:ing)?|rate|budget|amount|value|approx|approximate|approximately|around|about|expected|estimated|estimate|need|require|required|want|include|including|add|also|please|per|each|unit|piece|item|total|subtotal|two|three|four|five|six|seven|eight|nine|ten|one|usd|dollars?|eur|gbp|inr|rs|rupees?)\b/gi;
const CURRENCY_SYMBOLS = /[USD$€£₹]/g;

function isNoiseLine(line: string): boolean {
  if (GREETING_RE.test(line)) return true;
  if (SIGN_OFF_RE.test(line)) return true;
  if (EMAIL_HEADER_RE.test(line)) return true;
  if (line.length < 3) return true;
  return false;
}

/**
 * Check if a line is purely a qty/price expression (possibly with trailing filler words),
 * NOT a product name. Works by stripping all qty/price-related words, numbers, symbols
 * and checking if anything meaningful remains.
 */
function isQtyOrPriceLine(line: string): boolean {
  // First check simple label-only lines
  if (STANDALONE_LABEL_RE.test(line)) return true;

  // Strip everything qty/price-related from the line
  let stripped = line
    // Remove currency symbols and amounts
    .replace(CURRENCY_SYMBOLS, ' ')
    // Remove numbers (with optional commas/decimals)
    .replace(/[\d,]+(?:\.\d+)?/g, ' ')
    // Remove qty/price filler words
    .replace(QTY_PRICE_FILLER_WORDS, ' ')
    // Remove common punctuation used in these expressions
    .replace(/[:\-=\s.,;()\[\]~*]+/g, ' ')
    .trim();

  // If nothing meaningful remains (less than 3 chars of actual letters), it's a qty/price line
  if (stripped.length < 3 || !/[a-zA-Z]{3,}/.test(stripped)) return true;

  return false;
}

function isProductTitle(line: string): boolean {
  // Reject lines that are purely qty/price expressions
  if (isQtyOrPriceLine(line)) return false;
  if (ATTR_PREFIXES.test(line)) return false;
  // Pure instructions with no product content
  if (PURE_INSTRUCTION_RE.test(line) && !extractQty(line) && !extractPrice(line)) return false;
  if (DELIVERY_RE.test(line) && !extractQty(line) && !extractPrice(line)) return false;
  if (TAX_FREIGHT_RE.test(line) && !extractQty(line) && !extractPrice(line)) return false;
  if (INSTALLATION_RE.test(line) && !extractQty(line) && !extractPrice(line)) return false;
  if (WARRANTY_RE.test(line)) return false;
  if (isNoiseLine(line)) return false;

  // Lines starting with instruction prefixes that ALSO contain a product — treat as product
  const stripped = line.replace(PRODUCT_PREFIX_RE, '').trim();
  if (PRODUCT_PREFIX_RE.test(line) && stripped.length > 2) {
    if (extractQty(line) || extractPrice(line)) return true;
  }

  // Must look like a product name: contains at least one letter
  if (!/[a-zA-Z]/.test(line)) return false;

  // Heuristic: lines that are just a person's name (2-3 capitalized words, no numbers)
  const words = line.split(/\s+/);
  if (words.length <= 3 && words.every(w => /^[A-Z][a-z]+\.?$/.test(w)) && !/\d/.test(line)) {
    return false;
  }
  if (/\b(manager|director|engineer|executive|officer|ltd|llc|inc|corp|pvt|limited|co\.\s)\b/i.test(line) && !extractQty(line) && !extractPrice(line)) {
    return false;
  }

  return true;
}

function extractQty(text: string): number | null {
  let m = text.match(QTY_RE);
  if (m) return parseInt(m[1]);

  // Reverse pattern: "2 qty" / "2 quantity"
  m = text.match(QTY_REVERSE_RE);
  if (m) return parseInt(m[1]);

  m = text.match(QTY_WORD_RE);
  if (m) return QTY_WORD_MAP[m[1].toLowerCase()] ?? null;

  m = text.match(QTY_INLINE_RE);
  if (m) return parseInt(m[1]);

  m = text.match(QTY_X_RE);
  if (m) return parseInt(m[1]);

  // Range qty: "3 or maybe 4" → pick first number
  m = text.match(QTY_RANGE_RE);
  if (m) return parseInt(m[1]);

  // Word-based qty without explicit "qty" prefix: "need three units"
  const wordMatch = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:nos?|units?|pcs|pieces?)\b/i);
  if (wordMatch) return QTY_WORD_MAP[wordMatch[1].toLowerCase()] ?? null;

  // Parenthetical qty like "Two (2)"
  m = text.match(/\((\d+)\)/);
  if (m && /qty|quantity|nos|units|pieces/i.test(text)) return parseInt(m[1]);

  // "Also add 1 Reactor Vessel" / "add 3 pumps" — small number after instruction prefix
  m = text.match(/(?:also\s+)?(?:add|need|require|want|include)\s+(\d{1,2})\s+[A-Z]/i);
  if (m) return parseInt(m[1]);

  return null;
}

function extractPrice(text: string): number | null {
  for (const pat of PRICE_PATTERNS) {
    const m = text.match(pat);
    if (m) {
      // For budget ranges, take the higher value
      if (m[2]) {
        const high = parseFloat(m[2].replace(/,/g, ''));
        if (!isNaN(high) && high > 0) return high;
      }
      const price = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(price) && price > 0) return price;
    }
  }
  return null;
}

interface RawBlock {
  titleLine: string;
  attrLines: string[];
}

/**
 * Groups email lines into product blocks. A block starts with a line that looks
 * like a product title and accumulates subsequent attribute lines (qty, price, MOC, size, etc.)
 * until the next product title or a different section.
 */
function groupIntoBlocks(lines: string[]): { blocks: RawBlock[]; meta: string[] } {
  const blocks: RawBlock[] = [];
  const meta: string[] = [];
  let current: RawBlock | null = null;
  let inMetaSection = false; // after "also include" or "note:" etc.

  for (const line of lines) {
    if (isNoiseLine(line)) continue;

    // Qty/price-only lines should be attached to the current product block, not skipped
    if (isQtyOrPriceLine(line)) {
      if (current) {
        current.attrLines.push(line);
      }
      // If no current block, just drop these orphan qty/price lines
      continue;
    }

    // Check if we've entered a meta/instruction section
    // But lines with PRODUCT_PREFIX_RE that also have qty/price are products, not meta
    if ((INSTRUCTION_KEYWORD_RE.test(line) || /^note[:\s]/i.test(line)) && !PRODUCT_PREFIX_RE.test(line)) {
      // Pure instruction — only mark as meta if it has no qty/price (not a hidden product)
      if (!extractQty(line) && !extractPrice(line)) {
        if (current) {
          blocks.push(current);
          current = null;
        }
        inMetaSection = true;
        meta.push(line);
        continue;
      }
    }

    if (inMetaSection) {
      // Stay in meta section until we see something that looks like a new product
      if (isProductTitle(line) && !DELIVERY_RE.test(line) && !TAX_FREIGHT_RE.test(line) && !INSTALLATION_RE.test(line) && !WARRANTY_RE.test(line)) {
        inMetaSection = false;
        // fall through to product handling below
      } else {
        meta.push(line);
        continue;
      }
    }

    // Is this line a product title?
    if (isProductTitle(line) && !ATTR_PREFIXES.test(line)) {
      if (current) blocks.push(current);
      current = { titleLine: line, attrLines: [] };
    } else if (current) {
      // Attribute line belonging to current product
      current.attrLines.push(line);
    } else {
      // Orphan line before any product
      meta.push(line);
    }
  }

  if (current) blocks.push(current);
  return { blocks, meta };
}

function blockToProduct(block: RawBlock): ParsedLine | null {
  const allText = [block.titleLine, ...block.attrLines].join('\n');

  // Extract qty and price from combined block text
  let qty: number | null = null;
  let price: number | null = null;
  const descParts: string[] = [];

  for (const line of [block.titleLine, ...block.attrLines]) {
    const q = extractQty(line);
    if (q !== null && qty === null) qty = q;

    const p = extractPrice(line);
    if (p !== null && price === null) price = p;

    if (ATTR_PREFIXES.test(line)) {
      descParts.push(line.trim());
    }
  }

  // Must have at least qty or price to be a valid product
  if (qty === null && price === null) return null;

  // ── Clean product name ──────────────────────────────────────────
  let name = block.titleLine;

  // 1. Remove instruction prefixes: "Also add", "Also looking for", "We need", etc.
  name = name.replace(PRODUCT_PREFIX_RE, '');
  // Remove leading qty number after prefix strip: "1 Reactor Vessel" → "Reactor Vessel"
  name = name.replace(/^\s*\d+\s+(?=[A-Z])/g, '');

  // 2. Remove "Product:" prefix
  name = name.replace(/^product[:\s]*/i, '');

  // 3. Remove pipe-separated segments (they contain qty/price/attrs)
  name = name.replace(/\|.*$/g, '');

  // 4. Remove trailing clauses after dash/comma that contain qty/price/filler phrases
  // e.g. "Heat Exchanger – need 3 units, expected around 50000 USD each"
  // Must match a keyword (not bare digit) to avoid stripping model numbers like "HX-02"
  name = name.replace(/[-–—,]\s*(?:need|expected|estimated|costing|around|approx|approximately|about|budget|price|pricing|cost|qty|quantity)\b.*$/gi, '');
  // Also catch "– 3 units" / ", 1 unit only" (digit followed by unit word)
  name = name.replace(/[-–—,]\s*\d+\s*(?:units?|nos?|pcs|pieces?)\b.*$/gi, '');

  // 5. Remove parenthetical noise containing conversational text
  // Keep parentheticals that look like model info (short, alphanumeric) e.g. "(Unit A)"
  name = name.replace(/\(([^)]*)\)/g, (_match, inner: string) => {
    const trimmed = inner.trim();
    // Keep if it's short model/type info (≤4 words, mostly alphanumeric)
    if (trimmed.split(/\s+/).length <= 4 && !/\b(last\s+time|you\s+can|quote|accordingly|depending|maybe|pieces|near|approx|around|expected|decided)\b/i.test(trimmed)) {
      // Also strip numbers that look like prices from the parenthetical
      const cleaned = trimmed.replace(/\b\d{4,}\b/g, '').trim();
      if (cleaned && !/^\d+$/.test(cleaned)) return `(${cleaned})`;
    }
    return '';
  });

  // 6. Remove inline qty expressions (including "2 qty", "qty 2", "qty two")
  name = name.replace(/\d+\s*(?:qty|quantity)\b/gi, '');
  name = name.replace(/[-–]?\s*(?:qty|quantity)[:\-=\s]*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/gi, '');
  name = name.replace(/[-–]?\s*(?:need\s+)?\d+\s*(?:units?|nos?|pcs|pieces?)(?:\s+only)?\b/gi, '');
  name = name.replace(/[-–]?\s*\d+\s+(?:units?\s+only|unit\s+only)\b/gi, '');
  name = name.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:nos?|units?|pcs|pieces?)\b/gi, '');

  // 7. Remove inline price expressions  
  name = name.replace(/[-–,]?\s*(?:expected|estimated|costing|around|approx\.?|approximately|about|roughly|~)\s*(?:around|approx\.?)?\s*(?:USD|\$|€|£|₹|Rs\.?)?\s*[\d,]+(?:\.\d+)?\s*(?:USD|dollars?)?\s*(?:each|per\s+(?:unit|piece|item))?\s*/gi, '');
  name = name.replace(/[-–]?\s*(?:price|pricing|cost(?:ing)?|rate|budget|amount|value)\s*[:\-=]?\s*(?:not\s+decided|around|approx\.?|approximately|about|~)?\s*(?:USD|\$|€|£|₹|Rs\.?)?\s*[\d,]*(?:\.\d+)?\s*(?:USD|dollars?)?\s*(?:each|per\s+(?:unit|piece|item))?\s*/gi, '');
  name = name.replace(/(?:USD|\$|€|£|₹|Rs\.?)\s*[\d,]+(?:\.\d+)?/g, '');
  name = name.replace(/[\d,]+(?:\.\d+)?\s*(?:USD|dollars?)/gi, '');
  // Remove standalone large numbers (likely prices) — 4+ digits not part of a model number
  name = name.replace(/\b\d{4,}\b/g, '');

  // 8. Remove range qty expressions: "3 or maybe 4"
  name = name.replace(/\d+\s*(?:or\s+(?:maybe\s+)?\d+)\s*/gi, '');

  // 9. Remove filler/conversational words that leak in
  name = name.replace(/\b(?:need|only|expected|around|approx|approximately|about|costing|each|roughly|last\s+time|you\s+can\s+quote\s+accordingly|accordingly|please|read\s+properly|depending\s+on)\b/gi, '');

  // 10. Remove leading list markers and numbering
  name = name.replace(/^[\d.)\-•*]+\s*/, '');

  // 11. Final cleanup: pipes, dashes, extra whitespace
  name = name.replace(/[|]+/g, ' ');
  name = name.replace(/[-–—]+\s*$/g, '');
  name = name.replace(/^\s*[-–—]+/g, '');
  name = name.replace(/\s{2,}/g, ' ');
  name = name.replace(/[\s,\-–—]+$/, '');
  name = name.replace(/^\s*[,\-–—]+/, '');
  name = name.trim();

  // Verify the cleaned name is a real product name
  if (!name || name.length < 2 || isQtyOrPriceLine(name)) return null;

  const confident = qty !== null && price !== null;

  return {
    name,
    quantity: qty,
    unitPrice: price,
    description: descParts.join('; '),
    raw: allText,
    confident,
  };
}

export function parseEmailContent(text: string): ParseResult {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const { blocks, meta } = groupIntoBlocks(lines);

  const parsed: ParsedLine[] = [];
  const unparsed: string[] = [];

  for (const block of blocks) {
    const product = blockToProduct(block);
    if (product) {
      parsed.push(product);
    } else {
      // Block didn't qualify as product, add to unparsed
      unparsed.push([block.titleLine, ...block.attrLines].join(' | '));
    }
  }

  // Categorize meta lines into delivery, notes, client info
  let deliveryInstructions = '';
  const noteLines: string[] = [];
  let clientName = '';
  let clientCompany = '';

  for (const line of meta) {
    if (DELIVERY_RE.test(line) || INSTALLATION_RE.test(line)) {
      deliveryInstructions += (deliveryInstructions ? '\n' : '') + line;
    } else if (TAX_FREIGHT_RE.test(line)) {
      deliveryInstructions += (deliveryInstructions ? '\n' : '') + line;
    } else if (WARRANTY_RE.test(line)) {
      noteLines.push(line);
    } else if (INSTRUCTION_KEYWORD_RE.test(line)) {
      // generic instruction → notes
      noteLines.push(line);
    } else {
      // Check for person name / company in meta
      const words = line.split(/\s+/);
      if (words.length <= 3 && words.every(w => /^[A-Z][a-z]+\.?$/.test(w)) && !clientName) {
        clientName = line;
      } else if (/\b(ltd|llc|inc|corp|pvt|limited|co\.)\b/i.test(line) && !clientCompany) {
        clientCompany = line;
      } else {
        noteLines.push(line);
      }
    }
  }

  return {
    parsed,
    unparsed,
    deliveryInstructions,
    notes: noteLines.join('\n'),
    clientName,
    clientCompany,
  };
}

export function parsedLinesToProducts(lines: ParsedLine[]): ProductItem[] {
  return lines.map(l => {
    const q = l.quantity ?? 1;
    const p = l.unitPrice ?? 0;
    return {
      id: crypto.randomUUID(),
      name: l.name,
      description: l.description || '',
      quantity: q,
      unitPrice: p,
      total: q * p,
      customValues: {},
    };
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
