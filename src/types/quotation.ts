export interface ClientDetails {
  name: string;
  company: string;
  address: string;
  email: string;
  phone: string;
}

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CompanyBranding {
  companyName: string;
  addressLine: string;
  contactLine: string;
  footerText: string;
  themeColor: string; // hex like #1565c0
  logoDataUrl: string; // base64 PNG/JPG
  letterheadDataUrl: string; // optional full-page letterhead background
  useLetterhead: boolean;
}

export interface QuotationData {
  quotationNumber: string;
  date: string;
  validUntil: string;
  client: ClientDetails;
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
