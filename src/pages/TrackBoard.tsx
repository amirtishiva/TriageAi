import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ESIBadge } from '@/components/triage/ESIBadge';
import { VitalsDisplay } from '@/components/triage/VitalsDisplay';
import { SBARDisplay } from '@/components/triage/SBARDisplay';
import { useEmergency } from '@/contexts/EmergencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackBoard, useAcknowledgeCase, TrackBoardCase } from '@/integrations/supabase/hooks';
import { ESILevel, ESI_RESPONSE_TIMES, VitalSigns, SBARSummary } from '@/types/triage';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Bell,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TrackBoard() {
  const { user, session } = useAuth();
  const { activateEmergencyMode, deactivateEmergencyMode, checkCriticalState } = useEmergency();
  const acknowledgeMutation = useAcknowledgeCase();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterESI, setFilterESI] = useState<ESILevel | 'all'>('all');
  const [sortBy, setSortBy] = useState<'esi' | 'time'>('esi');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCase, setSelectedCase] = useState<TrackBoardCase | null>(null);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Fetch track board data with filters - only when authenticated
  const { data: trackBoardData, isLoading, refetch, isRefetching } = useTrackBoard({
    esiLevels: filterESI === 'all' ? undefined : [filterESI],
    session, // Pass session to enable the query only when authenticated
  });

  // Filter and sort cases client-side for search
  const filteredCases = (trackBoardData?.cases || [])
    .filter(c => {
      if (!searchQuery) return true;
      const name = `${c.patient.firstName} ${c.patient.lastName}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase()) || 
             c.patient.mrn.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'esi') {
        return sortOrder === 'asc' ? a.esiLevel - b.esiLevel : b.esiLevel - a.esiLevel;
      } else {
        return sortOrder === 'asc' ? a.waitTimeMs - b.waitTimeMs : b.waitTimeMs - a.waitTimeMs;
      }
    });

  const toggleSort = (column: 'esi' | 'time') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleSelectCase = (triageCase: TrackBoardCase) => {
    setSelectedCase(triageCase);
    if (checkCriticalState(triageCase.esiLevel as ESILevel)) {
      activateEmergencyMode(triageCase.patientId);
    }
  };

  const handleCloseDialog = () => {
    setSelectedCase(null);
    deactivateEmergencyMode();
  };

  const handleAcknowledge = async () => {
    if (!selectedCase) return;
    
    setIsAcknowledging(true);
    try {
      await acknowledgeMutation.mutateAsync({
        triageCaseId: selectedCase.id,
      });
      toast.success('Case acknowledged successfully');
      handleCloseDialog();
      refetch();
    } catch (error) {
      console.error('Acknowledge error:', error);
      toast.error('Failed to acknowledge case');
    } finally {
      setIsAcknowledging(false);
    }
  };

  // Convert TrackBoardCase to VitalSigns format for display
  const convertToVitals = (caseData: TrackBoardCase): VitalSigns | null => {
    // Note: We don't have full vitals in track board response, would need to fetch separately
    return null;
  };

  // Stats
  const pendingCount = filteredCases.filter(c => c.status !== 'acknowledged').length;
  const criticalCount = filteredCases.filter(c => c.esiLevel <= 2).length;
  const overdueCount = trackBoardData?.summary?.overdue || 0;

  const SortIcon = ({ column }: { column: 'esi' | 'time' }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4 ml-1" /> : 
      <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const isSelectedCritical = selectedCase ? checkCriticalState(selectedCase.esiLevel as ESILevel) : false;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Physician Track Board</h1>
          <p className="text-muted-foreground">
            Manage and acknowledge patient cases by priority
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Badge variant="outline" className="gap-2 py-1.5">
            <Bell className="h-3.5 w-3.5" />
            {pendingCount} Pending
          </Badge>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="gap-2 py-1.5">
              <Clock className="h-3.5 w-3.5" />
              {overdueCount} Overdue
            </Badge>
          )}
          {criticalCount > 0 && (
            <Badge className="gap-2 py-1.5 bg-esi-1 text-white pulse-critical">
              <AlertTriangle className="h-3.5 w-3.5" />
              {criticalCount} Critical
            </Badge>
          )}
        </div>
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
              <span className="text-sm text-muted-foreground">ESI Level:</span>
              <div className="flex gap-1" role="group" aria-label="Filter by ESI level">
                <Button
                  variant={filterESI === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterESI('all')}
                  aria-pressed={filterESI === 'all'}
                >
                  All
                </Button>
                {([1, 2, 3, 4, 5] as ESILevel[]).map((level) => (
                  <Button
                    key={level}
                    variant={filterESI === level ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterESI(level)}
                    aria-pressed={filterESI === level}
                    aria-label={`ESI Level ${level}`}
                    className={cn(
                      filterESI === level && level === 1 && 'bg-esi-1 hover:bg-esi-1/90',
                      filterESI === level && level === 2 && 'bg-esi-2 hover:bg-esi-2/90',
                      filterESI === level && level === 3 && 'bg-esi-3 hover:bg-esi-3/90 text-foreground',
                      filterESI === level && level === 4 && 'bg-esi-4 hover:bg-esi-4/90',
                      filterESI === level && level === 5 && 'bg-esi-5 hover:bg-esi-5/90',
                    )}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Track Board Table */}
      <Card className="clinical-card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('esi')}
                  >
                    <div className="flex items-center">
                      ESI
                      <SortIcon column="esi" />
                    </div>
                  </TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Chief Complaint</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('time')}
                  >
                    <div className="flex items-center">
                      Wait Time
                      <SortIcon column="time" />
                    </div>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Target Response</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <p className="text-muted-foreground">No cases match your filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCases.map((triageCase) => {
                    const esiLevel = triageCase.esiLevel as ESILevel;
                    const isAcknowledged = triageCase.status === 'acknowledged';
                    const isCritical = esiLevel <= 2;

                    return (
                      <TableRow 
                        key={triageCase.id}
                        className={cn(
                          'cursor-pointer transition-colors focus-within:bg-accent',
                          isCritical && !isAcknowledged && 'table-row-critical',
                          triageCase.isOverdue && 'bg-destructive/5',
                        )}
                        onClick={() => handleSelectCase(triageCase)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectCase(triageCase);
                          }
                        }}
                      >
                        <TableCell>
                          <ESIBadge level={esiLevel} size="sm" />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {triageCase.patient.lastName}, {triageCase.patient.firstName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {triageCase.patient.age}yo {triageCase.patient.gender} • {triageCase.patient.mrn}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs hidden md:table-cell">
                          <p className="text-sm truncate">{triageCase.patient.chiefComplaint}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Clock className={cn(
                              "h-3.5 w-3.5",
                              triageCase.isOverdue ? "text-destructive" : "text-muted-foreground"
                            )} />
                            <span className={cn(
                              "font-vitals",
                              triageCase.isOverdue && "text-destructive font-semibold"
                            )}>
                              {triageCase.waitTimeFormatted}
                            </span>
                            {triageCase.isOverdue && (
                              <Badge variant="destructive" className="text-xs ml-1">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge 
                            variant="outline"
                            className={cn(
                              'text-xs',
                              isCritical && 'border-esi-1/30 text-esi-1'
                            )}
                          >
                            {ESI_RESPONSE_TIMES[esiLevel]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isAcknowledged ? (
                            <Badge className="bg-confidence-high gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="hidden sm:inline">Acknowledged</span>
                              <span className="sm:hidden">Ack</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-status-pending/30 text-status-pending">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={isAcknowledged ? 'ghost' : 'default'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCase(triageCase);
                            }}
                          >
                            {isAcknowledged ? 'View' : 'Review'}
                            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Summary Stats */}
      {trackBoardData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="clinical-card p-4">
            <p className="text-sm text-muted-foreground">Total Cases</p>
            <p className="text-2xl font-bold">{trackBoardData.summary.total}</p>
          </Card>
          <Card className="clinical-card p-4">
            <p className="text-sm text-muted-foreground">ESI 3</p>
            <p className="text-2xl font-bold">{trackBoardData.summary.byESI[3] || 0}</p>
          </Card>
          <Card className="clinical-card p-4">
            <p className="text-sm text-muted-foreground">ESI 4</p>
            <p className="text-2xl font-bold">{trackBoardData.summary.byESI[4] || 0}</p>
          </Card>
          <Card className="clinical-card p-4">
            <p className="text-sm text-muted-foreground">ESI 5</p>
            <p className="text-2xl font-bold">{trackBoardData.summary.byESI[5] || 0}</p>
          </Card>
        </div>
      )}

      {/* Case Detail Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={handleCloseDialog}>
        <DialogContent className={cn(
          "max-w-3xl",
          isSelectedCritical && "border-esi-1/50"
        )}>
          <ScrollArea className="max-h-[80vh]">
            {selectedCase && (
              <div className="pr-4">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ESIBadge level={selectedCase.esiLevel as ESILevel} size="lg" />
                      <div>
                        <DialogTitle className="text-xl">
                          {selectedCase.patient.lastName}, {selectedCase.patient.firstName}
                        </DialogTitle>
                        <DialogDescription>
                          {selectedCase.patient.age}yo {selectedCase.patient.gender} • {selectedCase.patient.mrn}
                        </DialogDescription>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                {/* Critical Alert */}
                {isSelectedCritical && selectedCase.status !== 'acknowledged' && (
                  <div className="alert-banner-critical mt-4">
                    <AlertTriangle className="h-5 w-5" />
                    <div className="flex-1">
                      <p className="font-semibold">Critical Case - Immediate Action Required</p>
                      <p className="text-sm opacity-80">
                        Target response: {ESI_RESPONSE_TIMES[selectedCase.esiLevel as ESILevel]}
                      </p>
                    </div>
                  </div>
                )}

                {/* Overdue Alert */}
                {selectedCase.isOverdue && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg mt-4">
                    <Clock className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-semibold text-destructive">Overdue by {selectedCase.overdueFormatted}</p>
                      <p className="text-sm text-muted-foreground">
                        Patient has been waiting longer than target time
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-6 py-4">
                  {/* Chief Complaint */}
                  <div className={cn(
                    "p-3 rounded-lg",
                    isSelectedCritical ? "bg-esi-1-bg border border-[hsl(var(--esi-1-border))]" : "bg-muted/50"
                  )}>
                    <p className="text-sm">
                      <span className="font-semibold">Chief Complaint: </span>
                      {selectedCase.patient.chiefComplaint}
                    </p>
                  </div>

                  {/* SBAR */}
                  {selectedCase.sbar && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">SBAR Summary</h4>
                      <SBARDisplay sbar={selectedCase.sbar as SBARSummary} layout="compact" />
                    </div>
                  )}

                  {/* Allergies */}
                  {selectedCase.patient.allergies && selectedCase.patient.allergies.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Allergies</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedCase.patient.allergies.map((a, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Wait Time Info */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Wait Time</p>
                      <p className="font-vitals text-lg">{selectedCase.waitTimeFormatted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Arrived</p>
                      <p className="text-sm">{new Date(selectedCase.patient.arrivalTime).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Close
                  </Button>
                  {selectedCase.status !== 'acknowledged' && (
                    <Button 
                      onClick={handleAcknowledge} 
                      disabled={isAcknowledging} 
                      className={cn("gap-2", isSelectedCritical && "bg-esi-1 hover:bg-esi-1/90")}
                    >
                      {isAcknowledging ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Acknowledge Case
                        </>
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
