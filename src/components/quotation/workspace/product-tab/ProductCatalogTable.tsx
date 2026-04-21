import { Pencil, Trash2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EditingProductDraft, ProductCatalogItem } from '@/modules/quotation/types';
import { formatCurrency } from '@/utils/quotation';

interface ProductCatalogTableProps {
  items: ProductCatalogItem[];
  editingProductCatalogId: string | null;
  editingProductDraft: EditingProductDraft | null;
  onEditItem: (item: ProductCatalogItem) => void;
  onDeleteItem: (item: ProductCatalogItem) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onUpdateEditingDraft: <K extends keyof EditingProductDraft>(key: K, value: EditingProductDraft[K]) => void;
  onInlineImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function ProductCatalogTable({
  items,
  editingProductCatalogId,
  editingProductDraft,
  onEditItem,
  onDeleteItem,
  onSaveEdit,
  onCancelEdit,
  onUpdateEditingDraft,
  onInlineImageChange,
}: ProductCatalogTableProps) {
  return (
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
          {items.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                Add a product to see it listed here.
              </td>
            </tr>
          ) : (
            items.map(item => {
              const finalOffer = item.quantity * item.unitPrice - item.discount;
              const isEditingRow = editingProductCatalogId === item.id && !!editingProductDraft;
              return (
                <tr key={item.id} className="align-top">
                  <td className="px-3 py-4 text-foreground">
                    {isEditingRow ? (
                      <Input
                        value={editingProductDraft.productName}
                        onChange={event => onUpdateEditingDraft('productName', event.target.value)}
                        className="mb-3 h-8"
                      />
                    ) : (
                      <p className="mb-3 font-medium uppercase">{item.productName}</p>
                    )}
                    <div className="flex h-32 w-32 items-center justify-center bg-muted text-xs text-muted-foreground">
                      {isEditingRow ? (
                        <div className="flex h-full w-full flex-col gap-1 p-1">
                          <Input type="file" accept="image/*" className="h-8 text-[10px]" onChange={onInlineImageChange} />
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
                        <img src={item.productImageDataUrl} alt={item.productName} className="h-full w-full object-cover" />
                      ) : (
                        'PRODUCT IMAGE'
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-foreground">
                    {isEditingRow ? (
                      <Input
                        value={editingProductDraft.productId}
                        onChange={event => onUpdateEditingDraft('productId', event.target.value)}
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
                        onChange={event => onUpdateEditingDraft('productMaterial', event.target.value)}
                        className="h-8"
                      />
                    ) : (
                      item.productMaterial || '-'
                    )}
                  </td>
                  <td className="whitespace-pre-wrap px-3 py-4 text-foreground">
                    {isEditingRow ? (
                      <Textarea
                        value={editingProductDraft.productDescription}
                        onChange={event => onUpdateEditingDraft('productDescription', event.target.value)}
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
                        onChange={event => onUpdateEditingDraft('quantity', Math.max(0, parseInt(event.target.value, 10) || 0))}
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
                        onChange={event =>
                          onUpdateEditingDraft('unitPrice', Math.max(0, parseFloat(event.target.value) || 0))
                        }
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
                        onChange={event =>
                          onUpdateEditingDraft('discount', Math.max(0, parseFloat(event.target.value) || 0))
                        }
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
                          <Button type="button" size="sm" onClick={onSaveEdit}>
                            Save
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={onCancelEdit}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditItem(item)}
                            aria-label="Edit product"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteItem(item)}
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
  );
}
