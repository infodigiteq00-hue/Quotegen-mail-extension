import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PdfViewerDialogProps {
  activePdfDataUrl: string | null;
  onClose: () => void;
}

export function PdfViewerDialog({ activePdfDataUrl, onClose }: PdfViewerDialogProps) {
  return (
    <Dialog open={!!activePdfDataUrl} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex h-[94vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3">
          <DialogTitle>Quote PDF Viewer</DialogTitle>
          <DialogDescription>Preview the selected quotation PDF from history.</DialogDescription>
        </DialogHeader>
        {activePdfDataUrl ? (
          <div className="min-h-0 flex-1">
            <iframe src={activePdfDataUrl} title="Quote PDF Viewer" className="h-full w-full border-0" />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
