import type { HistoryEntry } from '@/modules/quotation/types';
import { QuotationHistoryTable } from '@/components/quotation/workspace/quotation-history/QuotationHistoryTable';

interface QuotationHistorySectionProps {
  entries: HistoryEntry[];
  onViewQuote: (pdfDataUrl: string) => void;
}

export function QuotationHistorySection({ entries, onViewQuote }: QuotationHistorySectionProps) {
  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Quotation History</h2>
        <QuotationHistoryTable entries={entries} onViewQuote={onViewQuote} />
      </div>
    </div>
  );
}
