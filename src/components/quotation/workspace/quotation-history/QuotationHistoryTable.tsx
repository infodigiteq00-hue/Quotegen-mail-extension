import type { HistoryEntry } from '@/modules/quotation/types';
import { QuotationHistoryRow } from '@/components/quotation/workspace/quotation-history/QuotationHistoryRow';

interface QuotationHistoryTableProps {
  entries: HistoryEntry[];
  onViewQuote: (pdfDataUrl: string) => void;
}

export function QuotationHistoryTable({ entries, onViewQuote }: QuotationHistoryTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Quotation Number</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Party Name</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Generated On</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">View Quote</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                No quotes yet. Download a PDF to add it to history.
              </td>
            </tr>
          ) : (
            entries.map(entry => <QuotationHistoryRow key={entry.id} entry={entry} onViewQuote={onViewQuote} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
