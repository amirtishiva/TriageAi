import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NavBar } from '@/components/ui/tubelight-navbar';
import { Activity, GitBranch, Shield, FileCheck, BookOpen, LogOut, User } from 'lucide-react';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const navItems = [
  { name: 'Workflow', url: '#workflow', icon: GitBranch },
  { name: 'Safety', url: '#safety', icon: Shield },
  { name: 'Compliance', url: '#compliance', icon: FileCheck },
  { name: 'Documentation', url: '#documentation', icon: BookOpen },
];

const sectionIds = navItems.map(item => item.url);

// Role to route mapping
const ROLE_ROUTES: Record<AppRole, string> = {
  nurse: '/nurse',
  charge_nurse: '/nurse',
  physician: '/physician',
  senior_physician: '/physician',
};

export function Navbar() {
  const navigate = useNavigate();
  const activeSection = useScrollSpy(sectionIds, 150);
  const { user, currentRole, signOut, loading } = useAuth();

  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const handleGoToDashboard = () => {
    if (currentRole) {
      navigate(ROLE_ROUTES[currentRole]);
    }
  };

  // Get user initials from email
  const userInitials = user?.email 
    ? user.email.substring(0, 2).toUpperCase() 
    : 'U';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-foreground">TriageAI</span>
        </div>

        {/* Tubelight Nav Items */}
        <nav className="hidden md:flex">
          <NavBar items={navItems} activeSection={activeSection} onItemClick={handleNavClick} />
        </nav>

        {/* Mobile Nav - simplified */}
        <nav className="flex md:hidden">
          <NavBar items={navItems} activeSection={activeSection} onItemClick={handleNavClick} />
        </nav>

        {/* Auth Section */}
        {!loading && (
          <>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                      {userInitials}
                    </div>
                    <span className="hidden sm:inline truncate max-w-[120px]">
                      {user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {currentRole?.replace('_', ' ') || 'No role assigned'}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  {currentRole && (
                    <DropdownMenuItem onClick={handleGoToDashboard}>
                      <User className="h-4 w-4 mr-2" />
                      Go to Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => navigate('/auth')}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Sign In
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
}