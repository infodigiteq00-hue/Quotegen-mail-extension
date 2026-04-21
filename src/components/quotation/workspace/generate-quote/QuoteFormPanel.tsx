import ClientForm from '@/components/quotation/ClientForm';
import EmailParser from '@/components/quotation/EmailParser';
import ProductTable from '@/components/quotation/ProductTable';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { ProductSuggestionView } from '@/modules/quotation/types';
import type { ProductItem, QuotationData } from '@/types/quotation';
import { formatCurrency, syncSeqFromQuotationNumber } from '@/utils/quotation';

interface QuoteFormPanelProps {
  data: QuotationData;
  subtotal: number;
  tax: number;
  grandTotal: number;
  productSuggestions: ProductSuggestionView[];
  onUpdateField: <K extends keyof QuotationData>(key: K, value: QuotationData[K]) => void;
  onProductsExtracted: (
    products: ProductItem[],
    extras: { deliveryInstructions?: string; notes?: string; clientName?: string; clientCompany?: string }
  ) => void;
}

export function QuoteFormPanel({
  data,
  subtotal,
  tax,
  grandTotal,
  productSuggestions,
  onUpdateField,
  onProductsExtracted,
}: QuoteFormPanelProps) {
  return (
    <div className="space-y-6 p-3 sm:p-4 lg:h-[calc(100vh-57px)] lg:w-1/2 lg:overflow-y-auto lg:p-6 xl:w-[45%]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Quotation #</Label>
          <Input
            value={data.quotationNumber}
            onChange={event => onUpdateField('quotationNumber', event.target.value)}
            onBlur={event => syncSeqFromQuotationNumber(event.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input
            type="date"
            value={data.date}
            onChange={event => onUpdateField('date', event.target.value)}
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Valid Until</Label>
          <Input
            type="date"
            value={data.validUntil}
            onChange={event => onUpdateField('validUntil', event.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      <ClientForm client={data.client} onChange={client => onUpdateField('client', client)} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div />
          <EmailParser onProductsExtracted={onProductsExtracted} />
        </div>
        <ProductTable
          products={data.products}
          lineItemColumns={data.lineItemColumns}
          productSuggestions={productSuggestions}
          onProductsChange={products => onUpdateField('products', products)}
          onColumnsChange={columns => onUpdateField('lineItemColumns', columns)}
        />
      </div>

      <div className="flex justify-end">
        <div className="w-full space-y-2 sm:w-64">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Discount ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={data.discount}
                onChange={event => onUpdateField('discount', parseFloat(event.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tax Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={data.taxRate}
                onChange={event => onUpdateField('taxRate', parseFloat(event.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1 rounded-lg bg-primary/5 p-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Discount</span>
                <span>-{formatCurrency(data.discount)}</span>
              </div>
            )}
            {data.taxRate > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax ({data.taxRate}%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-primary/20 pt-1 text-base font-bold text-primary">
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Delivery Instructions</Label>
          <Textarea
            placeholder="Delivery timeline, shipping method, etc."
            value={data.deliveryInstructions}
            onChange={event => onUpdateField('deliveryInstructions', event.target.value)}
            className="min-h-[60px] text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Terms & Conditions</Label>
          <Textarea
            value={data.terms}
            onChange={event => onUpdateField('terms', event.target.value)}
            className="min-h-[60px] text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Textarea
            placeholder="Additional notes for the client..."
            value={data.notes}
            onChange={event => onUpdateField('notes', event.target.value)}
            className="min-h-[60px] text-sm"
          />
        </div>
      </div>
    </div>
  );
}
