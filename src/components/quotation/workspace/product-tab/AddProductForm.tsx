import { PackagePlus } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProductFormState } from '@/modules/quotation/types';

interface AddProductFormProps {
  productForm: ProductFormState;
  onUpdateForm: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAddProduct: () => void;
}

export function AddProductForm({ productForm, onUpdateForm, onImageChange, onAddProduct }: AddProductFormProps) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Product Name</Label>
          <Input
            value={productForm.productName}
            onChange={event => onUpdateForm('productName', event.target.value)}
            placeholder="Enter product name"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Product ID</Label>
          <Input
            value={productForm.productId}
            onChange={event => onUpdateForm('productId', event.target.value)}
            placeholder="Enter product id"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs text-muted-foreground">Product Description</Label>
          <Textarea
            value={productForm.productDescription}
            onChange={event => onUpdateForm('productDescription', event.target.value)}
            placeholder="Enter product description"
            className="min-h-[72px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Product Material</Label>
          <Input
            value={productForm.productMaterial}
            onChange={event => onUpdateForm('productMaterial', event.target.value)}
            placeholder="Enter product material"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Product Image</Label>
          <Input type="file" accept="image/*" onChange={onImageChange} />
        </div>
      </div>

      <Button onClick={onAddProduct}>
        <PackagePlus className="h-4 w-4" />
        Add Product
      </Button>
    </>
  );
}
