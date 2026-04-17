import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Settings, Upload, X } from 'lucide-react';
import type { CompanyBranding } from '@/types/quotation';
import { useToast } from '@/hooks/use-toast';

interface Props {
  branding: CompanyBranding;
  onChange: (b: CompanyBranding) => void;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export default function BrandingSettings({ branding, onChange }: Props) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const letterheadInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const update = <K extends keyof CompanyBranding>(key: K, value: CompanyBranding[K]) =>
    onChange({ ...branding, [key]: value });

  const readAsDataUrl = (file: File, key: 'logoDataUrl' | 'letterheadDataUrl') => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload a PNG or JPG image.', variant: 'destructive' });
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

        <div className="space-y-4 py-2">
          {/* Theme Color */}
          <div className="space-y-1">
            <Label className="text-xs">Theme Color (header & accents)</Label>
            <div className="flex gap-2 items-center">
              <Input type="color" value={branding.themeColor} onChange={e => update('themeColor', e.target.value)} className="w-16 h-9 p-1 cursor-pointer" />
              <Input value={branding.themeColor} onChange={e => update('themeColor', e.target.value)} className="font-mono text-sm" />
            </div>
          </div>

          {/* Logo upload */}
          <div className="space-y-1">
            <Label className="text-xs">Company Logo (PNG/JPG)</Label>
            <div className="flex items-center gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={e => e.target.files?.[0] && readAsDataUrl(e.target.files[0], 'logoDataUrl')}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Upload Logo
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

          {/* Header info */}
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

          {/* Footer text */}
          <div className="space-y-1">
            <Label className="text-xs">Footer Text</Label>
            <Textarea value={branding.footerText} onChange={e => update('footerText', e.target.value)} className="min-h-[60px] text-sm" />
          </div>

          {/* Custom letterhead */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Custom Letterhead</Label>
                <p className="text-xs text-muted-foreground">Use your own A4 background image. Hides default header & footer.</p>
              </div>
              <Switch
                checked={branding.useLetterhead}
                onCheckedChange={v => update('useLetterhead', v)}
                disabled={!branding.letterheadDataUrl}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={letterheadInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={e => e.target.files?.[0] && readAsDataUrl(e.target.files[0], 'letterheadDataUrl')}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => letterheadInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Upload Letterhead
              </Button>
              {branding.letterheadDataUrl && (
                <>
                  <img src={branding.letterheadDataUrl} alt="letterhead" className="h-12 w-auto rounded border bg-white" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => { update('letterheadDataUrl', ''); update('useLetterhead', false); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => {
            // Quick close — Dialog primitive auto-closes parent on outside click; here we just provide an action
          }}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
