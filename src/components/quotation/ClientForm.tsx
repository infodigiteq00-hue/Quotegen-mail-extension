import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ClientDetails } from '@/types/quotation';

interface ClientFormProps {
  client: ClientDetails;
  onChange: (client: ClientDetails) => void;
}

export default function ClientForm({ client, onChange }: ClientFormProps) {
  const update = (field: keyof ClientDetails, value: string) =>
    onChange({ ...client, [field]: value });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Client Details</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="client-name" className="text-xs text-muted-foreground">Contact Name</Label>
          <Input id="client-name" placeholder="John Smith" value={client.name} onChange={e => update('name', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="client-company" className="text-xs text-muted-foreground">Company</Label>
          <Input id="client-company" placeholder="Acme Corp" value={client.company} onChange={e => update('company', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="client-address" className="text-xs text-muted-foreground">Address</Label>
        <Input id="client-address" placeholder="123 Business St, City, State 10001" value={client.address} onChange={e => update('address', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="client-email" className="text-xs text-muted-foreground">Email</Label>
          <Input id="client-email" type="email" placeholder="john@acme.com" value={client.email} onChange={e => update('email', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="client-phone" className="text-xs text-muted-foreground">Phone</Label>
          <Input id="client-phone" placeholder="+1 (555) 000-0000" value={client.phone} onChange={e => update('phone', e.target.value)} />
        </div>
      </div>
    </div>
  );
}
