import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';

const navItems = [
  { label: 'Workflow', href: '#workflow' },
  { label: 'Safety', href: '#safety' },
  { label: 'Compliance', href: '#compliance' },
  { label: 'Documentation', href: '#documentation' },
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

        {/* Nav Items */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.href)}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </button>
          ))}
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
