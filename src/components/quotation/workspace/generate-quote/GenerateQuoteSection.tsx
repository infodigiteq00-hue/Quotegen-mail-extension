import type { ProductItem, QuotationData } from '@/types/quotation';
import type { ProductSuggestionView } from '@/modules/quotation/types';
import { QuoteFormPanel } from '@/components/quotation/workspace/generate-quote/QuoteFormPanel';
import { QuotePreviewPane } from '@/components/quotation/workspace/generate-quote/QuotePreviewPane';
import type { RefObject } from 'react';

interface GenerateQuoteSectionProps {
  data: QuotationData;
  selectedTemplate: string;
  previewScale: number;
  previewRef: RefObject<HTMLDivElement>;
  subtotal: number;
  tax: number;
  grandTotal: number;
  productSuggestions: ProductSuggestionView[];
  onUpdateField: <K extends keyof QuotationData>(key: K, value: QuotationData[K]) => void;
  onProductsExtracted: (
    products: ProductItem[],
    extras: { deliveryInstructions?: string; notes?: string; clientName?: string; clientCompany?: string }
  ) => void;
}

export function GenerateQuoteSection({
  data,
  selectedTemplate,
  previewScale,
  previewRef,
  subtotal,
  tax,
  grandTotal,
  productSuggestions,
  onUpdateField,
  onProductsExtracted,
}: GenerateQuoteSectionProps) {
  return (
    <div className="flex flex-col lg:flex-row">
      <QuoteFormPanel
        data={data}
        subtotal={subtotal}
        tax={tax}
        grandTotal={grandTotal}
        productSuggestions={productSuggestions}
        onUpdateField={onUpdateField}
        onProductsExtracted={onProductsExtracted}
      />
      <QuotePreviewPane
        data={data}
        selectedTemplate={selectedTemplate}
        previewScale={previewScale}
        previewRef={previewRef}
      />
    </div>
  );
}
