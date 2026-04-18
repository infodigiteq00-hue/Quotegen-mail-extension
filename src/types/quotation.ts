export interface ClientDetails {
  name: string;
  company: string;
  address: string;
  email: string;
  phone: string;
}

/** Built-in column roles; `custom` uses `id` as the key in `customValues`. */
export type LineColumnRole = 'name' | 'description' | 'quantity' | 'unitPrice' | 'lineTotal' | 'custom';

export interface LineItemColumn {
  id: string;
  role: LineColumnRole;
  label: string;
}

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  /** Values for `role: 'custom'` columns, keyed by column `id`. */
  customValues: Record<string, string>;
}

export interface CompanyBranding {
  companyName: string;
  addressLine: string;
  contactLine: string;
  footerText: string;
  themeColor: string; // hex like #1565c0
  logoDataUrl: string; // base64 PNG/JPG
  /** Optional top banner (full width). Ignored when full-page letterhead is enabled. */
  headerImageDataUrl: string;
  /** Optional bottom banner (full width). Ignored when full-page letterhead is enabled. */
  footerImageDataUrl: string;
  letterheadDataUrl: string; // optional full-page letterhead background
  useLetterhead: boolean;
}

export interface QuotationData {
  quotationNumber: string;
  date: string;
  validUntil: string;
  client: ClientDetails;
  /** Column headers and order for the line items table (preview + editor). */
  lineItemColumns: LineItemColumn[];
  products: ProductItem[];
  deliveryInstructions: string;
  terms: string;
  notes: string;
  discount: number;
  taxRate: number;
  branding: CompanyBranding;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  description: string;
}

export const TEMPLATES: QuotationTemplate[] = [
  { id: 'professional', name: 'Professional Blue', description: 'Clean corporate design with blue accents' },
  { id: 'modern', name: 'Modern Minimal', description: 'Minimalist design with subtle styling' },
  { id: 'classic', name: 'Classic Formal', description: 'Traditional business quotation format' },
];
