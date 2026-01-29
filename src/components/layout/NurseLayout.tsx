import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Bell, 
  LayoutDashboard,
  UserPlus,
  Stethoscope,
  Users,
  LogOut,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const nurseNavItems = [
  { title: 'Dashboard', url: '/nurse', icon: LayoutDashboard },
  { title: 'New Patient', url: '/nurse/intake', icon: UserPlus },
  { title: 'Active Triage', url: '/nurse/triage', icon: Stethoscope },
  { title: 'Patient Queue', url: '/nurse/queue', icon: Users },
];

function NurseSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/nurse') {
      return location.pathname === '/nurse';
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-clinical-cyan text-primary-foreground">
            <Heart className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Nurse Station</span>
              <span className="text-xs text-sidebar-foreground/60">Triage & Intake</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Clinical Workflow
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nurseNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-clinical-cyan/10 text-clinical-cyan font-medium border-l-2 border-clinical-cyan"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild
              tooltip="Switch Role"
            >
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent w-full"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm">Switch Role</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild
              tooltip="Sign Out"
            >
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive w-full"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm">Sign Out</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function NurseHeader() {
  const [alertCount] = useState(2);
  const { user, zone } = useAuth();

  // Get user initials from email
  const userInitials = user?.email 
    ? user.email.substring(0, 2).toUpperCase() 
    : 'NA';

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" aria-label="Toggle sidebar" />
        <div className="hidden sm:flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-clinical-cyan animate-pulse" />
          <h2 className="text-sm font-medium text-muted-foreground">
            Nurse Station Active {zone && `• Zone ${zone}`}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          className="relative rounded-full p-2 hover:bg-muted transition-colors"
          aria-label={`Notifications: ${alertCount} unread alerts`}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {alertCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-esi-1 text-[10px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 rounded-full bg-clinical-cyan/10 px-3 py-1.5 border border-clinical-cyan/20">
          <div className="h-6 w-6 rounded-full bg-clinical-cyan flex items-center justify-center text-primary-foreground text-xs font-medium">
            {userInitials}
          </div>
          <span className="text-sm font-medium hidden sm:block text-clinical-cyan truncate max-w-[150px]">
            {user?.email || 'Nurse'}
          </span>
        </div>
      </div>
    </header>
  );
}

export default function NurseLayout() {
  const { session, loading, hasRole } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth', { replace: true });
    }
  }, [session, loading, navigate]);

  // Redirect if user doesn't have nurse role
  useEffect(() => {
    if (!loading && session && !hasRole('nurse') && !hasRole('charge_nurse')) {
      navigate('/', { replace: true });
    }
  }, [session, loading, hasRole, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-clinical-cyan" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content until authenticated
  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <NurseSidebar />
        <div className="flex flex-1 flex-col">
          <NurseHeader />
          <main className="flex-1 overflow-auto bg-background p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
