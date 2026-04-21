import { FileClock, FilePlus2, LogOut, PackagePlus } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { APP_LOGO_SRC } from '@/modules/quotation/constants';
import { SidebarMenuItem } from '@/components/quotation/workspace/sidebar/SidebarMenuItem';
import type { SidebarSection } from '@/modules/quotation/types';

interface UserSummary {
  name?: string;
  email?: string;
}

interface AppSidebarProps {
  activeSection: SidebarSection;
  currentUser: UserSummary | null;
  onNavigate: (section: SidebarSection) => void;
  onLogout: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function AppSidebar({
  activeSection,
  currentUser,
  onNavigate,
  onLogout,
  onMouseEnter,
  onMouseLeave,
}: AppSidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <img
            src={APP_LOGO_SRC}
            alt="QuoteGen logo"
            className="h-8 w-8 shrink-0 rounded-md ring-1 ring-white/40 object-contain group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7"
          />
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold text-sidebar-foreground">QuoteGen</p>
            <p className="text-xs text-sidebar-foreground/70">Quotation Generator</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-2">
          <SidebarMenu className="gap-2">
            <SidebarMenuItem
              label="Generate Quote"
              icon={FilePlus2}
              isActive={activeSection === 'generate-quote'}
              onClick={() => onNavigate('generate-quote')}
            />
            <SidebarMenuItem
              label="Quotation History"
              icon={FileClock}
              isActive={activeSection === 'quotation-history'}
              onClick={() => onNavigate('quotation-history')}
            />
            <SidebarMenuItem
              label="Product Tab"
              icon={PackagePlus}
              isActive={activeSection === 'product-tab'}
              onClick={() => onNavigate('product-tab')}
            />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 pt-2">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 group-data-[collapsible=icon]:px-1.5">
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-xs text-sidebar-foreground/70">Logged in as</p>
            <p className="truncate text-sm font-medium text-sidebar-foreground">{currentUser?.name ?? 'User'}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{currentUser?.email ?? ''}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex h-10 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium text-black transition-none group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
