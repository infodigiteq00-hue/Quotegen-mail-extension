import { AddProductForm } from '@/components/quotation/workspace/product-tab/AddProductForm';
import { ProductCatalogTable } from '@/components/quotation/workspace/product-tab/ProductCatalogTable';
import type { EditingProductDraft, ProductCatalogItem, ProductFormState } from '@/modules/quotation/types';
import type { ChangeEvent } from 'react';

interface ProductTabSectionProps {
  productForm: ProductFormState;
  productCatalogItems: ProductCatalogItem[];
  editingProductCatalogId: string | null;
  editingProductDraft: EditingProductDraft | null;
  onUpdateProductForm: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void;
  onProductImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAddProductCatalogItem: () => void;
  onEditProductCatalogItem: (item: ProductCatalogItem) => void;
  onDeleteProductCatalogItem: (item: ProductCatalogItem) => void;
  onSaveInlineProductEdit: () => void;
  onCancelProductEdit: () => void;
  onUpdateEditingProductDraft: <K extends keyof EditingProductDraft>(key: K, value: EditingProductDraft[K]) => void;
  onInlineProductImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function ProductTabSection({
  productForm,
  productCatalogItems,
  editingProductCatalogId,
  editingProductDraft,
  onUpdateProductForm,
  onProductImageChange,
  onAddProductCatalogItem,
  onEditProductCatalogItem,
  onDeleteProductCatalogItem,
  onSaveInlineProductEdit,
  onCancelProductEdit,
  onUpdateEditingProductDraft,
  onInlineProductImageChange,
}: ProductTabSectionProps) {
  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Product Tab</h2>
        <AddProductForm
          productForm={productForm}
          onUpdateForm={onUpdateProductForm}
          onImageChange={onProductImageChange}
          onAddProduct={onAddProductCatalogItem}
        />
        <ProductCatalogTable
          items={productCatalogItems}
          editingProductCatalogId={editingProductCatalogId}
          editingProductDraft={editingProductDraft}
          onEditItem={onEditProductCatalogItem}
          onDeleteItem={onDeleteProductCatalogItem}
          onSaveEdit={onSaveInlineProductEdit}
          onCancelEdit={onCancelProductEdit}
          onUpdateEditingDraft={onUpdateEditingProductDraft}
          onInlineImageChange={onInlineProductImageChange}
        />
      </div>
    </div>
  );
}
