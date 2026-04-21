import QuotationPreview from '@/components/quotation/QuotationPreview';
import type { QuotationData } from '@/types/quotation';
import type { RefObject } from 'react';

interface QuotePreviewPaneProps {
  data: QuotationData;
  selectedTemplate: string;
  previewScale: number;
  previewRef: RefObject<HTMLDivElement>;
}

export function QuotePreviewPane({ data, selectedTemplate, previewScale, previewRef }: QuotePreviewPaneProps) {
  return (
    <div className="border-t border-border bg-muted/50 p-3 sm:p-4 lg:h-[calc(100vh-57px)] lg:w-1/2 lg:overflow-auto lg:border-l lg:border-t-0 lg:p-6 xl:w-[55%]">
      <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Live Preview</div>
      <div className="flex justify-center overflow-x-auto">
        <div
          className="origin-top"
          style={{
            transform: `scale(${previewScale})`,
            transformOrigin: 'top center',
            width: `${100 / previewScale}%`,
          }}
        >
          <QuotationPreview ref={previewRef} data={data} templateId={selectedTemplate} />
        </div>
      </div>
    </div>
  );
}
