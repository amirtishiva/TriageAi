import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Stethoscope, 
  ClipboardList, 
  Users, 
  Bell, 
  Settings,
  Activity,
  FileText,
  LayoutDashboard,
  UserPlus,
  Search,
  Wifi,
  Server,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nurseNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'New Patient', url: '/intake', icon: UserPlus },
  { title: 'Triage', url: '/triage', icon: Stethoscope },
  { title: 'Queue', url: '/queue', icon: Users },
];

const doctorNavItems = [
  { title: 'Track Board', url: '/trackboard', icon: ClipboardList },
  { title: 'My Patients', url: '/my-patients', icon: Activity },
];

const systemNavItems = [
  { title: 'Audit History', url: '/audit', icon: FileText },
  { title: 'Settings', url: '/settings', icon: Settings },
];

function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      {/* Logo Header */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight">ED Triage Pro</span>
              <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">SMART on FHIR</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Nurse Station */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold mb-1">
            Triage Module
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nurseNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                      'h-9 gap-3 px-3 rounded-lg transition-colors',
                      isActive(item.url) 
                        ? 'bg-sidebar-primary/10 text-sidebar-primary border border-sidebar-primary/20' 
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Physician Workbench */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold mb-1">
            Physician
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {doctorNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                      'h-9 gap-3 px-3 rounded-lg transition-colors',
                      isActive(item.url) 
                        ? 'bg-sidebar-primary/10 text-sidebar-primary border border-sidebar-primary/20' 
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold mb-1">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                      'h-9 gap-3 px-3 rounded-lg transition-colors',
                      isActive(item.url) 
                        ? 'bg-sidebar-primary/10 text-sidebar-primary border border-sidebar-primary/20' 
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer - System Status */}
      {!collapsed && (
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="rounded-lg bg-sidebar-accent/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full bg-confidence-high animate-pulse" />
              <span className="text-sidebar-foreground/70">SYSTEM STATUS</span>
            </div>
            <div className="text-[10px] text-sidebar-foreground/50 space-y-1">
              <div className="flex items-center gap-1.5">
                <Wifi className="h-3 w-3" />
                <span>FHIR Endpoint: Connected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Server className="h-3 w-3" />
                <span>AI Model: Triage-v2.4-Active</span>
              </div>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

function AppHeader() {
  const [alertCount] = useState(3);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4">
      {/* Left - Navigation Tabs */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <Button variant="ghost" size="sm" className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
            Main Board
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground">
            Triage
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground">
            Analytics
          </Button>
        </div>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Search Patients, MRN..." 
            className="h-8 w-64 pl-8 text-xs bg-muted/30 border-border/50 focus:bg-muted/50"
          />
        </div>
      </div>

      {/* Right - Status & User */}
      <div className="flex items-center gap-3">
        {/* SMART Sync Badge */}
        <Badge className="h-7 gap-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-semibold">SMART Sync Active</span>
        </Badge>

        {/* Notifications */}
        <button className="relative h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {alertCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-esi-1 text-[9px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Settings */}
        <button className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-foreground">Charge Nurse Miller</p>
            <p className="text-[10px] text-muted-foreground">Logged in: {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            NM
          </div>
        </div>
      </div>
    </header>
  );
}

function StatusBar() {
  return (
    <footer className="h-7 flex items-center justify-between px-4 bg-card/30 border-t border-border text-[10px]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-confidence-high" />
          <span className="text-muted-foreground">EHR CONNECTION: STABLE</span>
        </div>
        <span className="text-muted-foreground/50">HL7 LATENCY: 24MS</span>
      </div>
      <div className="flex items-center gap-4 text-muted-foreground">
        <span>SMART ON FHIR V2.4.0</span>
        <span>•</span>
        <span className="font-mono">{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} — {new Date().toLocaleTimeString()}</span>
      </div>
    </footer>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4">
            <Outlet />
          </main>
          <StatusBar />
        </div>
      </div>
    </SidebarProvider>
  );
}
