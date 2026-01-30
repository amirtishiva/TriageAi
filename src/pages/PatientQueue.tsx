import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PatientCard } from '@/components/triage/PatientCard';
import { useTriageCases } from '@/integrations/supabase/hooks/useTriageCases';
import { ESILevel, Patient, VitalSigns } from '@/types/triage';
import { Search, Users, Filter, Clock, UserPlus, Loader2, AlertTriangle, Activity, AlertCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

// Default vitals for when real vitals aren't available
const defaultVitals: VitalSigns = {
  heartRate: 0,
  bloodPressure: { systolic: 0, diastolic: 0 },
  respiratoryRate: 0,
  temperature: 0,
  oxygenSaturation: 0,
  painLevel: 0,
  timestamp: new Date(),
};

// Convert DB patient status to UI status
function mapStatus(dbStatus: string): Patient['status'] {
  const statusMap: Record<string, Patient['status']> = {
    'waiting': 'waiting',
    'in_triage': 'in-triage',
    'pending_validation': 'pending-validation',
    'validated': 'validated',
    'assigned': 'assigned',
    'acknowledged': 'acknowledged',
    'in_treatment': 'in-treatment',
    'discharged': 'discharged',
  };
  return statusMap[dbStatus] || 'waiting';
}

// Helper to convert DB patient to UI format
function mapPatient(
  dbPatient: Database['public']['Tables']['patients']['Row'],
  dbVitals?: Database['public']['Tables']['vital_signs']['Row'][]
): Patient {
  const dob = new Date(dbPatient.date_of_birth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();

  // Get latest vitals from DB or use defaults
  const latestVital = dbVitals && dbVitals.length > 0
    ? dbVitals.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0]
    : null;

  const vitals: VitalSigns = latestVital ? {
    heartRate: latestVital.heart_rate || 0,
    bloodPressure: {
      systolic: latestVital.systolic_bp || 0,
      diastolic: latestVital.diastolic_bp || 0
    },
    respiratoryRate: latestVital.respiratory_rate || 0,
    temperature: latestVital.temperature ? Number(latestVital.temperature) : 0,
    oxygenSaturation: latestVital.oxygen_saturation || 0,
    painLevel: latestVital.pain_level || 0,
    timestamp: new Date(latestVital.recorded_at),
  } : defaultVitals;

  return {
    id: dbPatient.id,
    mrn: dbPatient.mrn,
    firstName: dbPatient.first_name,
    lastName: dbPatient.last_name,
    dateOfBirth: dob,
    age,
    gender: dbPatient.gender as 'male' | 'female' | 'other',
    chiefComplaint: dbPatient.chief_complaint,
    arrivalTime: new Date(dbPatient.arrival_time),
    status: mapStatus(dbPatient.status),
    isReturning: dbPatient.is_returning,
    vitals,
    allergies: dbPatient.allergies || [],
    medicalHistory: dbPatient.medical_history || [],
    medications: dbPatient.medications || [],
  };
}

export default function PatientQueue() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'in_triage' | 'validated'>('all');

  // Fetch triage cases with real-time updates
  const { data: triageCases, isLoading } = useTriageCases();

  // Transform and filter data
  const {
    patientsWithESI,
    waitingCount,
    inTriageCount,
    validatedCount,
    highAcuityCount,
    avgWaitTime,
    escalationCount
  } = useMemo(() => {
    if (!triageCases) {
      return {
        patientsWithESI: [],
        waitingCount: 0,
        inTriageCount: 0,
        validatedCount: 0,
        highAcuityCount: 0,
        avgWaitTime: 0,
        escalationCount: 0
      };
    }

    const patients: { patient: Patient; esiLevel?: ESILevel }[] = [];
    let waiting = 0;
    let inTriage = 0;
    let validated = 0;
    let highAcuity = 0;
    let totalWaitTime = 0;
    let waitTimeCount = 0;
    let escalations = 0;

    const now = new Date();

    for (const tc of triageCases) {
      if (!tc.patients) continue;

      const patient = mapPatient(tc.patients, (tc.patients as { vital_signs?: Database['public']['Tables']['vital_signs']['Row'][] }).vital_signs);
      const esiStr = tc.validated_esi || tc.ai_draft_esi;
      const esiNum = esiStr ? (Number(esiStr) as ESILevel) : undefined;

      patients.push({ patient, esiLevel: esiNum });

      const status = mapStatus(tc.status);
      if (status === 'waiting') waiting++;
      else if (status === 'in-triage' || status === 'pending-validation') inTriage++;
      else if (status === 'validated' || status === 'assigned' || status === 'acknowledged') validated++;

      // High Acuity: ESI 1-2
      if (esiNum && (esiNum === 1 || esiNum === 2)) {
        highAcuity++;
      }

      // Escalation Status (Active levels only)
      if (tc.escalation_status && !['none', 'resolved'].includes(tc.escalation_status)) {
        escalations++;
      }

      // Wait Time Calculation (Operational definition: Door to Doctor)
      if (status !== 'discharged') {
        const arrival = new Date(tc.patients.arrival_time);
        let waitMinutes = 0;

        if (status === 'acknowledged' || status === 'in-treatment') {
          // If already seen, wait time is Arrival -> Acknowledged
          const ackTime = tc.acknowledged_at ? new Date(tc.acknowledged_at) : now;
          waitMinutes = (ackTime.getTime() - arrival.getTime()) / (1000 * 60);
        } else {
          // If still waiting, wait time is Arrival -> Now
          waitMinutes = (now.getTime() - arrival.getTime()) / (1000 * 60);
        }

        // Outlier Handling: Exclude cases > 24 hours (likely abandoned/test data)
        if (waitMinutes > 0 && waitMinutes < 1440) {
          totalWaitTime += waitMinutes;
          waitTimeCount++;
        }
      }
    }

    return {
      patientsWithESI: patients,
      waitingCount: waiting,
      inTriageCount: inTriage,
      validatedCount: validated,
      highAcuityCount: highAcuity,
      avgWaitTime: waitTimeCount > 0 ? Math.round(totalWaitTime / waitTimeCount) : 0,
      escalationCount: escalations
    };
  }, [triageCases]);

  // Apply filters
  const filteredPatients = useMemo(() => {
    return patientsWithESI
      .filter(({ patient }) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'waiting') return patient.status === 'waiting';
        if (statusFilter === 'in_triage') return patient.status === 'in-triage';
        if (statusFilter === 'validated') return patient.status === 'validated' || patient.status === 'assigned' || patient.status === 'acknowledged';
        return true;
      })
      .filter(({ patient }) => {
        if (!searchQuery) return true;
        const name = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase()) ||
          patient.mrn.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [patientsWithESI, statusFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Patient Queue</h1>
          <p className="text-muted-foreground">
            All patients in the emergency department
          </p>
        </div>
        <Button onClick={() => navigate('/nurse/intake')} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add New Patient
        </Button>
      </div>

      {/* Filters */}
      <Card className="clinical-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or MRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search patients"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Status:</span>
              <div className="flex gap-1" role="group" aria-label="Filter by status">
                {(['all', 'waiting', 'in_triage', 'validated'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    aria-pressed={statusFilter === status}
                  >
                    {status === 'all' ? 'All' :
                      status === 'waiting' ? 'Waiting' :
                        status === 'in_triage' ? 'In Triage' : 'Validated'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Row 1/Col 1: Waiting */}
        <Card className="clinical-card">
          <CardContent className="p-4 flex flex-col gap-1 justify-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-status-pending/10">
                <Clock className="h-4 w-4 text-status-pending" />
              </div>
              <p className="text-sm text-muted-foreground">Waiting</p>
            </div>
            <p className="text-2xl font-bold font-vitals ml-1">{waitingCount}</p>
          </CardContent>
        </Card>

        {/* Row 1/Col 2: High Acuity */}
        <Card className="clinical-card border-esi-1/30">
          <CardContent className="p-4 flex flex-col gap-1 justify-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-esi-1/10">
                <AlertTriangle className="h-4 w-4 text-esi-1" />
              </div>
              <p className="text-sm text-muted-foreground">High Acuity</p>
            </div>
            <p className="text-2xl font-bold font-vitals ml-1 text-esi-1">{highAcuityCount}</p>
          </CardContent>
        </Card>

        {/* Row 1/Col 3: Avg Wait */}
        <Card className="clinical-card">
          <CardContent className="p-4 flex flex-col gap-1 justify-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Avg Wait</p>
            </div>
            <div className="flex items-baseline gap-1 ml-1">
              <p className="text-2xl font-bold font-vitals">{avgWaitTime}</p>
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </CardContent>
        </Card>

        {/* Row 2 / Row 1 on LG: In Triage */}
        <Card className="clinical-card">
          <CardContent className="p-4 flex flex-col gap-1 justify-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-status-active/10">
                <Users className="h-4 w-4 text-status-active" />
              </div>
              <p className="text-sm text-muted-foreground">In Triage</p>
            </div>
            <p className="text-2xl font-bold font-vitals ml-1">{inTriageCount}</p>
          </CardContent>
        </Card>

        {/* Row 2/Col 2: Validated */}
        <Card className="clinical-card">
          <CardContent className="p-4 flex flex-col gap-1 justify-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-status-completed/10">
                <Users className="h-4 w-4 text-status-completed" />
              </div>
              <p className="text-sm text-muted-foreground">Validated</p>
            </div>
            <p className="text-2xl font-bold font-vitals ml-1">{validatedCount}</p>
          </CardContent>
        </Card>

        {/* Row 2/Col 3: Escalations */}
        <Card className={cn(
          "clinical-card",
          escalationCount > 0 ? "border-destructive/30 bg-destructive/5" : ""
        )}>
          <CardContent className="p-4 flex flex-col gap-1 justify-center">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-lg",
                escalationCount > 0 ? "bg-destructive/10" : "bg-muted"
              )}>
                <AlertCircle className={cn(
                  "h-4 w-4",
                  escalationCount > 0 ? "text-destructive" : "text-muted-foreground"
                )} />
              </div>
              <p className="text-sm text-muted-foreground">Escalations</p>
            </div>
            <p className={cn(
              "text-2xl font-bold font-vitals ml-1",
              escalationCount > 0 ? "text-destructive" : ""
            )}>{escalationCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Patient List */}
      <div className="space-y-3">
        {filteredPatients.length === 0 ? (
          <Card className="clinical-card">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'No patients match your search or filters. Try adjusting your criteria.'
                  : 'No patients in the queue'}
              </p>
              {(searchQuery || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map(({ patient, esiLevel }) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              esiLevel={esiLevel}
              showVitals
              showActions
              actionLabel={
                patient.status === 'waiting' ? 'Start Triage' :
                  patient.status === 'in-triage' ? 'Continue Triage' : 'View Details'
              }
              onAction={() => navigate(`/nurse/triage/${patient.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
