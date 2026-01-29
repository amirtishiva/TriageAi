import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ESIBadge } from '@/components/triage/ESIBadge';
import { PatientCard } from '@/components/triage/PatientCard';
import { mockPatients, mockTriageCases, mockAlerts, getWaitingPatients, getInTriagePatients } from '@/data/mockData';
import { 
  Users, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown,
  UserPlus,
  Stethoscope,
  Bell,
  ChevronRight,
  Clock,
  Activity,
  Filter,
  Columns,
  Bed
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ESILevel, Alert } from '@/types/triage';

// Stats Card Component - Based on reference image 3
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; direction: 'up' | 'down' };
  trendLabel?: string;
  variant?: 'default' | 'warning' | 'critical';
}

function StatCard({ title, value, subtitle, icon, trend, trendLabel, variant = 'default' }: StatCardProps) {
  return (
    <Card className={cn(
      'clinical-card border-t-2',
      variant === 'default' && 'border-t-primary/50',
      variant === 'warning' && 'border-t-esi-2',
      variant === 'critical' && 'border-t-esi-1',
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </span>
          <span className="opacity-50">{icon}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn(
            'font-vitals text-3xl font-bold',
            variant === 'critical' && 'text-esi-1',
            variant === 'warning' && 'text-esi-2',
          )}>
            {value}
          </span>
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3 text-esi-2" />
            ) : (
              <TrendingDown className="h-3 w-3 text-confidence-high" />
            )}
            <span className={cn(
              'text-xs font-medium',
              trend.direction === 'up' ? 'text-esi-2' : 'text-confidence-high'
            )}>
              {trend.direction === 'up' ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Active Escalation Card - Based on reference image 3
interface EscalationCardProps {
  type: 'critical' | 'warning' | 'info';
  title: string;
  subtitle: string;
  patientName: string;
  provider: string;
  timeLabel: string;
  onAction?: () => void;
  actionLabel?: string;
}

function EscalationCard({ 
  type, 
  title, 
  subtitle, 
  patientName, 
  provider,
  timeLabel,
  onAction,
  actionLabel = 'NOTIFY PROVIDER'
}: EscalationCardProps) {
  return (
    <div className={cn(
      'rounded-lg border p-3',
      type === 'critical' && 'bg-esi-1-bg border-esi-1/30',
      type === 'warning' && 'bg-esi-2-bg border-esi-2/30',
      type === 'info' && 'bg-muted/30 border-border',
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {type === 'critical' && <div className="h-2 w-2 rounded-full bg-esi-1 animate-pulse" />}
          {type === 'warning' && <AlertTriangle className="h-4 w-4 text-esi-2" />}
          {type === 'info' && <Bell className="h-4 w-4 text-muted-foreground" />}
          <span className={cn(
            'text-xs font-semibold',
            type === 'critical' && 'text-esi-1',
            type === 'warning' && 'text-esi-2',
          )}>
            {title}
          </span>
        </div>
        <Badge variant="outline" className={cn(
          'text-[9px] font-bold',
          type === 'critical' && 'border-esi-1/30 text-esi-1',
          type === 'warning' && 'border-esi-2/30 text-esi-2',
        )}>
          {timeLabel}
        </Badge>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">{subtitle}</p>
      <div className="text-xs space-y-0.5 mb-3">
        <p>Patient: <span className="font-medium">{patientName} ({location})</span></p>
        <p>Provider: <span className="text-muted-foreground">{provider}</span></p>
      </div>
      <Button 
        size="sm" 
        className={cn(
          'w-full h-7 text-xs font-semibold',
          type === 'critical' && 'bg-esi-1 hover:bg-esi-1/90',
          type === 'warning' && 'bg-esi-2 hover:bg-esi-2/90 text-foreground',
        )}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

// Zone Filter Chips
function ZoneFilters({ activeZone, onZoneChange }: { activeZone: string; onZoneChange: (zone: string) => void }) {
  const zones = ['All Zones', 'Pod A', 'Pod B', 'Fast Track', 'Pediatric'];
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">ZONE FILTER:</span>
      <div className="flex gap-1">
        {zones.map((zone) => (
          <Button
            key={zone}
            variant={activeZone === zone ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-7 px-3 text-xs',
              activeZone === zone && 'bg-primary text-primary-foreground'
            )}
            onClick={() => onZoneChange(zone)}
          >
            {zone}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function NurseDashboard() {
  const navigate = useNavigate();
  const waitingPatients = getWaitingPatients();
  const inTriagePatients = getInTriagePatients();
  const [activeZone, setActiveZone] = useState('All Zones');

  // Get ESI level for display
  const getPatientESI = (patientId: string): ESILevel | undefined => {
    const triageCase = mockTriageCases.find(c => c.patient.id === patientId);
    return triageCase?.validation?.validatedESI || triageCase?.aiResult?.draftESI;
  };

  return (
    <div className="space-y-4">
      {/* Stats Row - Based on reference image 3 */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          title="Total Census"
          value="54"
          icon={<Users className="h-4 w-4" />}
          trend={{ value: 12, direction: 'up' }}
        />
        <StatCard
          title="Waiting Triage"
          value={waitingPatients.length + inTriagePatients.length}
          subtitle="! High"
          icon={<Stethoscope className="h-4 w-4" />}
          variant="warning"
        />
        <StatCard
          title="Active Resus (ESI 1)"
          value="3"
          subtitle="Beds: 01, 04, 12"
          icon={<Activity className="h-4 w-4" />}
          variant="critical"
        />
        <StatCard
          title="Avg. Wait (Min)"
          value="42m"
          icon={<Clock className="h-4 w-4" />}
          trend={{ value: 4, direction: 'down' }}
          trendLabel="vs last hour"
        />
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column - Patient Table (8 cols) */}
        <div className="col-span-9 space-y-3">
          {/* Filter Bar */}
          <Card className="clinical-card">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <ZoneFilters activeZone={activeZone} onZoneChange={setActiveZone} />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                    <Columns className="h-3.5 w-3.5" />
                    Columns
                  </Button>
                  <Button size="sm" className="h-7 gap-1.5 text-xs">
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Patient
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient Table - Based on reference image 3 */}
          <Card className="clinical-card overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/30 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">St.</div>
              <div className="col-span-2">Patient / MRN</div>
              <div className="col-span-1">ESI</div>
              <div className="col-span-1">Location</div>
              <div className="col-span-3">Chief Complaint</div>
              <div className="col-span-2">Staff (MD/RN)</div>
              <div className="col-span-2 text-right">LOS / Wait</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border/50">
              {mockPatients.slice(0, 6).map((patient, i) => {
                const esiLevel = getPatientESI(patient.id) || (i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 3 : i === 3 ? 4 : 5) as ESILevel;
                const isCritical = esiLevel <= 2;
                const waitMins = Math.floor((Date.now() - patient.arrivalTime.getTime()) / 60000);
                
                return (
                  <div 
                    key={patient.id}
                    className={cn(
                      'grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/20 cursor-pointer transition-colors',
                      isCritical && 'bg-esi-1-bg/30'
                    )}
                    onClick={() => navigate(`/triage/${patient.id}`)}
                  >
                    {/* Status Dot */}
                    <div className="col-span-1">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full',
                        isCritical && 'bg-esi-1 animate-pulse',
                        esiLevel === 3 && 'bg-esi-3',
                        esiLevel >= 4 && 'bg-confidence-high'
                      )} />
                    </div>

                    {/* Patient Name & MRN */}
                    <div className="col-span-2">
                      <p className="font-semibold text-sm">
                        {patient.lastName.toUpperCase()}, {patient.firstName.toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        MRN: {patient.mrn.split('-')[2]} • {patient.age}Y {patient.gender.charAt(0).toUpperCase()}
                      </p>
                    </div>

                    {/* ESI Badge */}
                    <div className="col-span-1">
                      <ESIBadge level={esiLevel} size="sm" />
                    </div>

                    {/* Location */}
                    <div className="col-span-1">
                      <span className={cn(
                        'text-xs',
                        i < 2 ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}>
                        {i < 2 ? `Bed ${String(i + 4).padStart(2, '0')}` : 'Waiting Room'}
                      </span>
                      {i < 2 && <p className="text-[10px] text-muted-foreground">POD {i === 0 ? 'A' : 'B'}</p>}
                      {i >= 2 && <p className="text-[10px] text-muted-foreground">Lobby</p>}
                    </div>

                    {/* Chief Complaint */}
                    <div className="col-span-3">
                      <p className={cn(
                        'text-sm font-medium',
                        isCritical && 'text-esi-1'
                      )}>
                        {patient.chiefComplaint.split(',')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {patient.chiefComplaint.split(',').slice(1).join(',') || 'Details pending'}
                      </p>
                    </div>

                    {/* Staff */}
                    <div className="col-span-2">
                      {i < 3 ? (
                        <>
                          <p className="text-xs font-medium">Dr. {['Smith', 'Lee', 'Wilson'][i]}</p>
                          <p className="text-[10px] text-muted-foreground">RN {['Jones', 'Davis', 'Triage'][i]}</p>
                        </>
                      ) : (
                        <button className="text-xs text-primary font-medium flex items-center gap-1">
                          <span className="text-primary">⊕</span> Assign MD
                        </button>
                      )}
                    </div>

                    {/* Wait Time */}
                    <div className="col-span-2 text-right">
                      <span className={cn(
                        'font-vitals text-sm font-semibold',
                        waitMins > 30 && 'text-esi-2',
                        waitMins > 60 && 'text-esi-1'
                      )}>
                        {waitMins}m
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        Total LOS: {Math.floor(waitMins * 1.5)}m
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column - Active Escalations (3 cols) */}
        <div className="col-span-3 space-y-3">
          {/* Escalations Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              ACTIVE ESCALATIONS
              <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-esi-1 text-[10px]">3</Badge>
            </h3>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Unacknowledged items needing action</p>

          {/* Escalation Cards */}
          <div className="space-y-3">
            <EscalationCard
              type="critical"
              title="Stat Lab Results"
              subtitle="Critical Troponin"
              patientName="DOE, JOHN (Bed 04)"
              provider="Dr. Smith (Unacknowledged)"
              timeLabel="12m OVER"
              actionLabel="NOTIFY PROVIDER"
            />
            <EscalationCard
              type="warning"
              title="Unsigned Orders"
              subtitle="Pain Medication (PRN)"
              patientName="SMITH, JANE (Bed 09)"
              provider="Dr. Lee (Unacknowledged)"
              timeLabel="8m OVER"
              actionLabel="NOTIFY PROVIDER"
            />
            <EscalationCard
              type="info"
              title="Triage Alert"
              subtitle="Wait Time Threshold"
              patientName="WILSON, SARAH (Waiting Room)"
              provider="ESI 4 • Total Wait: 1h 15m"
              timeLabel="2m AGO"
              actionLabel="ASSIGN BED"
            />
          </div>

          {/* Acknowledge All Button */}
          <Button className="w-full gap-2 bg-esi-2 hover:bg-esi-2/90 text-foreground">
            <span>✓</span>
            Acknowledge All
          </Button>
        </div>
      </div>
    </div>
  );
}
