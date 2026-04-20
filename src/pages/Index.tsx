import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, Download, FileText, RotateCcw } from 'lucide-react';
import ClientForm from '@/components/quotation/ClientForm';
import ProductTable from '@/components/quotation/ProductTable';
import EmailParser from '@/components/quotation/EmailParser';
import QuotationPreview from '@/components/quotation/QuotationPreview';
import BrandingSettings from '@/components/quotation/BrandingSettings';
import { getDefaultQuotation, normalizeQuotationData, calculateSubtotal, calculateTax, calculateGrandTotal, formatCurrency, parseEmailContent, parsedLinesToProducts } from '@/utils/quotation';
import { loadScopedQuotation, loadScopedTemplate, saveScopedQuotation, saveScopedTemplate } from '@/utils/scopedStorage';
import type { QuotationData, ProductItem } from '@/types/quotation';
import { TEMPLATES } from '@/types/quotation';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_SCOPE = 'default';
const EMAIL_PAYLOAD_QUERY_KEY = 'email_payload';
const APP_LOGO_SRC = '/quotegen-logo.svg';

interface EmailPayload {
  subject?: string;
  to?: string;
  body?: string;
}

export default function Index() {
  const [data, setData] = useState<QuotationData>(() =>
    normalizeQuotationData(loadScopedQuotation(DEFAULT_SCOPE) ?? getDefaultQuotation())
  );
  const [selectedTemplate, setSelectedTemplate] = useState(() => loadScopedTemplate(DEFAULT_SCOPE) ?? 'professional');
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const handledEmailPayloadRef = useRef(false);
  const { toast } = useToast();

  const update = <K extends keyof QuotationData>(key: K, value: QuotationData[K]) =>
    setData(prev => ({ ...prev, [key]: value }));

  const handleProductsExtracted = (products: ProductItem[], extras: { deliveryInstructions?: string; notes?: string; clientName?: string; clientCompany?: string }) => {
    update('products', [...data.products.filter(p => p.name), ...products]);
    if (extras.deliveryInstructions) update('deliveryInstructions', extras.deliveryInstructions);
    if (extras.notes) update('notes', extras.notes);
    if (extras.clientName) update('client', { ...data.client, name: extras.clientName || data.client.name, company: extras.clientCompany || data.client.company });
    toast({ title: `${products.length} product(s) extracted`, description: 'Products added to your quotation.' });
  };

  useEffect(() => {
    saveScopedQuotation(DEFAULT_SCOPE, data);
  }, [data]);

  useEffect(() => {
    saveScopedTemplate(DEFAULT_SCOPE, selectedTemplate);
  }, [selectedTemplate]);

  useEffect(() => {
    if (handledEmailPayloadRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const encodedPayload = params.get(EMAIL_PAYLOAD_QUERY_KEY);
    if (!encodedPayload) return;

    handledEmailPayloadRef.current = true;

    const clearQueryParam = () => {
      params.delete(EMAIL_PAYLOAD_QUERY_KEY);
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
      window.history.replaceState({}, document.title, nextUrl);
    };

    try {
      const bytes = Uint8Array.from(atob(encodedPayload), char => char.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      const payload = JSON.parse(decoded) as EmailPayload;
      const body = payload.body?.trim();

      if (!body) {
        toast({
          title: 'No email content found',
          description: 'The extension payload did not include compose body text.',
          variant: 'destructive',
        });
        clearQueryParam();
        return;
      }

      const result = parseEmailContent(body);
      const products = parsedLinesToProducts(result.parsed.filter(p => p.name));
      const metaNote = [
        payload.subject ? `Subject: ${payload.subject}` : '',
        payload.to ? `To: ${payload.to}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      setData(prev => {
        const nextNotes = [prev.notes, result.notes, metaNote].filter(Boolean).join('\n').trim();
        return {
          ...prev,
          products: [...prev.products.filter(p => p.name), ...products],
          deliveryInstructions: result.deliveryInstructions || prev.deliveryInstructions,
          notes: nextNotes,
          client: {
            ...prev.client,
            name: result.clientName || prev.client.name,
            company: result.clientCompany || prev.client.company,
          },
        };
      });

      toast({
        title: 'Quotation created from email',
        description: `${products.length} item(s) added from Gmail compose.`,
      });
    } catch {
      toast({
        title: 'Invalid extension payload',
        description: 'Could not read email data from the extension link.',
        variant: 'destructive',
      });
    } finally {
      clearQueryParam();
    }
  }, [toast]);

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
    const exportRoot = previewRef.current.cloneNode(true) as HTMLDivElement;
    exportRoot.style.position = 'fixed';
    exportRoot.style.left = '0';
    exportRoot.style.top = '0';
    exportRoot.style.width = '210mm';
    exportRoot.style.maxWidth = '210mm';
    exportRoot.style.background = 'white';
    exportRoot.style.padding = '0';
    exportRoot.style.margin = '0';
    exportRoot.style.opacity = '0';
    exportRoot.style.pointerEvents = 'none';
    exportRoot.style.zIndex = '2147483647';

    const exportPages = Array.from(exportRoot.querySelectorAll<HTMLElement>('.quotation-a4-page'));
    exportPages.forEach(page => {
      page.style.width = '210mm';
      page.style.minHeight = '297mm';
      page.style.height = '297mm';
      page.style.maxHeight = '297mm';
      page.style.overflow = 'hidden';
      page.style.marginBottom = '0';
      page.style.boxShadow = 'none';
      page.style.pageBreakInside = 'avoid';
      page.style.breakInside = 'avoid';
    });

    document.body.appendChild(exportRoot);
    try {
      if (!exportPages.length) {
        toast({ title: 'PDF export failed', description: 'No preview pages were found.', variant: 'destructive' });
        return;
      }

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      for (let i = 0; i < exportPages.length; i++) {
        const page = exportPages[i];
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: page.scrollWidth,
          windowHeight: page.scrollHeight,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        if (i > 0) pdf.addPage('a4', 'portrait');
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }
      pdf.save(`${data.quotationNumber}.pdf`);
    } finally {
      exportRoot.remove();
    }
  };

  const handleReset = () => {
    setData(normalizeQuotationData(getDefaultQuotation()));
    toast({ title: 'Quotation reset', description: 'All fields have been cleared.' });
  };

  const subtotal = calculateSubtotal(data.products);
  const tax = calculateTax(subtotal - data.discount, data.taxRate);
  const grandTotal = calculateGrandTotal(subtotal, data.discount, tax);
  const selectedTemplateLabel = TEMPLATES.find(t => t.id === selectedTemplate)?.name ?? 'Template';

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={APP_LOGO_SRC} alt="QuoteGen logo" className="h-8 w-8 object-contain" />
            <h1 className="truncate text-lg font-bold text-foreground">QuoteGen</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">Professional Quotation Generator</span>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger
                className="h-9 w-[min(15rem,calc(100vw-22rem))] min-w-[11rem] shrink-0 gap-2 px-3 text-left text-xs font-medium sm:text-sm"
                aria-label="Quotation template"
              >
                <SelectValue placeholder="Template">{selectedTemplateLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[100] max-w-[min(20rem,calc(100vw-2rem))]">
                {TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id} textValue={`${t.name} ${t.description}`} className="cursor-pointer">
                    <div className="flex w-full min-w-0 flex-col gap-1 py-0.5 pr-1">
                      <span className="text-sm font-medium leading-snug text-foreground">{t.name}</span>
                      <span className="text-xs leading-normal text-muted-foreground">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <BrandingSettings branding={data.branding} onChange={b => update('branding', b)} />
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
            <Button size="sm" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4 mr-1" /> Download PDF
            </Button>
          </div>

          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground"
              aria-label={mobileActionsOpen ? 'Collapse actions' : 'Expand actions'}
              onClick={() => setMobileActionsOpen(prev => !prev)}
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${mobileActionsOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {mobileActionsOpen && (
          <div className="mt-3 border-t border-border pt-3 md:hidden">
            <div className="grid grid-cols-1 gap-2">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Template">{selectedTemplateLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="z-[100] max-w-[min(20rem,calc(100vw-2rem))]">
                  {TEMPLATES.map(t => (
                    <SelectItem key={t.id} value={t.id} textValue={`${t.name} ${t.description}`} className="cursor-pointer">
                      <div className="flex w-full min-w-0 flex-col gap-1 py-0.5 pr-1">
                        <span className="text-sm font-medium leading-snug text-foreground">{t.name}</span>
                        <span className="text-xs leading-normal text-muted-foreground">{t.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-2">
                <BrandingSettings branding={data.branding} onChange={b => update('branding', b)} />
                <Button variant="outline" onClick={handleReset} className="justify-start">
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
                <Button onClick={handleDownloadPdf} className="w-fit justify-start">
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Left: Form */}
        <div className="lg:w-1/2 xl:w-[45%] p-4 lg:p-6 space-y-6 lg:h-[calc(100vh-57px)] lg:overflow-y-auto">
          {/* Quotation Meta */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Quotation #</Label>
              <Input value={data.quotationNumber} onChange={e => update('quotationNumber', e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={data.date} onChange={e => update('date', e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Valid Until</Label>
              <Input type="date" value={data.validUntil} onChange={e => update('validUntil', e.target.value)} className="text-sm" />
            </div>
          </div>

          <ClientForm client={data.client} onChange={c => update('client', c)} />

          {/* Email Parser + Product Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div />
              <EmailParser onProductsExtracted={handleProductsExtracted} />
            </div>
            <ProductTable
              products={data.products}
              lineItemColumns={data.lineItemColumns}
              onProductsChange={p => update('products', p)}
              onColumnsChange={c => update('lineItemColumns', c)}
            />
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Discount ($)</Label>
                  <Input type="number" min={0} step={0.01} value={data.discount} onChange={e => update('discount', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tax Rate (%)</Label>
                  <Input type="number" min={0} max={100} step={0.1} value={data.taxRate} onChange={e => update('taxRate', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
              </div>
              <div className="bg-primary/5 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                {data.discount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Discount</span><span>-{formatCurrency(data.discount)}</span>
                  </div>
                )}
                {data.taxRate > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax ({data.taxRate}%)</span><span>{formatCurrency(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-primary pt-1 border-t border-primary/20">
                  <span>Grand Total</span><span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional fields */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Delivery Instructions</Label>
              <Textarea placeholder="Delivery timeline, shipping method, etc." value={data.deliveryInstructions} onChange={e => update('deliveryInstructions', e.target.value)} className="min-h-[60px] text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Terms & Conditions</Label>
              <Textarea value={data.terms} onChange={e => update('terms', e.target.value)} className="min-h-[60px] text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea placeholder="Additional notes for the client..." value={data.notes} onChange={e => update('notes', e.target.value)} className="min-h-[60px] text-sm" />
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:w-1/2 xl:w-[55%] bg-muted/50 border-l border-border lg:h-[calc(100vh-57px)] overflow-auto p-4 lg:p-6">
          <div className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Preview</div>
          <div className="flex justify-center overflow-x-auto">
            <div
              className="origin-top"
              style={{
                transform: 'scale(0.55)',
                transformOrigin: 'top center',
                width: '181.8%',
              }}
            >
              <QuotationPreview ref={previewRef} data={data} templateId={selectedTemplate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
