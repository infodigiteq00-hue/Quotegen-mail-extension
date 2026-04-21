import { SidebarMenuButton, SidebarMenuItem as SidebarMenuItemRoot } from '@/components/ui/sidebar';
import type { LucideIcon } from 'lucide-react';

interface SidebarMenuItemProps {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}

export function SidebarMenuItem({ label, icon: Icon, isActive, onClick }: SidebarMenuItemProps) {
  return (
    <SidebarMenuItemRoot>
      <SidebarMenuButton className="h-10 rounded-lg px-2" isActive={isActive} tooltip={label} onClick={onClick}>
        <Icon />
        <span className="group-data-[collapsible=icon]:hidden">{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItemRoot>
  );
}
