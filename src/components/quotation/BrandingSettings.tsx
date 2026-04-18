import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Settings, Upload, X } from 'lucide-react';
import type { CompanyBranding } from '@/types/quotation';
import { useToast } from '@/hooks/use-toast';

interface Props {
  branding: CompanyBranding;
  onChange: (b: CompanyBranding) => void;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

/** File picker + validation: only PNG and JPEG */
const IMAGE_ACCEPT = 'image/png,image/jpeg,.png,.jpg,.jpeg';
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg']);

type BrandingImageKey = 'logoDataUrl' | 'headerImageDataUrl' | 'footerImageDataUrl' | 'letterheadDataUrl';

function isAllowedPngOrJpg(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg');
}

export default function BrandingSettings({ branding, onChange }: Props) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const headerImageInputRef = useRef<HTMLInputElement>(null);
  const footerImageInputRef = useRef<HTMLInputElement>(null);
  const letterheadInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const update = <K extends keyof CompanyBranding>(key: K, value: CompanyBranding[K]) =>
    onChange({ ...branding, [key]: value });

  const readAsDataUrl = (file: File, key: BrandingImageKey) => {
    if (!isAllowedPngOrJpg(file)) {
      toast({ title: 'Invalid file', description: 'Only PNG or JPG images are allowed.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: 'File too large', description: 'Max 2MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update(key, reader.result as string);
    reader.readAsDataURL(file);
  };

  const fileInputProps = {
    type: 'file' as const,
    accept: IMAGE_ACCEPT,
    className: 'hidden' as const,
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" /> Branding
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Company Branding</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Step 1 — manual fields */}
          <section className="space-y-4" aria-labelledby="branding-text-heading">
            <div>
              <h3 id="branding-text-heading" className="text-sm font-semibold text-foreground">
                Company details & colors
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Type these in — they appear on the quotation (unless covered by a full letterhead).</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Theme Color (header & accents)</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" value={branding.themeColor} onChange={e => update('themeColor', e.target.value)} className="w-16 h-9 p-1 cursor-pointer" />
                <Input value={branding.themeColor} onChange={e => update('themeColor', e.target.value)} className="font-mono text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Company Name</Label>
              <Input value={branding.companyName} onChange={e => update('companyName', e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Address Line</Label>
              <Input value={branding.addressLine} onChange={e => update('addressLine', e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact Line (email | phone)</Label>
              <Input value={branding.contactLine} onChange={e => update('contactLine', e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Footer Text</Label>
              <Textarea value={branding.footerText} onChange={e => update('footerText', e.target.value)} className="min-h-[60px] text-sm" />
            </div>
          </section>

          {/* Step 2 — uploads */}
          <section className="space-y-4 border-t pt-4" aria-labelledby="branding-images-heading">
            <div>
              <h3 id="branding-images-heading" className="text-sm font-semibold text-foreground">
                Images
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">PNG or JPG only, max 2MB each.</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Company Logo</Label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={logoInputRef}
                  {...fileInputProps}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) readAsDataUrl(f, 'logoDataUrl');
                    e.target.value = '';
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Upload logo
                </Button>
                {branding.logoDataUrl && (
                  <>
                    <img src={branding.logoDataUrl} alt="logo" className="h-9 w-auto rounded border bg-white p-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => update('logoDataUrl', '')}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-border/80 bg-muted/30 p-3">
              <div>
                <Label className="text-xs font-medium">Page header & footer banners</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Optional strips at top and bottom. Used when Custom Letterhead is off.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Header image</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={headerImageInputRef}
                    {...fileInputProps}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) readAsDataUrl(f, 'headerImageDataUrl');
                      e.target.value = '';
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => headerImageInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" /> Upload header
                  </Button>
                  {branding.headerImageDataUrl && (
                    <>
                      <img src={branding.headerImageDataUrl} alt="Header preview" className="h-12 max-w-[200px] object-contain rounded border bg-white" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => update('headerImageDataUrl', '')} title="Remove header image">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Footer image</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={footerImageInputRef}
                    {...fileInputProps}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) readAsDataUrl(f, 'footerImageDataUrl');
                      e.target.value = '';
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => footerImageInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" /> Upload footer
                  </Button>
                  {branding.footerImageDataUrl && (
                    <>
                      <img src={branding.footerImageDataUrl} alt="Footer preview" className="h-12 max-w-[200px] object-contain rounded border bg-white" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => update('footerImageDataUrl', '')} title="Remove footer image">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-border/80 bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-xs font-medium">Custom Letterhead</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Full-page A4 background. When on, header/footer banners above are hidden in the preview.</p>
                </div>
                <Switch
                  checked={branding.useLetterhead}
                  onCheckedChange={v => update('useLetterhead', v)}
                  disabled={!branding.letterheadDataUrl}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={letterheadInputRef}
                  {...fileInputProps}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) readAsDataUrl(f, 'letterheadDataUrl');
                    e.target.value = '';
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => letterheadInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Upload letterhead
                </Button>
                {branding.letterheadDataUrl && (
                  <>
                    <img src={branding.letterheadDataUrl} alt="letterhead" className="h-12 w-auto rounded border bg-white" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        update('letterheadDataUrl', '');
                        update('useLetterhead', false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
