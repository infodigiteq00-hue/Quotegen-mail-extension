import { ChevronDown } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { CompanyBranding } from '@/types/quotation';
import { HeaderActionButtons } from '@/components/quotation/workspace/header/HeaderActionButtons';
import { TemplateSelector } from '@/components/quotation/workspace/header/TemplateSelector';

interface AppHeaderProps {
  title: string;
  isQuoteRoute: boolean;
  selectedTemplate: string;
  selectedTemplateLabel: string;
  mobileActionsOpen: boolean;
  branding: CompanyBranding;
  onToggleMobileActions: () => void;
  onTemplateChange: (value: string) => void;
  onBrandingChange: (branding: CompanyBranding) => void;
  onReset: () => void;
  onDownloadPdf: () => void;
}

export function AppHeader({
  title,
  isQuoteRoute,
  selectedTemplate,
  selectedTemplateLabel,
  mobileActionsOpen,
  branding,
  onToggleMobileActions,
  onTemplateChange,
  onBrandingChange,
  onReset,
  onDownloadPdf,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
          <span className="hidden text-xs text-muted-foreground sm:inline">QuoteGen</span>
        </div>

        {isQuoteRoute && (
          <div className="hidden items-center gap-2 md:flex">
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              selectedTemplateLabel={selectedTemplateLabel}
              onTemplateChange={onTemplateChange}
            />
            <HeaderActionButtons
              branding={branding}
              onBrandingChange={onBrandingChange}
              onReset={onReset}
              onDownloadPdf={onDownloadPdf}
            />
          </div>
        )}

        {isQuoteRoute && (
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground"
              aria-label={mobileActionsOpen ? 'Collapse actions' : 'Expand actions'}
              onClick={onToggleMobileActions}
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${mobileActionsOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {isQuoteRoute && mobileActionsOpen && (
        <div className="mt-3 border-t border-border pt-3 md:hidden">
          <div className="grid grid-cols-1 gap-2">
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              selectedTemplateLabel={selectedTemplateLabel}
              onTemplateChange={onTemplateChange}
              compact
            />
            <HeaderActionButtons
              compact
              branding={branding}
              onBrandingChange={onBrandingChange}
              onReset={onReset}
              onDownloadPdf={onDownloadPdf}
            />
          </div>
        </div>
      )}
    </header>
  );
}
