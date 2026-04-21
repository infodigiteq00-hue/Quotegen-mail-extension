import { TEMPLATES } from '@/types/quotation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TemplateSelectorProps {
  selectedTemplate: string;
  selectedTemplateLabel: string;
  onTemplateChange: (value: string) => void;
  compact?: boolean;
}

export function TemplateSelector({
  selectedTemplate,
  selectedTemplateLabel,
  onTemplateChange,
  compact = false,
}: TemplateSelectorProps) {
  return (
    <Select value={selectedTemplate} onValueChange={onTemplateChange}>
      <SelectTrigger
        className={
          compact
            ? 'h-10 w-full'
            : 'h-9 w-[min(15rem,calc(100vw-22rem))] min-w-[11rem] shrink-0 gap-2 px-3 text-left text-xs font-medium sm:text-sm'
        }
        aria-label="Quotation template"
      >
        <SelectValue placeholder="Template">{selectedTemplateLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4} className="z-[100] max-w-[min(20rem,calc(100vw-2rem))]">
        {TEMPLATES.map(template => (
          <SelectItem
            key={template.id}
            value={template.id}
            textValue={`${template.name} ${template.description}`}
            className="cursor-pointer"
          >
            <div className="flex w-full min-w-0 flex-col gap-1 py-0.5 pr-1">
              <span className="text-sm font-medium leading-snug text-foreground">{template.name}</span>
              <span className="text-xs leading-normal text-muted-foreground">{template.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
