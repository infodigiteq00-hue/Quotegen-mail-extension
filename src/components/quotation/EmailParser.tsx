import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Mail, Sparkles, Chrome, Check, AlertTriangle, Trash2, Plus, Info } from 'lucide-react';
import { parseEmailContent, parsedLinesToProducts } from '@/utils/quotation';
import { downloadChromeExtensionZip } from '@/utils/chromeExtensionPack';
import type { ProductItem } from '@/types/quotation';
import type { ParsedLine, ParseResult } from '@/utils/quotation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface EmailParserProps {
  onProductsExtracted: (products: ProductItem[], extras: { deliveryInstructions?: string; notes?: string; clientName?: string; clientCompany?: string }) => void;
}

type Step = 'input' | 'review';

export default function EmailParser({ onProductsExtracted }: EmailParserProps) {
  const [emailText, setEmailText] = useState('');
  const [open, setOpen] = useState(false);
  const [extensionOpen, setExtensionOpen] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [isDownloadingExtension, setIsDownloadingExtension] = useState(false);
  const [parsed, setParsed] = useState<ParsedLine[]>([]);
  const [unparsed, setUnparsed] = useState<string[]>([]);
  const [extras, setExtras] = useState<Omit<ParseResult, 'parsed' | 'unparsed'>>({ deliveryInstructions: '', notes: '', clientName: '', clientCompany: '' });

  const handleParse = () => {
    const result = parseEmailContent(emailText);
    setParsed(result.parsed);
    setUnparsed(result.unparsed);
    setExtras({ deliveryInstructions: result.deliveryInstructions, notes: result.notes, clientName: result.clientName, clientCompany: result.clientCompany });
    setStep('review');
  };

  const handleConfirm = () => {
    const products = parsedLinesToProducts(parsed.filter(p => p.name));
    onProductsExtracted(products, extras);
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setStep('input');
    setEmailText('');
    setParsed([]);
    setUnparsed([]);
    setExtras({ deliveryInstructions: '', notes: '', clientName: '', clientCompany: '' });
  };

  const updateParsed = (index: number, field: keyof ParsedLine, value: string | number | null) => {
    setParsed(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removeParsed = (index: number) => {
    setParsed(prev => prev.filter((_, i) => i !== index));
  };

  const convertUnparsedToItem = (line: string, idx: number) => {
    setParsed(prev => [...prev, { name: line, quantity: 1, unitPrice: null, description: '', raw: line, confident: false }]);
    setUnparsed(prev => prev.filter((_, i) => i !== idx));
  };

  const handleExtensionDownload = async () => {
    try {
      setIsDownloadingExtension(true);
      await downloadChromeExtensionZip(window.location.origin);
    } finally {
      setIsDownloadingExtension(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-accent border-accent/30 hover:bg-accent/5">
            <Mail className="h-4 w-4 mr-1" /> Parse Email
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              {step === 'input' ? 'Extract Products from Email' : 'Review Extracted Products'}
            </DialogTitle>
            <DialogDescription>
              {step === 'input'
                ? 'Paste any email content below. The system will extract product names, quantities, and prices from structured blocks.'
                : 'Review and edit the extracted data before adding to your quotation.'}
            </DialogDescription>
          </DialogHeader>

          {step === 'input' && (
            <>
              <Textarea
                placeholder={`Paste email content here, e.g.:\n\nHeat Exchanger - Unit 1\nQty: 2 Nos\nApprox Price: 48,500 USD per unit\nMOC: SS316\n\nReactor Vessel\nQuantity: 1\nExpected Cost: around 125000 USD`}
                className="min-h-[200px] font-mono text-sm"
                value={emailText}
                onChange={e => setEmailText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleParse} disabled={!emailText.trim()}>Extract Products</Button>
              </div>
            </>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              {parsed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Extracted Products ({parsed.length})</p>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground text-xs">Product Name</th>
                          <th className="text-right px-3 py-1.5 font-medium text-muted-foreground text-xs w-20">Qty</th>
                          <th className="text-right px-3 py-1.5 font-medium text-muted-foreground text-xs w-28">Price</th>
                          <th className="w-16 px-2 py-1.5 text-xs text-muted-foreground text-center">Status</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.map((item, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-2 py-1.5">
                              <Input
                                className="h-7 text-sm"
                                value={item.name}
                                onChange={e => updateParsed(i, 'name', e.target.value)}
                              />
                              {item.description && (
                                <span className="text-xs text-muted-foreground ml-1">{item.description}</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                className="h-7 text-sm text-right"
                                type="number"
                                min={1}
                                value={item.quantity ?? ''}
                                placeholder="1"
                                onChange={e => updateParsed(i, 'quantity', e.target.value ? parseInt(e.target.value) : null)}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                className="h-7 text-sm text-right"
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.unitPrice ?? ''}
                                placeholder="0.00"
                                onChange={e => updateParsed(i, 'unitPrice', e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {item.confident ? (
                                <Check className="h-4 w-4 text-success mx-auto" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-warning mx-auto" />
                              )}
                            </td>
                            <td className="px-1 py-1.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeParsed(i)}>
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Extracted meta info */}
              {(extras.deliveryInstructions || extras.notes) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Info className="h-3 w-3" /> Also Extracted
                  </p>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
                    {extras.deliveryInstructions && <p><span className="font-medium text-foreground">Delivery:</span> {extras.deliveryInstructions}</p>}
                    {extras.notes && <p><span className="font-medium text-foreground">Notes:</span> {extras.notes}</p>}
                    {extras.clientName && <p><span className="font-medium text-foreground">Contact:</span> {extras.clientName}{extras.clientCompany ? `, ${extras.clientCompany}` : ''}</p>}
                  </div>
                </div>
              )}

              {unparsed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Unrecognized Lines ({unparsed.length})
                  </p>
                  <div className="space-y-1">
                    {unparsed.map((line, i) => (
                      <div key={i} className="flex items-center gap-2 bg-muted/50 rounded px-3 py-1.5 text-sm">
                        <span className="flex-1 text-muted-foreground truncate font-mono text-xs">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parsed.length === 0 && unparsed.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No products could be extracted. Try pasting different email content.</p>
              )}

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep('input')}>← Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button onClick={handleConfirm} disabled={parsed.length === 0}>
                    Add {parsed.length} Item{parsed.length !== 1 ? 's' : ''} to Quotation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={extensionOpen} onOpenChange={setExtensionOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Chrome className="h-4 w-4 mr-1" /> Extension
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Chrome className="h-5 w-5 text-primary" /> Browser Extension
            </DialogTitle>
            <DialogDescription>
              Capture email content directly from your inbox with one click.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="font-medium text-foreground">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Install the QuoteGen Chrome extension</li>
                <li>Open any client email in Gmail or Outlook Web</li>
                <li>Click Create Quotation in read view or compose view</li>
                <li>Email content is sent to this app automatically</li>
                <li>Products are extracted and quotation is pre-filled</li>
              </ol>
            </div>
            <Button variant="outline" className="w-full" onClick={handleExtensionDownload} disabled={isDownloadingExtension}>
              <Chrome className="h-4 w-4 mr-2" /> {isDownloadingExtension ? 'Preparing download...' : 'Download Extension'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
