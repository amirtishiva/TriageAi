import { Patient, ESILevel, PatientStatus } from '@/types/triage';
import { ESIBadge } from './ESIBadge';
import { VitalsBar } from './VitalsDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  User, 
  AlertTriangle, 
  ChevronRight,
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

const statusConfig: Record<PatientStatus, { label: string; dotColor: string }> = {
  'waiting': { label: 'Waiting', dotColor: 'bg-status-pending' },
  'in-triage': { label: 'In Triage', dotColor: 'bg-status-active' },
  'pending-validation': { label: 'Pending', dotColor: 'bg-status-pending' },
  'validated': { label: 'Validated', dotColor: 'bg-status-completed' },
  'assigned': { label: 'Assigned', dotColor: 'bg-status-active' },
  'acknowledged': { label: 'Ack\'d', dotColor: 'bg-status-completed' },
  'in-treatment': { label: 'Treating', dotColor: 'bg-primary' },
  'discharged': { label: 'Discharged', dotColor: 'bg-muted-foreground' },
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
          'flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-all cursor-pointer',
          isCritical && 'border-l-2 border-l-esi-1 bg-esi-1-bg/30'
        )}
        onClick={onClick}
      >
        <div className={cn('w-2 h-2 rounded-full', statusInfo.dotColor)} />
        {esiLevel && <ESIBadge level={esiLevel} size="xs" />}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {patient.lastName.toUpperCase()}, {patient.firstName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            MRN: {patient.mrn} • {patient.age}y {patient.gender.charAt(0).toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <span className={cn(
            'font-vitals text-sm font-medium',
            isCritical && 'text-esi-1'
          )}>{waitTime}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'clinical-card-interactive overflow-hidden',
        isCritical && 'border-l-4 border-l-esi-1 bg-esi-1-bg/20',
        esiLevel === 2 && 'border-l-4 border-l-esi-2',
      )}
      onClick={onClick}
    >
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Status + ESI */}
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2.5 h-2.5 rounded-full',
                statusInfo.dotColor,
                isCritical && 'animate-pulse'
              )} />
              {esiLevel && <ESIBadge level={esiLevel} size="sm" />}
            </div>

            {/* Patient Info */}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">
                {patient.lastName.toUpperCase()}, {patient.firstName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span className="font-mono">{patient.mrn}</span>
                <span>•</span>
                <span>{patient.age}y {patient.gender.charAt(0).toUpperCase()}</span>
                {location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Wait Time & Status */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={cn(
              'font-vitals text-sm font-semibold',
              isCritical && 'text-esi-1'
            )}>
              {waitTime}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase">
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Chief Complaint */}
        <div className="p-2.5 rounded-md bg-muted/30 border border-border/50 mb-3">
          <p className="text-sm text-foreground/90 line-clamp-2">
            <span className="font-medium text-primary">CC:</span>{' '}
            {patient.chiefComplaint}
          </p>
        </div>

        {/* Quick Info Row */}
        {(patient.allergies?.length || showVitals) && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {patient.allergies && patient.allergies.length > 0 && (
              <Badge variant="outline" className="gap-1 border-esi-2/30 text-esi-2 bg-esi-2-bg/30">
                <AlertTriangle className="h-3 w-3" />
                {patient.allergies.join(', ')}
              </Badge>
            )}
          </div>
        )}

        {/* Vitals Display */}
        {showVitals && (
          <div className="mt-3 pt-3 border-t border-border/50">
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
              className="gap-1.5"
            >
              {actionLabel}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
