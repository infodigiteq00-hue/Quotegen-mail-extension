import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, X } from 'lucide-react';
import type { LineItemColumn, ProductItem } from '@/types/quotation';
import { createEmptyProduct, formatCurrency } from '@/utils/quotation';

export interface ProductSuggestion {
  productName: string;
  productId: string;
  productDescription: string;
  productMaterial: string;
  unitPrice: number;
}

interface ProductTableProps {
  products: ProductItem[];
  lineItemColumns: LineItemColumn[];
  productSuggestions?: ProductSuggestion[];
  onProductsChange: (products: ProductItem[]) => void;
  onColumnsChange: (columns: LineItemColumn[]) => void;
}

export default function ProductTable({
  products,
  lineItemColumns,
  productSuggestions = [],
  onProductsChange,
  onColumnsChange,
}: ProductTableProps) {
  const [activeSuggestionRowId, setActiveSuggestionRowId] = useState<string | null>(null);
  const normalizedSuggestions = useMemo(
    () =>
      productSuggestions.map(suggestion => ({
        ...suggestion,
        searchText: `${suggestion.productName} ${suggestion.productId}`.toLowerCase(),
      })),
    [productSuggestions]
  );

  const updateProduct = (id: string, field: keyof ProductItem, value: string | number) => {
    onProductsChange(
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

  const applySuggestionToProduct = (productId: string, typedName: string) => {
    const normalizedName = typedName.trim().toLowerCase();
    const matched = normalizedSuggestions.find(
      suggestion => suggestion.productName.trim().toLowerCase() === normalizedName
    );

    if (!matched) {
      updateProduct(productId, 'name', typedName);
      return;
    }

    onProductsChange(
      products.map(p => {
        if (p.id !== productId) return p;

        const customValues = { ...p.customValues };
        lineItemColumns
          .filter(col => col.role === 'custom')
          .forEach(col => {
            const label = col.label.trim().toLowerCase();
            if (label.includes('material')) {
              customValues[col.id] = matched.productMaterial;
            } else if (label.includes('id') || label.includes('code') || label.includes('sku')) {
              customValues[col.id] = matched.productId;
            }
          });

        const nextUnitPrice = Number.isFinite(matched.unitPrice) ? matched.unitPrice : p.unitPrice;
        return {
          ...p,
          name: matched.productName,
          description: matched.productDescription,
          unitPrice: nextUnitPrice,
          total: Number(p.quantity) * Number(nextUnitPrice),
          customValues,
        };
      })
    );
  };

  const getFilteredSuggestions = (typedName: string) => {
    const normalized = typedName.trim().toLowerCase();
    if (!normalized) return normalizedSuggestions.slice(0, 8);
    return normalizedSuggestions
      .filter(suggestion => suggestion.searchText.includes(normalized))
      .slice(0, 8);
  };

  const updateCustomValue = (productId: string, columnId: string, value: string) => {
    onProductsChange(
      products.map(p => {
        if (p.id !== productId) return p;
        return {
          ...p,
          customValues: { ...p.customValues, [columnId]: value },
        };
      })
    );
  };

  const updateColumnLabel = (columnId: string, label: string) => {
    onColumnsChange(lineItemColumns.map(c => (c.id === columnId ? { ...c, label } : c)));
  };

  const addCustomColumn = () => {
    onColumnsChange([
      ...lineItemColumns,
      { id: crypto.randomUUID(), role: 'custom', label: 'New column' },
    ]);
  };

  const removeColumn = (columnId: string) => {
    const col = lineItemColumns.find(c => c.id === columnId);
    if (!col || col.role !== 'custom') return;
    onColumnsChange(lineItemColumns.filter(c => c.id !== columnId));
    onProductsChange(
      products.map(p => {
        const { [columnId]: _, ...rest } = p.customValues;
        return { ...p, customValues: rest };
      })
    );
  };

  const addProduct = () => onProductsChange([...products, createEmptyProduct()]);
  const removeProduct = (id: string) => {
    if (products.length <= 1) return;
    onProductsChange(products.filter(p => p.id !== id));
  };

  const renderCell = (item: ProductItem, col: LineItemColumn) => {
    switch (col.role) {
      case 'name':
        const rowSuggestions = getFilteredSuggestions(item.name);
        const showSuggestions =
          activeSuggestionRowId === item.id && rowSuggestions.length > 0;
        return (
          <Popover
            open={showSuggestions}
            onOpenChange={open => setActiveSuggestionRowId(open ? item.id : null)}
          >
            <PopoverTrigger asChild>
              <Input
                className="h-8 text-sm"
                placeholder="Product name"
                value={item.name}
                onFocus={() => setActiveSuggestionRowId(item.id)}
                onChange={e => {
                  applySuggestionToProduct(item.id, e.target.value);
                  setActiveSuggestionRowId(item.id);
                }}
              />
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={4}
              className="z-[100] w-[var(--radix-popover-trigger-width)] p-1"
            >
              <ul className="max-h-56 overflow-y-auto">
                {rowSuggestions.map(suggestion => (
                  <li key={`${item.id}-${suggestion.productId}-${suggestion.productName}`}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start rounded-sm px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                      onClick={() => {
                        applySuggestionToProduct(item.id, suggestion.productName);
                        setActiveSuggestionRowId(null);
                      }}
                    >
                      <span className="text-sm font-medium">{suggestion.productName}</span>
                      <span className="text-xs text-muted-foreground">{suggestion.productId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        );
      case 'description':
        return (
          <Input
            className="h-8 text-sm"
            placeholder="Description"
            value={item.description}
            onChange={e => updateProduct(item.id, 'description', e.target.value)}
          />
        );
      case 'quantity':
        return (
          <Input
            className="h-8 text-sm text-right"
            type="number"
            min={1}
            value={item.quantity}
            onChange={e => updateProduct(item.id, 'quantity', parseInt(e.target.value) || 0)}
          />
        );
      case 'unitPrice':
        return (
          <Input
            className="h-8 text-sm text-right"
            type="number"
            min={0}
            step={0.01}
            value={item.unitPrice}
            onChange={e => updateProduct(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
          />
        );
      case 'lineTotal':
        return (
          <div className="h-8 flex items-center justify-end font-medium text-foreground px-2">
            {formatCurrency(item.total)}
          </div>
        );
      case 'custom':
        return (
          <Input
            className="h-8 text-sm"
            placeholder="—"
            value={item.customValues[col.id] ?? ''}
            onChange={e => updateCustomValue(item.id, col.id, e.target.value)}
          />
        );
      default:
        return null;
    }
  };

  const headerCellClass = (col: LineItemColumn) => {
    if (col.role === 'quantity' || col.role === 'unitPrice' || col.role === 'lineTotal') {
      return 'px-2 py-2 font-medium text-muted-foreground min-w-[88px] align-bottom';
    }
    return 'px-2 py-2 font-medium text-muted-foreground min-w-[100px] align-bottom';
  };

  const isNumericCol = (col: LineItemColumn) =>
    col.role === 'quantity' || col.role === 'unitPrice' || col.role === 'lineTotal';

  const bodyCellClass = (col: LineItemColumn) => {
    const align =
      col.role === 'quantity' || col.role === 'unitPrice' || col.role === 'lineTotal' ? 'text-right' : 'text-left';
    return `px-2 py-2 ${align} align-middle`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Products / Services</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={addCustomColumn} className="text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add column
          </Button>
        </div>
      </div>
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-2 py-2 font-medium text-muted-foreground w-10">#</th>
              {lineItemColumns.map(col => (
                <th key={col.id} className={headerCellClass(col)}>
                  <div className={`flex items-center gap-1 ${isNumericCol(col) ? 'justify-end' : ''}`}>
                    <Input
                      className={`h-7 text-xs font-medium bg-transparent border-border min-w-0 flex-1 ${isNumericCol(col) ? 'text-right max-w-[140px]' : ''}`}
                      value={col.label}
                      onChange={e => updateColumnLabel(col.id, e.target.value)}
                      aria-label={`Column label (${col.role})`}
                    />
                    {col.role === 'custom' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeColumn(col.id)}
                        title="Remove column"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {products.map((item, rowIndex) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-2 py-2 text-muted-foreground text-xs">{rowIndex + 1}</td>
                {lineItemColumns.map(col => (
                  <td key={col.id} className={bodyCellClass(col)}>
                    {renderCell(item, col)}
                  </td>
                ))}
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
