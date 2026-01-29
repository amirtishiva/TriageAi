import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ESIBadge } from '@/components/triage/ESIBadge';
import { VitalsDisplay, VitalsBar } from '@/components/triage/VitalsDisplay';
import { SBARDisplay } from '@/components/triage/SBARDisplay';
import { mockTriageCases } from '@/data/mockData';
import { TriageCase, ESILevel, ESI_RESPONSE_TIMES } from '@/types/triage';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Loader2,
  Play,
  Phone,
  MessageSquare,
  ChevronRight,
  Users,
  Timer,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useEmergency } from '@/contexts/EmergencyContext';

// Escalation Alert Card - Based on reference image 5
function EscalationAlertBanner({ 
  isOverdue, 
  overdueMinutes 
}: { 
  isOverdue: boolean; 
  overdueMinutes: number;
}) {
  if (!isOverdue) return null;

  return (
    <div className="alert-banner-critical p-4 rounded-lg flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-esi-1/20 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-esi-1" />
        </div>
        <div>
          <h3 className="font-bold text-esi-1">
            CRITICAL: PHYSICIAN ACKNOWLEDGMENT OVERDUE (+{overdueMinutes}M)
          </h3>
          <p className="text-sm text-foreground/70">
            Automated assignment failed. Escalating to Charge Nurse intervention.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button className="bg-esi-1 hover:bg-esi-1/90 gap-2">
          Acknowledge Alert
        </Button>
        <Button variant="outline" size="icon">
          <span className="text-muted-foreground">⋮</span>
        </Button>
      </div>
    </div>
  );
}

export default function TrackBoard() {
  const navigate = useNavigate();
  const { activateEmergencyMode, deactivateEmergencyMode, isEmergencyMode } = useEmergency();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterESI, setFilterESI] = useState<ESILevel | 'all'>('all');
  const [selectedCase, setSelectedCase] = useState<TriageCase | null>(null);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  const filteredCases = mockTriageCases
    .filter(c => c.validation)
    .filter(c => {
      if (filterESI === 'all') return true;
      return c.validation?.validatedESI === filterESI;
    })
    .filter(c => {
      if (!searchQuery) return true;
      const name = `${c.patient.firstName} ${c.patient.lastName}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase()) || 
             c.patient.mrn.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      const esiA = a.validation?.validatedESI || 5;
      const esiB = b.validation?.validatedESI || 5;
      return esiA - esiB;
    });

  const handleAcknowledge = () => {
    setIsAcknowledging(true);
    setTimeout(() => {
      setIsAcknowledging(false);
      setSelectedCase(null);
      deactivateEmergencyMode();
    }, 1500);
  };

  const handleCaseSelect = (triageCase: TriageCase) => {
    setSelectedCase(triageCase);
    const esi = triageCase.validation?.validatedESI || 5;
    if (esi <= 1) {
      activateEmergencyMode(triageCase.id);
    }
  };

  // Check for critical overdue case
  const hasCriticalOverdue = filteredCases.some(c => 
    (c.validation?.validatedESI || 5) <= 2 && !c.acknowledgedAt
  );

  return (
    <div className={cn('space-y-4', isEmergencyMode && 'emergency-state')}>
      {/* Critical Alert Banner - Based on reference image 5 */}
      <EscalationAlertBanner isOverdue={hasCriticalOverdue} overdueMinutes={4} />

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="clinical-card border-t-2 border-t-primary/50">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Total Cases</p>
            <p className="font-vitals text-2xl font-bold">{filteredCases.length}</p>
          </CardContent>
        </Card>
        <Card className="clinical-card border-t-2 border-t-esi-1">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Critical (ESI 1-2)</p>
            <p className="font-vitals text-2xl font-bold text-esi-1">
              {filteredCases.filter(c => (c.validation?.validatedESI || 5) <= 2).length}
            </p>
          </CardContent>
        </Card>
        <Card className="clinical-card border-t-2 border-t-esi-2">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Pending Ack</p>
            <p className="font-vitals text-2xl font-bold text-esi-2">
              {filteredCases.filter(c => !c.acknowledgedAt).length}
            </p>
          </CardContent>
        </Card>
        <Card className="clinical-card border-t-2 border-t-confidence-high">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Acknowledged</p>
            <p className="font-vitals text-2xl font-bold text-confidence-high">
              {filteredCases.filter(c => c.acknowledgedAt).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="clinical-card">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-64 pl-8 text-xs"
                />
              </div>
              <div className="flex gap-1">
                <Button
                  variant={filterESI === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFilterESI('all')}
                >
                  All
                </Button>
                {([1, 2, 3, 4, 5] as ESILevel[]).map((level) => (
                  <Button
                    key={level}
                    variant={filterESI === level ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-7 w-7 p-0 text-xs',
                      filterESI === level && level === 1 && 'bg-esi-1 hover:bg-esi-1/90',
                      filterESI === level && level === 2 && 'bg-esi-2 hover:bg-esi-2/90',
                      filterESI === level && level === 3 && 'bg-esi-3 hover:bg-esi-3/90 text-foreground',
                      filterESI === level && level === 4 && 'bg-esi-4 hover:bg-esi-4/90',
                      filterESI === level && level === 5 && 'bg-esi-5 hover:bg-esi-5/90',
                    )}
                    onClick={() => setFilterESI(level)}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient List - Card-based layout */}
      <div className="space-y-2">
        {filteredCases.map((triageCase) => {
          const esiLevel = triageCase.validation?.validatedESI || 3;
          const waitTime = formatDistanceToNow(triageCase.patient.arrivalTime, { addSuffix: false });
          const isAcknowledged = !!triageCase.acknowledgedAt;
          const isCritical = esiLevel <= 2;

          return (
            <Card 
              key={triageCase.id}
              className={cn(
                'clinical-card-interactive overflow-hidden',
                isCritical && !isAcknowledged && 'border-l-4 border-l-esi-1 bg-esi-1-bg/30',
                isCritical && !isAcknowledged && 'pulse-critical'
              )}
              onClick={() => handleCaseSelect(triageCase)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Left - Patient Info */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full',
                        isCritical ? 'bg-esi-1 animate-pulse' : 'bg-confidence-high'
                      )} />
                      <ESIBadge level={esiLevel} size="md" />
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {triageCase.patient.lastName.toUpperCase()}, {triageCase.patient.firstName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {triageCase.patient.age}yo {triageCase.patient.gender} • {triageCase.patient.mrn}
                      </p>
                    </div>
                  </div>

                  {/* Center - Complaint & Vitals */}
                  <div className="flex-1 mx-6">
                    <p className={cn(
                      'text-sm font-medium mb-1',
                      isCritical && 'text-esi-1'
                    )}>
                      {triageCase.patient.chiefComplaint.split(',')[0]}
                    </p>
                    <VitalsBar vitals={triageCase.patient.vitals} />
                  </div>

                  {/* Right - Status & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={cn(
                        'font-vitals text-lg font-bold',
                        isCritical && 'text-esi-1'
                      )}>
                        {waitTime}
                      </span>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {ESI_RESPONSE_TIMES[esiLevel]}
                      </p>
                    </div>
                    {isAcknowledged ? (
                      <Badge className="bg-confidence-high gap-1 h-7">
                        <CheckCircle2 className="h-3 w-3" />
                        Ack'd
                      </Badge>
                    ) : (
                      <Button size="sm" className="h-8 gap-1.5">
                        Review
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Case Detail Dialog - Based on reference image 4 & 5 */}
      <Dialog open={!!selectedCase} onOpenChange={() => { setSelectedCase(null); deactivateEmergencyMode(); }}>
        <DialogContent className={cn(
          'max-w-4xl max-h-[90vh] overflow-y-auto',
          selectedCase && (selectedCase.validation?.validatedESI || 5) <= 1 && 'border-esi-1/50'
        )}>
          {selectedCase && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <DialogTitle className="text-2xl">
                          {selectedCase.patient.firstName} {selectedCase.patient.lastName} ({selectedCase.patient.age}{selectedCase.patient.gender.charAt(0).toUpperCase()})
                        </DialogTitle>
                        <ESIBadge level={selectedCase.validation?.validatedESI || 3} size="lg" />
                      </div>
                      <DialogDescription className="flex items-center gap-3 mt-1">
                        <span className="font-mono">{selectedCase.patient.mrn}</span>
                        <span>•</span>
                        <span>Room: ER-04</span>
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-esi-1 uppercase font-medium">Escalation Timer Active</p>
                    <p className="font-vitals text-4xl font-bold text-esi-1">
                      {formatDistanceToNow(selectedCase.patient.arrivalTime).replace(' minutes', ':').replace(' minute', ':')}45
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">Elapsed</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-6 py-4">
                {/* Left - SBAR & Vitals */}
                <div className="space-y-4">
                  {/* SBAR Summary - Grid layout */}
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4" />
                      SBAR Clinical Summary
                    </h4>
                    {selectedCase.aiResult && (
                      <SBARDisplay sbar={selectedCase.aiResult.sbar} layout="grid" />
                    )}
                  </div>

                  {/* Current Vitals */}
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <Timer className="h-4 w-4" />
                      Current Vitals
                    </h4>
                    <VitalsDisplay vitals={selectedCase.patient.vitals} layout="grid" />
                  </div>
                </div>

                {/* Right - Provider & Escalation */}
                <div className="space-y-4">
                  {/* Assigned Provider */}
                  <Card className="clinical-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Assigned Provider
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/80 to-primary" />
                        <div>
                          <p className="font-semibold">Dr. Sarah Jenkins</p>
                          <p className="text-xs text-muted-foreground">Attending Physician • On Duty</p>
                          <p className="text-xs text-esi-1">⚠ NO RESPONSE (4M OVERDUE)</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Notification Sent</span>
                          <span className="font-mono">14:02:10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SLA Target</span>
                          <span className="font-mono">14:12:10</span>
                        </div>
                        <div className="flex justify-between text-esi-1">
                          <span className="font-medium">Overdue By</span>
                          <span className="font-mono font-bold">+04:12</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button className="gap-2 bg-esi-1 hover:bg-esi-1/90">
                          <Phone className="h-4 w-4" />
                          Call Provider
                        </Button>
                        <Button variant="outline" className="gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Secure Message
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Escalation Protocols */}
                  <Card className="clinical-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Escalation Protocols
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-between h-auto py-3">
                        <div className="text-left">
                          <p className="font-medium">Manual Re-route</p>
                          <p className="text-[10px] text-esi-1">ASSIGN TO NEW PROVIDER</p>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" className="w-full justify-between h-auto py-3">
                        <div className="text-left">
                          <p className="font-medium">Escalate to Chief Resident</p>
                          <p className="text-[10px] text-muted-foreground">DR. MILLER (ON-CALL)</p>
                        </div>
                        <span className="text-muted-foreground">●</span>
                      </Button>
                      <Button variant="outline" className="w-full justify-between h-auto py-3">
                        <div className="text-left">
                          <p className="font-medium">Rapid Response Team</p>
                          <p className="text-[10px] text-muted-foreground">DEPLOY BEDSIDE SUPPORT</p>
                        </div>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2">
                <Button variant="outline" className="w-full" onClick={() => setSelectedCase(null)}>
                  Close
                </Button>
                {!selectedCase.acknowledgedAt && (
                  <Button 
                    className="w-full gap-2 bg-primary hover:bg-primary/90" 
                    onClick={handleAcknowledge} 
                    disabled={isAcknowledging}
                  >
                    {isAcknowledging ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {isAcknowledging ? 'Acknowledging...' : 'ACKNOWLEDGE CASE'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
