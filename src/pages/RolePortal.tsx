import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Stethoscope, 
  Activity,
  Heart,
  ArrowRight,
  LogIn,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeAlerts } from '@/integrations/supabase/hooks';

interface RoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  accentColor: 'nurse' | 'physician';
  onClick: () => void;
}

function RoleCard({ title, description, icon, features, accentColor, onClick }: RoleCardProps) {
  const colorStyles = {
    nurse: {
      border: 'hover:border-clinical-cyan/50',
      iconBg: 'bg-clinical-cyan/10 text-clinical-cyan',
      button: 'bg-clinical-cyan hover:bg-clinical-cyan/90 text-primary-foreground',
      accent: 'text-clinical-cyan',
    },
    physician: {
      border: 'hover:border-purple-500/50',
      iconBg: 'bg-purple-500/10 text-purple-400',
      button: 'bg-purple-600 hover:bg-purple-700 text-white',
      accent: 'text-purple-400',
    },
  };

  const styles = colorStyles[accentColor];

  return (
    <Card 
      className={cn(
        'clinical-card group cursor-pointer transition-all duration-300',
        'hover:shadow-lg hover:shadow-primary/5',
        styles.border
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className={cn('p-3 rounded-xl', styles.iconBg)}>
            {icon}
          </div>
        </div>
        <CardTitle className="text-xl mt-4">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={cn('h-1.5 w-1.5 rounded-full', styles.iconBg.replace('text-', 'bg-').split(' ')[0])} />
              {feature}
            </li>
          ))}
        </ul>
        <Button 
          className={cn('w-full gap-2 group-hover:gap-3 transition-all', styles.button)}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Enter {title}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function RolePortal() {
  const navigate = useNavigate();
  const { user, currentRole, signOut, loading } = useAuth();

  // Enable real-time alerts for authenticated users
  useRealtimeAlerts(user?.id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">MedTriage AI</h1>
                <p className="text-xs text-muted-foreground">Clinical Decision Support System</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="text-sm text-right">
                    <p className="font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {currentRole?.replace('_', ' ') || 'No role assigned'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => signOut()}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl space-y-8 animate-fade-in-up">
          {/* Welcome Section */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Welcome to MedTriage AI</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Select your role to access the appropriate clinical interface
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <RoleCard
              title="Nurse Station"
              description="Patient intake, triage assessment, and queue management"
              icon={<Heart className="h-6 w-6" />}
              features={[
                'Register new patients',
                'Perform AI-assisted triage',
                'Manage patient queue',
                'View dashboard analytics',
              ]}
              accentColor="nurse"
              onClick={() => navigate('/nurse')}
            />

            <RoleCard
              title="Physician Workbench"
              description="Case review, patient management, and clinical oversight"
              icon={<Stethoscope className="h-6 w-6" />}
              features={[
                'Track board overview',
                'Review assigned patients',
                'Acknowledge critical cases',
                'View audit logs',
              ]}
              accentColor="physician"
              onClick={() => navigate('/physician')}
            />
          </div>

          {/* Footer Info */}
          <div className="text-center text-xs text-muted-foreground pt-4">
            <p>Emergency Department • Real-time Clinical Decision Support</p>
          </div>
        </div>
      </main>
    </div>
  );
}
