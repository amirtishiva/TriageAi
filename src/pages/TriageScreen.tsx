import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ESIBadge, ESILevelSelector } from '@/components/triage/ESIBadge';
import { VitalsDisplay } from '@/components/triage/VitalsDisplay';
import { SBARDisplay } from '@/components/triage/SBARDisplay';
import { ConfidenceIndicator } from '@/components/triage/ConfidenceIndicator';
import { useEmergency } from '@/contexts/EmergencyContext';
import { mockPatients, generateAITriageResult } from '@/data/mockData';
import { 
  ESILevel, 
  AITriageResult, 
  OverrideRationale, 
  OVERRIDE_RATIONALE_LABELS,
  ESI_LABELS
} from '@/types/triage';
import { 
  ArrowLeft, 
  Bot, 
  CheckCircle2, 
  Edit3, 
  AlertTriangle,
  Loader2,
  Sparkles,
  Clock,
  User,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TriageScreen() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { activateEmergencyMode, deactivateEmergencyMode, checkCriticalState } = useEmergency();
  
  // Find patient - use first in-triage patient as fallback
  const patient = patientId === 'new-patient' 
    ? mockPatients[5] // Use Lisa Anderson (stroke patient) for new intake
    : mockPatients.find(p => p.id === patientId) || mockPatients[0];
  
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [aiResult, setAIResult] = useState<AITriageResult | null>(null);
  const [selectedESI, setSelectedESI] = useState<ESILevel | null>(null);
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideRationale, setOverrideRationale] = useState<OverrideRationale | ''>('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulate AI analysis
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = generateAITriageResult(patient);
      setAIResult(result);
      setSelectedESI(result.draftESI);
      setIsAnalyzing(false);
      
      // Activate emergency mode for critical patients
      if (checkCriticalState(result.draftESI)) {
        activateEmergencyMode(patient.id);
      }
    }, 2500);

    return () => {
      clearTimeout(timer);
      deactivateEmergencyMode();
    };
  }, [patient, activateEmergencyMode, deactivateEmergencyMode, checkCriticalState]);

  // Update emergency state when ESI changes
  useEffect(() => {
    if (selectedESI && checkCriticalState(selectedESI)) {
      activateEmergencyMode(patient.id);
    } else {
      deactivateEmergencyMode();
    }
  }, [selectedESI, patient.id, activateEmergencyMode, deactivateEmergencyMode, checkCriticalState]);

  const handleESIChange = (level: ESILevel) => {
    setSelectedESI(level);
    if (aiResult && level !== aiResult.draftESI) {
      setIsOverriding(true);
    } else {
      setIsOverriding(false);
      setOverrideRationale('');
      setOverrideNotes('');
    }
  };

  const handleConfirm = () => {
    if (isOverriding && !overrideRationale) {
      return; // Require rationale for override
    }
    setShowConfirmDialog(true);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    
    // Simulate submission
    setTimeout(() => {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
      deactivateEmergencyMode();
      navigate('/nurse/queue');
    }, 1500);
  };

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Patient not found</p>
      </div>
    );
  }

  const isCritical = selectedESI ? checkCriticalState(selectedESI) : false;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              AI Triage Assessment
              {aiResult && selectedESI && (
                <ESIBadge level={selectedESI} size="lg" />
              )}
            </h1>
            <p className="text-muted-foreground">
              Human-in-the-loop validation required before routing
            </p>
          </div>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {isCritical && !isAnalyzing && (
        <div className="alert-banner-critical pulse-critical">
          <AlertTriangle className="h-6 w-6" />
          <div className="flex-1">
            <p className="font-semibold">Critical Patient - ESI Level {selectedESI}</p>
            <p className="text-sm opacity-80">Immediate intervention required. Case will be routed to code team upon confirmation.</p>
          </div>
        </div>
      )}

      {/* Patient Header */}
      <Card className={cn("clinical-card", isCritical && "border-[hsl(var(--esi-1-border))]")}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center",
                isCritical ? "bg-esi-1/20" : "bg-primary/10"
              )}>
                <User className={cn("h-7 w-7", isCritical ? "text-esi-1" : "text-primary")} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">
                    {patient.lastName}, {patient.firstName}
                  </h2>
                  {patient.isReturning && (
                    <Badge variant="outline">
                      <History className="h-3 w-3 mr-1" />
                      Returning
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>{patient.age}yo {patient.gender}</span>
                  <span className="font-mono">{patient.mrn}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Arrived {Math.round((Date.now() - patient.arrivalTime.getTime()) / 60000)} min ago
                  </span>
                </div>
              </div>
            </div>
            {patient.allergies && patient.allergies.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Allergies: {patient.allergies.join(', ')}
              </Badge>
            )}
          </div>

          {/* Chief Complaint */}
          <div className={cn(
            "mt-4 p-3 rounded-lg",
            isCritical ? "bg-esi-1-bg border border-[hsl(var(--esi-1-border))]" : "bg-muted/50"
          )}>
            <p className="text-sm">
              <span className="font-semibold">Chief Complaint: </span>
              {patient.chiefComplaint}
            </p>
          </div>

          {/* Vitals */}
          <div className="mt-4">
            <Label className="text-sm mb-2 block">Current Vital Signs</Label>
            <VitalsDisplay vitals={patient.vitals} />
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Section */}
      {isAnalyzing ? (
        <Card className="clinical-card">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative">
                <Bot className="h-16 w-16 text-primary animate-pulse" />
                <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-bounce" />
              </div>
              <h3 className="text-xl font-semibold mt-6 mb-2">AI Analysis in Progress</h3>
              <p className="text-muted-foreground max-w-md">
                Extracting clinical information, analyzing vitals, and generating 
                SBAR summary with ESI recommendation...
              </p>
              <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing patient data...
              </div>
            </div>
          </CardContent>
        </Card>
      ) : aiResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Draft ESI */}
          <Card className={cn(
            'clinical-card border-2',
            isCritical ? 'border-esi-1/50' : aiResult.draftESI <= 2 ? 'border-esi-2/50' : 'border-border',
          )}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className={cn("h-5 w-5", isCritical ? "text-esi-1" : "text-primary")} />
                  AI Draft Assessment
                </CardTitle>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Auto-generated
                </Badge>
              </div>
              <CardDescription>
                Review and validate the AI-suggested severity level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Draft ESI Display */}
              <div className={cn(
                "flex items-center justify-between p-4 rounded-lg",
                isCritical ? "bg-esi-1-bg" : "bg-muted/30"
              )}>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Suggested ESI Level</p>
                  <div className="flex items-center gap-3">
                    <ESIBadge level={aiResult.draftESI} size="lg" />
                    <div>
                      <p className="font-semibold">{ESI_LABELS[aiResult.draftESI].label}</p>
                      <p className="text-xs text-muted-foreground">
                        {ESI_LABELS[aiResult.draftESI].description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confidence Indicator */}
              <ConfidenceIndicator 
                confidence={aiResult.confidence} 
                factors={aiResult.influencingFactors}
              />

              {/* Extracted Info */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Extracted Symptoms</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {aiResult.extractedSymptoms.map((symptom, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Timeline</Label>
                  <p className="text-sm mt-1">{aiResult.extractedTimeline}</p>
                </div>
                {aiResult.comorbidities.length > 0 && (
                  <div>
                    <Label className="text-xs">Comorbidities</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {aiResult.comorbidities.map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SBAR Summary */}
          <Card className="clinical-card">
            <CardHeader>
              <CardTitle>SBAR Summary</CardTitle>
              <CardDescription>
                Structured handoff communication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SBARDisplay sbar={aiResult.sbar} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Section */}
      {!isAnalyzing && aiResult && selectedESI && (
        <Card className={cn(
          "clinical-card border-2",
          isCritical ? "border-esi-1/40" : "border-primary/20"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className={cn("h-5 w-5", isCritical ? "text-esi-1" : "text-primary")} />
              Nurse Validation
            </CardTitle>
            <CardDescription>
              Confirm or override the AI assessment. Your clinical judgment is final.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ESI Selector */}
            <div>
              <Label className="mb-3 block">Select Final ESI Level</Label>
              <ESILevelSelector value={selectedESI} onChange={handleESIChange} />
            </div>

            {/* Override Rationale */}
            {isOverriding && (
              <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary space-y-4 animate-fade-in-up">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Edit3 className="h-4 w-4" />
                  You're changing from ESI {aiResult.draftESI} to ESI {selectedESI}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="override-rationale">Reason for Override</Label>
                  <Select 
                    value={overrideRationale} 
                    onValueChange={(v) => setOverrideRationale(v as OverrideRationale)}
                  >
                    <SelectTrigger id="override-rationale">
                      <SelectValue placeholder="Select a rationale..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OVERRIDE_RATIONALE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="override-notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="override-notes"
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                    placeholder="Add any relevant clinical observations..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={isOverriding && !overrideRationale}
                size="lg"
                className={cn("gap-2", isCritical && "bg-esi-1 hover:bg-esi-1/90")}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isOverriding ? 'Override & Confirm' : 'Confirm ESI Level'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Triage Assessment</DialogTitle>
            <DialogDescription>
              This will finalize the ESI level and begin patient routing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className={cn(
              "flex items-center justify-between p-4 rounded-lg",
              isCritical ? "bg-esi-1-bg" : "bg-muted"
            )}>
              <span className="font-medium">Final ESI Level</span>
              {selectedESI && <ESIBadge level={selectedESI} size="md" showLabel />}
            </div>

            {isOverriding && (
              <div className="text-sm text-muted-foreground">
                <p><strong>Override Reason:</strong> {overrideRationale && OVERRIDE_RATIONALE_LABELS[overrideRationale]}</p>
                {overrideNotes && <p className="mt-1"><strong>Notes:</strong> {overrideNotes}</p>}
              </div>
            )}

            {selectedESI && selectedESI <= 2 && (
              <div className="flex items-center gap-2 p-3 bg-esi-2-bg rounded-lg text-sm border border-[hsl(var(--esi-2-border))]">
                <AlertTriangle className="h-4 w-4 text-esi-2" />
                <span>High-acuity case will be immediately routed to physician</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className={cn(isCritical && "bg-esi-1 hover:bg-esi-1/90")}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Confirm & Route'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
