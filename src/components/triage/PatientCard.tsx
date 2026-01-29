import { Patient, ESILevel, PatientStatus } from '@/types/triage';
import { ESIBadge } from './ESIBadge';
import { VitalsBar } from './VitalsDisplay';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  User, 
  AlertTriangle, 
  FileText, 
  ChevronRight,
  Pill,
  History,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface PatientCardProps {
  patient: Patient;
  esiLevel?: ESILevel;
  onClick?: () => void;
  showVitals?: boolean;
  showActions?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  location?: string;
  compact?: boolean;
}

const statusConfig: Record<PatientStatus, { label: string; dotColor: string; badgeClass: string }> = {
  'waiting': { 
    label: 'Waiting', 
    dotColor: 'bg-status-pending', 
    badgeClass: 'bg-status-pending/10 text-status-pending border-status-pending/20' 
  },
  'in-triage': { 
    label: 'In Triage', 
    dotColor: 'bg-status-active', 
    badgeClass: 'bg-status-active/10 text-status-active border-status-active/20' 
  },
  'pending-validation': { 
    label: 'Pending Review', 
    dotColor: 'bg-status-pending', 
    badgeClass: 'bg-status-pending/10 text-status-pending border-status-pending/20' 
  },
  'validated': { 
    label: 'Validated', 
    dotColor: 'bg-status-completed', 
    badgeClass: 'bg-status-completed/10 text-status-completed border-status-completed/20' 
  },
  'assigned': { 
    label: 'Assigned', 
    dotColor: 'bg-status-active', 
    badgeClass: 'bg-status-active/10 text-status-active border-status-active/20' 
  },
  'acknowledged': { 
    label: 'Acknowledged', 
    dotColor: 'bg-status-completed', 
    badgeClass: 'bg-status-completed/10 text-status-completed border-status-completed/20' 
  },
  'in-treatment': { 
    label: 'In Treatment', 
    dotColor: 'bg-primary', 
    badgeClass: 'bg-primary/10 text-primary border-primary/20' 
  },
  'discharged': { 
    label: 'Discharged', 
    dotColor: 'bg-muted-foreground', 
    badgeClass: 'bg-muted text-muted-foreground border-border' 
  },
};

export function PatientCard({ 
  patient, 
  esiLevel, 
  onClick, 
  showVitals = false,
  showActions = false,
  actionLabel = 'Start Triage',
  onAction,
  location,
  compact = false
}: PatientCardProps) {
  const waitTime = formatDistanceToNow(patient.arrivalTime, { addSuffix: false });
  const statusInfo = statusConfig[patient.status];
  const isCritical = esiLevel && esiLevel <= 2;

  if (compact) {
    return (
      <div 
        className={cn(
          'flex items-center gap-4 p-3 rounded-xl border bg-card/50 hover:bg-card transition-colors cursor-pointer',
          isCritical && 'border-esi-1-border bg-esi-1-bg/30'
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', statusInfo.dotColor)} />
          {esiLevel && <ESIBadge level={esiLevel} size="xs" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {patient.lastName}, {patient.firstName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {patient.chiefComplaint}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <span className="font-mono">{waitTime}</span>
        </div>
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        'clinical-card-interactive overflow-hidden',
        isCritical && 'border-l-4 border-l-esi-1 bg-esi-1-bg/20',
        esiLevel === 2 && !isCritical && 'border-l-4 border-l-esi-2',
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Status dot + ESI */}
            <div className="flex flex-col items-center gap-1.5 pt-0.5">
              <div className={cn('status-dot', statusInfo.dotColor, isCritical && 'status-dot-pulse')} />
              {esiLevel && <ESIBadge level={esiLevel} size="sm" />}
            </div>

            {/* Patient Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">
                  {patient.lastName}, {patient.firstName}
                </h3>
                {patient.isReturning && (
                  <Badge variant="outline" className="text-[10px] gap-1 h-5">
                    <History className="h-2.5 w-2.5" />
                    Returning
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {patient.age}yo {patient.gender.charAt(0).toUpperCase()}
                </span>
                <span className="font-mono">{patient.mrn}</span>
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status & Time */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant="outline" className={cn('text-[10px] border', statusInfo.badgeClass)}>
              {statusInfo.label}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="font-mono">{waitTime}</span>
            </span>
          </div>
        </div>

        {/* Chief Complaint */}
        <div className="mb-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-sm">
            <span className="font-medium text-muted-foreground">CC: </span>
            {patient.chiefComplaint}
          </p>
        </div>

        {/* Quick Info Row */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {patient.allergies && patient.allergies.length > 0 && (
            <span className="flex items-center gap-1 text-esi-2 font-medium">
              <AlertTriangle className="h-3 w-3" />
              {patient.allergies.join(', ')}
            </span>
          )}
          {patient.medications && patient.medications.length > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Pill className="h-3 w-3" />
              {patient.medications.length} meds
            </span>
          )}
          {patient.uploadedDocuments && patient.uploadedDocuments.length > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <FileText className="h-3 w-3" />
              {patient.uploadedDocuments.length} docs
            </span>
          )}
        </div>

        {/* Vitals Display */}
        {showVitals && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <VitalsBar vitals={patient.vitals} />
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="mt-4 pt-3 border-t border-border/50 flex justify-end">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onAction?.();
              }}
              size="sm"
              className="gap-2"
            >
              {actionLabel}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
