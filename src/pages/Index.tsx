import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronDown,
  Download,
  Pencil,
  FileClock,
  FilePlus2,
  LogOut,
  PackagePlus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';
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
import { getCurrentUser, logout } from '@/utils/authStorage';

const DEFAULT_SCOPE = 'default';
const EMAIL_PAYLOAD_QUERY_KEY = 'email_payload';
const APP_LOGO_SRC = '/quotegen-logo.svg';
const QUOTATION_HISTORY_KEY = 'quotegen:v1:quotation-history';

type SidebarSection = 'generate-quote' | 'quotation-history' | 'product-tab';

interface HistoryEntry {
  id: string;
  quotationNumber: string;
  partyName: string;
  generatedOn: string;
  pdfDataUrl: string;
}

interface ProductCatalogItem {
  id: string;
  productName: string;
  productId: string;
  productDescription: string;
  productMaterial: string;
  productImageDataUrl: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface ProductFormState {
  productName: string;
  productId: string;
  productDescription: string;
  productMaterial: string;
  productImageDataUrl: string;
}

interface EditingProductDraft extends ProductFormState {
  quantity: number;
  unitPrice: number;
  discount: number;
}

const INITIAL_PRODUCT_FORM: ProductFormState = {
  productName: '',
  productId: '',
  productDescription: '',
  productMaterial: '',
  productImageDataUrl: '',
};

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUOTATION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(QUOTATION_HISTORY_KEY, JSON.stringify(entries));
}

interface EmailPayload {
  subject?: string;
  to?: string;
  body?: string;
}

export default function Index() {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<QuotationData>(() =>
    normalizeQuotationData(loadScopedQuotation(DEFAULT_SCOPE) ?? getDefaultQuotation())
  );
  const [selectedTemplate, setSelectedTemplate] = useState(() => loadScopedTemplate(DEFAULT_SCOPE) ?? 'professional');
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => loadHistory());
  const [activePdfDataUrl, setActivePdfDataUrl] = useState<string | null>(null);
  const [productCatalogItems, setProductCatalogItems] = useState<ProductCatalogItem[]>([]);
  const [editingProductCatalogId, setEditingProductCatalogId] = useState<string | null>(null);
  const [editingProductDraft, setEditingProductDraft] = useState<EditingProductDraft | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(INITIAL_PRODUCT_FORM);
  const previewRef = useRef<HTMLDivElement>(null);
  const handledEmailPayloadRef = useRef(false);
  const { toast } = useToast();

  const update = <K extends keyof QuotationData>(key: K, value: QuotationData[K]) =>
    setData(prev => ({ ...prev, [key]: value }));

  const updateProductForm = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setProductForm(prev => ({ ...prev, [key]: value }));
  };

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
    saveHistory(historyEntries);
  }, [historyEntries]);

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
      const pdfDataUrl = pdf.output('datauristring');
      const newHistoryEntry: HistoryEntry = {
        id: crypto.randomUUID(),
        quotationNumber: data.quotationNumber,
        partyName: data.client.company || data.client.name || 'N/A',
        generatedOn: new Date().toISOString(),
        pdfDataUrl,
      };
      setHistoryEntries(prev => [newHistoryEntry, ...prev].slice(0, 25));
      toast({ title: 'Quotation saved', description: 'Quote added to quotation history.' });
    } finally {
      exportRoot.remove();
    }
  };

  const handleReset = () => {
    setData(normalizeQuotationData(getDefaultQuotation()));
    toast({ title: 'Quotation reset', description: 'All fields have been cleared.' });
  };

  const handleLogout = () => {
    logout();
    navigate('/auth', { replace: true });
  };

  const handleSidebarNavigation = (section: SidebarSection) => {
    if (section === 'generate-quote') {
      navigate('/quote');
      return;
    }

    if (section === 'quotation-history') {
      navigate('/history');
      return;
    }

    navigate('/products');
  };

  const handleProductImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      updateProductForm('productImageDataUrl', dataUrl);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleAddProductCatalogItem = () => {
    if (!productForm.productName.trim() || !productForm.productId.trim()) {
      toast({
        title: 'Missing product details',
        description: 'Please provide product name and product id.',
        variant: 'destructive',
      });
      return;
    }

    const item: ProductCatalogItem = {
      id: crypto.randomUUID(),
      productName: productForm.productName.trim(),
      productId: productForm.productId.trim(),
      productDescription: productForm.productDescription.trim(),
      productMaterial: productForm.productMaterial.trim(),
      productImageDataUrl: productForm.productImageDataUrl,
      quantity: 1,
      unitPrice: 0,
      discount: 0,
    };

    setProductCatalogItems(prev => [item, ...prev]);
    update('products', [
      ...data.products,
      {
        id: crypto.randomUUID(),
        name: item.productName,
        description: item.productDescription,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
        customValues: {
          material: item.productMaterial,
          productId: item.productId,
          productCatalogId: item.id,
        },
      },
    ]);

    setProductForm(INITIAL_PRODUCT_FORM);
    toast({ title: 'Product added', description: 'Product added to product tab and quotation items.' });
  };

  const handleEditProductCatalogItem = (item: ProductCatalogItem) => {
    setEditingProductCatalogId(item.id);
    setEditingProductDraft({
      productName: item.productName,
      productId: item.productId,
      productDescription: item.productDescription,
      productMaterial: item.productMaterial,
      productImageDataUrl: item.productImageDataUrl,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
    });
  };

  const updateEditingProductDraft = <K extends keyof EditingProductDraft>(key: K, value: EditingProductDraft[K]) => {
    setEditingProductDraft(prev => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleInlineProductImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      updateEditingProductDraft('productImageDataUrl', dataUrl);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSaveInlineProductEdit = () => {
    if (!editingProductCatalogId || !editingProductDraft) return;

    const updatedItem: ProductCatalogItem = {
      id: editingProductCatalogId,
      productName: editingProductDraft.productName.trim(),
      productId: editingProductDraft.productId.trim(),
      productDescription: editingProductDraft.productDescription.trim(),
      productMaterial: editingProductDraft.productMaterial.trim(),
      productImageDataUrl: editingProductDraft.productImageDataUrl,
      quantity: editingProductDraft.quantity,
      unitPrice: editingProductDraft.unitPrice,
      discount: editingProductDraft.discount,
    };

    if (!updatedItem.productName || !updatedItem.productId) {
      toast({
        title: 'Missing product details',
        description: 'Product name and product id are required.',
        variant: 'destructive',
      });
      return;
    }

    setProductCatalogItems(prev => prev.map(existing => (existing.id === editingProductCatalogId ? updatedItem : existing)));
    update(
      'products',
      data.products.map(existing => {
        if (existing.customValues.productCatalogId !== editingProductCatalogId) return existing;
        return {
          ...existing,
          name: updatedItem.productName,
          description: updatedItem.productDescription,
          quantity: updatedItem.quantity,
          unitPrice: updatedItem.unitPrice,
          total: updatedItem.quantity * updatedItem.unitPrice,
          customValues: {
            ...existing.customValues,
            material: updatedItem.productMaterial,
            productId: updatedItem.productId,
            productCatalogId: editingProductCatalogId,
            productDiscount: String(updatedItem.discount),
          },
        };
      }),
    );

    setEditingProductCatalogId(null);
    setEditingProductDraft(null);
    toast({ title: 'Product updated', description: 'Table row updated successfully.' });
  };

  const handleDeleteProductCatalogItem = (item: ProductCatalogItem) => {
    setProductCatalogItems(prev => prev.filter(existing => existing.id !== item.id));
    update(
      'products',
      data.products.filter(existing => existing.customValues.productCatalogId !== item.id),
    );
    if (editingProductCatalogId === item.id) {
      setEditingProductCatalogId(null);
      setEditingProductDraft(null);
    }
    toast({ title: 'Product deleted', description: `${item.productName} removed successfully.` });
  };

  const handleCancelProductEdit = () => {
    setEditingProductCatalogId(null);
    setEditingProductDraft(null);
  };

  const currentUser = getCurrentUser();
  const activeSidebarSection: SidebarSection =
    location.pathname === '/history'
      ? 'quotation-history'
      : location.pathname === '/products'
      ? 'product-tab'
      : 'generate-quote';
  const isQuoteRoute = activeSidebarSection === 'generate-quote';
  const isHistoryRoute = activeSidebarSection === 'quotation-history';
  const isProductsRoute = activeSidebarSection === 'product-tab';
  const subtotal = calculateSubtotal(data.products);
  const tax = calculateTax(subtotal - data.discount, data.taxRate);
  const grandTotal = calculateGrandTotal(subtotal, data.discount, tax);
  const selectedTemplateLabel = TEMPLATES.find(t => t.id === selectedTemplate)?.name ?? 'Template';

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border"
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
      >
        <SidebarHeader className="p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <img
              src={APP_LOGO_SRC}
              alt="QuoteGen logo"
              className="h-8 w-8 shrink-0 rounded-md ring-1 ring-white/40 object-contain group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7"
            />
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold text-sidebar-foreground">QuoteGen</p>
              <p className="text-xs text-sidebar-foreground/70">Quotation Generator</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-3 py-2">
            <SidebarMenu className="gap-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-10 rounded-lg px-3"
                  isActive={activeSidebarSection === 'generate-quote'}
                  tooltip="Generate Quote"
                  onClick={() => handleSidebarNavigation('generate-quote')}
                >
                  <FilePlus2 />
                  <span className="group-data-[collapsible=icon]:hidden">Generate Quote</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-10 rounded-lg px-3"
                  isActive={activeSidebarSection === 'quotation-history'}
                  tooltip="Quotation History"
                  onClick={() => handleSidebarNavigation('quotation-history')}
                >
                  <FileClock />
                  <span className="group-data-[collapsible=icon]:hidden">Quotation History</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-10 rounded-lg px-3"
                  isActive={activeSidebarSection === 'product-tab'}
                  tooltip="Product Tab"
                  onClick={() => handleSidebarNavigation('product-tab')}
                >
                  <PackagePlus />
                  <span className="group-data-[collapsible=icon]:hidden">Product Tab</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3 pt-2">
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 group-data-[collapsible=icon]:px-1.5">
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="text-xs text-sidebar-foreground/70">Logged in as</p>
              <p className="truncate text-sm font-medium text-sidebar-foreground">{currentUser?.name ?? 'User'}</p>
              <p className="truncate text-xs text-sidebar-foreground/70">{currentUser?.email ?? ''}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex h-10 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium text-black transition-none group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="overflow-x-hidden bg-background">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-lg font-bold text-foreground">
                {isQuoteRoute ? 'Generate Quote' : isHistoryRoute ? 'Quotation History' : 'Product Tab'}
              </h1>
              <span className="hidden text-xs text-muted-foreground sm:inline">QuoteGen</span>
            </div>

            {isQuoteRoute && <div className="hidden items-center gap-2 md:flex">
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
            </div>}

            {isQuoteRoute && <div className="md:hidden">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground"
                aria-label={mobileActionsOpen ? 'Collapse actions' : 'Expand actions'}
                onClick={() => setMobileActionsOpen(prev => !prev)}
              >
                <ChevronDown className={`h-5 w-5 transition-transform ${mobileActionsOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>}
          </div>

          {isQuoteRoute && mobileActionsOpen && (
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

        {isQuoteRoute && (
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-1/2 xl:w-[45%] p-4 lg:p-6 space-y-6 lg:h-[calc(100vh-57px)] lg:overflow-y-auto">
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
        )}

        {isHistoryRoute && (
          <div className="p-4 lg:p-6">
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Quotation History</h2>
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
                    {historyEntries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                          No quotes yet. Download a PDF to add it to history.
                        </td>
                      </tr>
                    ) : (
                      historyEntries.map(entry => (
                        <tr key={entry.id} className="border-t border-border">
                          <td className="px-3 py-2 font-medium text-foreground">{entry.quotationNumber}</td>
                          <td className="px-3 py-2 text-foreground">{entry.partyName}</td>
                          <td className="px-3 py-2 text-muted-foreground">{new Date(entry.generatedOn).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <Button variant="outline" size="sm" onClick={() => setActivePdfDataUrl(entry.pdfDataUrl)}>
                              View Quote (PDF Viewer)
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {isProductsRoute && (
          <div className="p-4 lg:p-6">
            <div className="space-y-4 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Product Tab</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Product Name</Label>
                  <Input
                    value={productForm.productName}
                    onChange={e => updateProductForm('productName', e.target.value)}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Product ID</Label>
                  <Input
                    value={productForm.productId}
                    onChange={e => updateProductForm('productId', e.target.value)}
                    placeholder="Enter product id"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Product Description</Label>
                  <Textarea
                    value={productForm.productDescription}
                    onChange={e => updateProductForm('productDescription', e.target.value)}
                    placeholder="Enter product description"
                    className="min-h-[72px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Product Material</Label>
                  <Input
                    value={productForm.productMaterial}
                    onChange={e => updateProductForm('productMaterial', e.target.value)}
                    placeholder="Enter product material"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Product Image</Label>
                  <Input type="file" accept="image/*" onChange={handleProductImageChange} />
                </div>
              </div>
              <Button onClick={handleAddProductCatalogItem}>
                <PackagePlus className="h-4 w-4" />
                Add Product
              </Button>

              <div className="overflow-x-auto rounded-md border border-border bg-background">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-3 py-2 text-left font-medium uppercase text-foreground">Product Details</th>
                      <th className="px-3 py-2 text-left font-medium uppercase text-foreground">ID</th>
                      <th className="px-3 py-2 text-left font-medium uppercase text-foreground">Material</th>
                      <th className="px-3 py-2 text-left font-medium uppercase text-foreground">Description</th>
                      <th className="px-3 py-2 text-left font-medium uppercase text-foreground">Qty</th>
                      <th className="px-3 py-2 text-left font-medium uppercase text-foreground">Price</th>
                      <th className="px-3 py-2 text-left font-medium uppercase text-foreground">Discount</th>
                      <th className="px-3 py-2 text-left font-medium uppercase text-foreground">Final Offer</th>
                      <th className="px-3 py-2 text-left font-medium uppercase text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {productCatalogItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                          Add a product to see it listed here.
                        </td>
                      </tr>
                    ) : (
                      productCatalogItems.map(item => {
                        const finalOffer = item.quantity * item.unitPrice - item.discount;
                        const isEditingRow = editingProductCatalogId === item.id && !!editingProductDraft;
                        return (
                          <tr key={item.id} className="align-top">
                            <td className="px-3 py-4 text-foreground">
                              {isEditingRow ? (
                                <Input
                                  value={editingProductDraft.productName}
                                  onChange={e => updateEditingProductDraft('productName', e.target.value)}
                                  className="mb-3 h-8"
                                />
                              ) : (
                                <p className="mb-3 font-medium uppercase">{item.productName}</p>
                              )}
                              <div className="flex h-32 w-32 items-center justify-center bg-muted text-xs text-muted-foreground">
                                {isEditingRow ? (
                                  <div className="flex h-full w-full flex-col gap-1 p-1">
                                    <Input type="file" accept="image/*" className="h-8 text-[10px]" onChange={handleInlineProductImageChange} />
                                    <div className="flex flex-1 items-center justify-center overflow-hidden">
                                      {editingProductDraft.productImageDataUrl ? (
                                        <img
                                          src={editingProductDraft.productImageDataUrl}
                                          alt={editingProductDraft.productName}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        'PRODUCT IMAGE'
                                      )}
                                    </div>
                                  </div>
                                ) : item.productImageDataUrl ? (
                                  <img
                                    src={item.productImageDataUrl}
                                    alt={item.productName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  'PRODUCT IMAGE'
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-foreground">
                              {isEditingRow ? (
                                <Input
                                  value={editingProductDraft.productId}
                                  onChange={e => updateEditingProductDraft('productId', e.target.value)}
                                  className="h-8"
                                />
                              ) : (
                                item.productId
                              )}
                            </td>
                            <td className="px-3 py-4 text-foreground">
                              {isEditingRow ? (
                                <Input
                                  value={editingProductDraft.productMaterial}
                                  onChange={e => updateEditingProductDraft('productMaterial', e.target.value)}
                                  className="h-8"
                                />
                              ) : (
                                item.productMaterial || '-'
                              )}
                            </td>
                            <td className="px-3 py-4 whitespace-pre-wrap text-foreground">
                              {isEditingRow ? (
                                <Textarea
                                  value={editingProductDraft.productDescription}
                                  onChange={e => updateEditingProductDraft('productDescription', e.target.value)}
                                  className="min-h-[72px]"
                                />
                              ) : (
                                item.productDescription || '-'
                              )}
                            </td>
                            <td className="px-3 py-4 text-foreground">
                              {isEditingRow ? (
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-8 w-20"
                                  value={editingProductDraft.quantity}
                                  onChange={e => updateEditingProductDraft('quantity', Math.max(0, parseInt(e.target.value, 10) || 0))}
                                />
                              ) : (
                                item.quantity
                              )}
                            </td>
                            <td className="px-3 py-4 text-foreground">
                              {isEditingRow ? (
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  className="h-8 w-24"
                                  value={editingProductDraft.unitPrice}
                                  onChange={e => updateEditingProductDraft('unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                                />
                              ) : (
                                formatCurrency(item.unitPrice)
                              )}
                            </td>
                            <td className="px-3 py-4 text-foreground">
                              {isEditingRow ? (
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  className="h-8 w-24"
                                  value={editingProductDraft.discount}
                                  onChange={e => updateEditingProductDraft('discount', Math.max(0, parseFloat(e.target.value) || 0))}
                                />
                              ) : (
                                formatCurrency(item.discount)
                              )}
                            </td>
                            <td className="px-3 py-4 font-medium text-foreground">
                              {formatCurrency(
                                isEditingRow
                                  ? editingProductDraft.quantity * editingProductDraft.unitPrice - editingProductDraft.discount
                                  : finalOffer,
                              )}
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-1">
                                {isEditingRow ? (
                                  <>
                                    <Button type="button" size="sm" onClick={handleSaveInlineProductEdit}>
                                      Save
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={handleCancelProductEdit}>
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditProductCatalogItem(item)}
                                      aria-label="Edit product"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteProductCatalogItem(item)}
                                      aria-label="Delete product"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </SidebarInset>

      <Dialog open={!!activePdfDataUrl} onOpenChange={open => !open && setActivePdfDataUrl(null)}>
        <DialogContent className="h-[90vh] max-w-6xl p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>Quote PDF Viewer</DialogTitle>
            <DialogDescription>Preview the selected quotation PDF from history.</DialogDescription>
          </DialogHeader>
          {activePdfDataUrl ? (
            <iframe
              src={activePdfDataUrl}
              title="Quote PDF Viewer"
              className="h-full w-full rounded-b-lg border-0"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
