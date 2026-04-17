import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import type { ProductItem } from '@/types/quotation';
import { createEmptyProduct, formatCurrency } from '@/utils/quotation';

interface ProductTableProps {
  products: ProductItem[];
  onChange: (products: ProductItem[]) => void;
}

export default function ProductTable({ products, onChange }: ProductTableProps) {
  const updateProduct = (id: string, field: keyof ProductItem, value: string | number) => {
    onChange(
      products.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = Number(updated.quantity) * Number(updated.unitPrice);
        }
        return updated;
      })
    );
  };

  const addProduct = () => onChange([...products, createEmptyProduct()]);
  const removeProduct = (id: string) => {
    if (products.length <= 1) return;
    onChange(products.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Products / Services</h3>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Description</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">Qty</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Unit Price</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Total</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Input className="h-8 text-sm" placeholder="Product name" value={item.name} onChange={e => updateProduct(item.id, 'name', e.target.value)} />
                </td>
                <td className="px-3 py-2 hidden sm:table-cell">
                  <Input className="h-8 text-sm" placeholder="Description" value={item.description} onChange={e => updateProduct(item.id, 'description', e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <Input className="h-8 text-sm text-right" type="number" min={1} value={item.quantity} onChange={e => updateProduct(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                </td>
                <td className="px-3 py-2">
                  <Input className="h-8 text-sm text-right" type="number" min={0} step={0.01} value={item.unitPrice} onChange={e => updateProduct(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                </td>
                <td className="px-3 py-2 text-right font-medium text-foreground">
                  {formatCurrency(item.total)}
                </td>
                <td className="px-2 py-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeProduct(item.id)} disabled={products.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" onClick={addProduct} className="text-primary border-primary/30 hover:bg-primary/5">
        <Plus className="h-4 w-4 mr-1" /> Add Item
      </Button>
    </div>
  );
}
