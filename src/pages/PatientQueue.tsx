import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PatientCard } from '@/components/triage/PatientCard';
import { useTriageCases } from '@/integrations/supabase/hooks/useTriageCases';
import { ESILevel, Patient, VitalSigns } from '@/types/triage';
import { Search, Users, Filter, Clock, UserPlus, Loader2 } from 'lucide-react';
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
function mapPatient(dbPatient: Database['public']['Tables']['patients']['Row']): Patient {
  const dob = new Date(dbPatient.date_of_birth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  
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
    vitals: defaultVitals,
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
  const { patientsWithESI, waitingCount, inTriageCount, validatedCount } = useMemo(() => {
    if (!triageCases) {
      return { patientsWithESI: [], waitingCount: 0, inTriageCount: 0, validatedCount: 0 };
    }

    const patients: { patient: Patient; esiLevel?: ESILevel }[] = [];
    let waiting = 0;
    let inTriage = 0;
    let validated = 0;

    for (const tc of triageCases) {
      if (!tc.patients) continue;
      
      const patient = mapPatient(tc.patients);
      const esiStr = tc.validated_esi || tc.ai_draft_esi;
      const esiNum = esiStr ? (Number(esiStr) as ESILevel) : undefined;

      patients.push({ patient, esiLevel: esiNum });

      const status = mapStatus(tc.status);
      if (status === 'waiting') waiting++;
      else if (status === 'in-triage' || status === 'pending-validation') inTriage++;
      else if (status === 'validated' || status === 'assigned' || status === 'acknowledged') validated++;
    }

    return { patientsWithESI: patients, waitingCount: waiting, inTriageCount: inTriage, validatedCount: validated };
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="clinical-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-status-pending/10">
              <Clock className="h-5 w-5 text-status-pending" />
            </div>
            <div>
              <p className="text-2xl font-bold font-vitals">{waitingCount}</p>
              <p className="text-sm text-muted-foreground">Waiting</p>
            </div>
          </CardContent>
        </Card>
        <Card className="clinical-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-status-active/10">
              <Users className="h-5 w-5 text-status-active" />
            </div>
            <div>
              <p className="text-2xl font-bold font-vitals">{inTriageCount}</p>
              <p className="text-sm text-muted-foreground">In Triage</p>
            </div>
          </CardContent>
        </Card>
        <Card className="clinical-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-status-completed/10">
              <Users className="h-5 w-5 text-status-completed" />
            </div>
            <div>
              <p className="text-2xl font-bold font-vitals">{validatedCount}</p>
              <p className="text-sm text-muted-foreground">Validated</p>
            </div>
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
              onAction={() => navigate(`/triage/${patient.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
