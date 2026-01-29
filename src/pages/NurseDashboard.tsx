import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ESIBadge } from '@/components/triage/ESIBadge';
import { PatientCard } from '@/components/triage/PatientCard';
import { mockPatients, mockTriageCases, mockAlerts, getWaitingPatients, getInTriagePatients } from '@/data/mockData';
import { 
  Activity, 
  Clock, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  UserPlus,
  Stethoscope,
  Bell,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ESILevel, Alert } from '@/types/triage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  variant?: 'default' | 'warning' | 'critical';
}

function StatCard({ title, value, subtitle, icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'border-border',
    warning: 'border-esi-2/30 bg-esi-2-bg',
    critical: 'border-esi-1/30 bg-esi-1-bg',
  };

  return (
    <Card className={cn('clinical-card', variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold font-vitals mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            'p-2 rounded-lg',
            variant === 'default' && 'bg-muted text-muted-foreground',
            variant === 'warning' && 'bg-esi-2/10 text-esi-2',
            variant === 'critical' && 'bg-esi-1/10 text-esi-1',
          )}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            <TrendingUp className={cn('h-3 w-3', trend.isPositive ? 'text-confidence-high' : 'text-esi-1')} />
            <span className={trend.isPositive ? 'text-confidence-high' : 'text-esi-1'}>
              {trend.value}% vs last hour
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ActiveAlertBannerProps {
  alerts: Alert[];
  onViewAlerts: () => void;
}

function ActiveAlertBanner({ alerts, onViewAlerts }: ActiveAlertBannerProps) {
  const criticalAlerts = alerts.filter(a => a.esiLevel <= 2 && !a.acknowledgedAt);

  if (criticalAlerts.length === 0) return null;

  return (
    <div className="alert-banner-critical pulse-critical">
      <div className="p-2 rounded-full bg-esi-1/20">
        <Bell className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold">
          {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''} Pending
        </h3>
        <p className="text-sm opacity-80">
          ESI Level 1-2 cases require immediate attention
        </p>
      </div>
      <Button 
        variant="destructive" 
        size="sm" 
        className="gap-2"
        onClick={onViewAlerts}
      >
        View Alerts
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ESIDistribution() {
  // Calculate actual distribution from mock data
  const distribution = useMemo(() => {
    const dist: Record<ESILevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    mockTriageCases.forEach(triageCase => {
      const esiLevel = triageCase.validation?.validatedESI || triageCase.aiResult?.draftESI;
      if (esiLevel) {
        dist[esiLevel]++;
      }
    });
    
    // Also count patients without triage cases
    mockPatients.forEach(patient => {
      const hasCase = mockTriageCases.some(c => c.patient.id === patient.id);
      if (!hasCase && patient.status === 'waiting') {
        // Count as unassigned (don't add to ESI counts)
      }
    });
    
    return dist;
  }, []);

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <Card className="clinical-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Current ESI Distribution</CardTitle>
          <CardDescription>Active cases by severity level</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No active cases
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="clinical-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Current ESI Distribution</CardTitle>
        <CardDescription>Active cases by severity level</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {([1, 2, 3, 4, 5] as ESILevel[]).map((level) => {
            const count = distribution[level];
            const percentage = total > 0 ? (count / total) * 100 : 0;
            
            return (
              <div key={level} className="flex items-center gap-3">
                <ESIBadge level={level} size="sm" />
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        level === 1 && 'bg-esi-1',
                        level === 2 && 'bg-esi-2',
                        level === 3 && 'bg-esi-3',
                        level === 4 && 'bg-esi-4',
                        level === 5 && 'bg-esi-5',
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <span className="font-vitals text-sm font-medium w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function NurseDashboard() {
  const navigate = useNavigate();
  const waitingPatients = getWaitingPatients();
  const inTriagePatients = getInTriagePatients();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);

  const criticalAlerts = mockAlerts.filter(a => a.esiLevel <= 2 && !a.acknowledgedAt);
  const criticalCasesCount = mockTriageCases.filter(c => {
    const esi = c.validation?.validatedESI || c.aiResult?.draftESI;
    return esi && esi <= 2;
  }).length;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nurse Dashboard</h1>
          <p className="text-muted-foreground">
            {currentTime.toLocaleDateString(undefined, { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            <span className="mx-2">•</span>
            <span className="font-vitals">{currentTime.toLocaleTimeString()}</span>
          </p>
        </div>
        <Button onClick={() => navigate('/nurse/intake')} className="gap-2">
          <UserPlus className="h-4 w-4" />
          New Patient
        </Button>
      </div>

      {/* Active Alerts */}
      <ActiveAlertBanner 
        alerts={mockAlerts} 
        onViewAlerts={() => setShowAlertsDialog(true)} 
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Waiting Patients"
          value={waitingPatients.length}
          subtitle="In lobby"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="In Triage"
          value={inTriagePatients.length}
          subtitle="Currently being assessed"
          icon={<Stethoscope className="h-5 w-5" />}
        />
        <StatCard
          title="Avg Wait Time"
          value="18 min"
          subtitle="Target: < 15 min"
          icon={<Clock className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="Critical Cases"
          value={criticalCasesCount}
          subtitle="ESI 1-2 pending"
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={criticalCasesCount > 0 ? "critical" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting Patients */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Patients Waiting for Triage</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/nurse/queue')}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {waitingPatients.length === 0 ? (
            <Card className="clinical-card">
              <CardContent className="p-8 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No patients waiting</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {waitingPatients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  showActions
                  actionLabel="Start Triage"
                  onAction={() => navigate(`/nurse/triage/${patient.id}`)}
                />
              ))}
            </div>
          )}

          {/* In-Triage Section */}
          {inTriagePatients.length > 0 && (
            <>
              <h2 className="text-lg font-semibold mt-6">Currently in Triage</h2>
              <div className="space-y-3">
                {inTriagePatients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    showActions
                    actionLabel="Continue"
                    onAction={() => navigate(`/nurse/triage/${patient.id}`)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ESIDistribution />

          {/* Quick Actions */}
          <Card className="clinical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => navigate('/nurse/intake')}
              >
                <UserPlus className="h-4 w-4" />
                Register New Patient
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => navigate('/nurse/queue')}
              >
                <Users className="h-4 w-4" />
                View Full Queue
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => navigate('/physician/audit')}
              >
                <Activity className="h-4 w-4" />
                View Audit Logs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts Dialog */}
      <Dialog open={showAlertsDialog} onOpenChange={setShowAlertsDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-esi-1" />
              Critical Alerts
            </DialogTitle>
            <DialogDescription>
              ESI Level 1-2 cases requiring immediate attention
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {criticalAlerts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No pending critical alerts
              </p>
            ) : (
              criticalAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="p-4 rounded-lg border border-esi-1/30 bg-esi-1-bg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ESIBadge level={alert.esiLevel} size="sm" />
                      <span className="font-medium">
                        {alert.patient.lastName}, {alert.patient.firstName}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((Date.now() - alert.createdAt.getTime()) / 60000)} min ago
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      setShowAlertsDialog(false);
                      navigate(`/nurse/triage/${alert.patient.id}`);
                    }}
                  >
                    Review Case
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
