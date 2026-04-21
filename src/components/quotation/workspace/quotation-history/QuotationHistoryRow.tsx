import { Button } from '@/components/ui/button';
import type { HistoryEntry } from '@/modules/quotation/types';

interface QuotationHistoryRowProps {
  entry: HistoryEntry;
  onViewQuote: (pdfDataUrl: string) => void;
}

export function QuotationHistoryRow({ entry, onViewQuote }: QuotationHistoryRowProps) {
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 font-medium text-foreground">{entry.quotationNumber}</td>
      <td className="px-3 py-2 text-foreground">{entry.partyName}</td>
      <td className="px-3 py-2 text-muted-foreground">{new Date(entry.generatedOn).toLocaleString()}</td>
      <td className="px-3 py-2">
        <Button variant="outline" size="sm" onClick={() => onViewQuote(entry.pdfDataUrl)}>
          View Quote (PDF Viewer)
        </Button>
      </td>
    </tr>
  );
}
