import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NavBar } from '@/components/ui/tubelight-navbar';
import { Activity, GitBranch, Shield, FileCheck, BookOpen } from 'lucide-react';

const navItems = [
  { name: 'Workflow', url: '#workflow', icon: GitBranch },
  { name: 'Safety', url: '#safety', icon: Shield },
  { name: 'Compliance', url: '#compliance', icon: FileCheck },
  { name: 'Documentation', url: '#documentation', icon: BookOpen },
];

export function Navbar() {
  const navigate = useNavigate();

  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
          <NavBar items={navItems} onItemClick={handleNavClick} />
        </nav>

        {/* Mobile Nav - simplified */}
        <nav className="flex md:hidden">
          <NavBar items={navItems} onItemClick={handleNavClick} />
        </nav>

        {/* Sign In */}
        <Button
          onClick={() => navigate('/auth')}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Sign In
        </Button>
      </div>
    </header>
  );
}
