import { Download, RotateCcw } from 'lucide-react';
import BrandingSettings from '@/components/quotation/BrandingSettings';
import { Button } from '@/components/ui/button';
import type { CompanyBranding } from '@/types/quotation';

interface HeaderActionButtonsProps {
  branding: CompanyBranding;
  onBrandingChange: (branding: CompanyBranding) => void;
  onReset: () => void;
  onDownloadPdf: () => void;
  compact?: boolean;
}

export function HeaderActionButtons({
  branding,
  onBrandingChange,
  onReset,
  onDownloadPdf,
  compact = false,
}: HeaderActionButtonsProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <BrandingSettings branding={branding} onChange={onBrandingChange} />
        <Button variant="outline" onClick={onReset} className="justify-start">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button onClick={onDownloadPdf} className="w-fit justify-start">
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>
    );
  }

  return (
    <>
      <BrandingSettings branding={branding} onChange={onBrandingChange} />
      <Button variant="outline" size="sm" onClick={onReset}>
        <RotateCcw className="mr-1 h-4 w-4" />
        Reset
      </Button>
      <Button size="sm" onClick={onDownloadPdf}>
        <Download className="mr-1 h-4 w-4" />
        Download PDF
      </Button>
    </>
  );
}
