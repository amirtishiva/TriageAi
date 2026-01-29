import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { ESIBadge, ESILevelSelector, ESICircle } from '@/components/triage/ESIBadge';
import { VitalsDisplay } from '@/components/triage/VitalsDisplay';
import { SBARDisplay } from '@/components/triage/SBARDisplay';
import { ConfidenceIndicator } from '@/components/triage/ConfidenceIndicator';
import { mockPatients, generateAITriageResult } from '@/data/mockData';
import { 
  ESILevel, 
  OverrideRationale, 
  OVERRIDE_RATIONALE_LABELS,
  ESI_LABELS
} from '@/types/triage';
import { 
  ArrowLeft, 
  Bot, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Sparkles,
  Clock,
  FileText,
  Wifi,
  Save,
  RotateCcw,
  Edit3,
  MapPin,
  Printer
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TriageScreen() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  
  const patient = patientId === 'new-patient' 
    ? mockPatients[5]
    : mockPatients.find(p => p.id === patientId) || mockPatients[0];
  
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [aiResult, setAIResult] = useState<ReturnType<typeof generateAITriageResult> | null>(null);
  const [selectedESI, setSelectedESI] = useState<ESILevel | null>(null);
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideRationale, setOverrideRationale] = useState<OverrideRationale | ''>('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = generateAITriageResult(patient);
      setAIResult(result);
      setSelectedESI(result.draftESI);
      setIsAnalyzing(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [patient]);

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
    if (isOverriding && !overrideRationale) return;
    setShowConfirmDialog(true);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
      navigate('/queue');
    }, 1500);
  };

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Patient not found</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Page Header - Based on reference image 2 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">CLINICAL DECISION SUPPORT TRIAGE</h1>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                STEP 2: VALIDATION
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Reviewing AI-Suggested Acuity & Routing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <Save className="h-3.5 w-3.5" />
            Save Draft
          </Button>
          <Button size="sm" className="gap-1.5 h-8 bg-confidence-high hover:bg-confidence-high/90">
            Finalize & Route
          </Button>
        </div>
      </div>

      {/* 3-Column Layout - Based on reference images 1 & 2 */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-180px)]">
        
        {/* Left Column - Patient Vitals (3 cols) */}
        <div className="col-span-3 space-y-4 overflow-y-auto">
          {/* Patient Header Card */}
          <Card className="clinical-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {patient.firstName[0]}{patient.lastName[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {patient.firstName} {patient.lastName}, {patient.age}{patient.gender.charAt(0).toUpperCase()}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">{patient.mrn}</p>
                  <p className="text-xs text-muted-foreground">DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                </div>
              </div>
              
              {/* FHIR Connection Status */}
              <div className="flex items-center gap-2 text-xs text-confidence-high">
                <Wifi className="h-3 w-3" />
                <span>Live FHIR Connection: Active</span>
              </div>
            </CardContent>
          </Card>

          {/* Current Vitals - Based on reference image 1 */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              CURRENT VITALS (LAST PULL: 2M AGO)
            </p>
            <div className="space-y-2">
              <VitalsDisplay vitals={patient.vitals} layout="grid" showLabels />
            </div>
          </div>
        </div>

        {/* Center Column - Clinical Entry (5 cols) */}
        <div className="col-span-5 space-y-4 overflow-y-auto">
          {/* Patient Data Intake - Based on reference image 2 */}
          <Card className="clinical-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4 text-primary" />
                Patient Data Intake
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vital Inputs Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">BP (mmHg)</Label>
                  <Input 
                    value={`${patient.vitals.bloodPressure.systolic}/${patient.vitals.bloodPressure.diastolic}`}
                    className={cn(
                      'font-vitals text-lg h-10',
                      patient.vitals.bloodPressure.systolic > 140 && 'text-esi-2 border-esi-2/50'
                    )}
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Heart Rate (BPM)</Label>
                  <Input 
                    value={patient.vitals.heartRate}
                    className={cn(
                      'font-vitals text-lg h-10',
                      patient.vitals.heartRate > 100 && 'text-esi-2 border-esi-2/50'
                    )}
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Resp Rate (BR/M)</Label>
                  <Input 
                    value={patient.vitals.respiratoryRate}
                    className="font-vitals text-lg h-10"
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">SPO2 (%)</Label>
                  <Input 
                    value={patient.vitals.oxygenSaturation}
                    className={cn(
                      'font-vitals text-lg h-10',
                      patient.vitals.oxygenSaturation < 95 && 'text-esi-1 border-esi-1/50'
                    )}
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Temp (°F)</Label>
                  <Input 
                    value={patient.vitals.temperature.toFixed(1)}
                    className="font-vitals text-lg h-10"
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Pain (1-10)</Label>
                  <Input 
                    value={patient.vitals.painLevel}
                    className={cn(
                      'font-vitals text-lg h-10',
                      patient.vitals.painLevel >= 8 && 'text-esi-1 border-esi-1/50'
                    )}
                    readOnly
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clinical Narrative */}
          <Card className="clinical-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Clinical Narrative
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Chief Complaint</Label>
                <div className="mt-1 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-sm font-medium">{patient.chiefComplaint}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">History of Present Illness (HPI)</Label>
                <div className="mt-1 p-3 bg-muted/30 rounded-lg border border-border/50 text-sm">
                  {aiResult ? (
                    <p className="leading-relaxed">
                      {patient.age}yo {patient.gender} presents with {patient.chiefComplaint.toLowerCase()}. 
                      Patient reports <span className="underline decoration-dotted cursor-help">{aiResult.extractedSymptoms.slice(0, 2).join(' and ').toLowerCase()}</span>. 
                      {patient.medicalHistory?.length ? ` Known history of ${patient.medicalHistory.join(', ').toLowerCase()}.` : ''} 
                      Patient is currently <span className="underline decoration-dotted cursor-help">{patient.vitals.heartRate > 100 ? 'tachycardic' : 'hemodynamically stable'}</span> ({patient.vitals.heartRate} bpm).
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating clinical narrative...
                    </div>
                  )}
                </div>
              </div>

              {/* FHIR Enrichment Badge */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 text-primary text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  FHIR Enrichment Active
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically cross-referencing previous visits. AI detected correlation in diagnosis codes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Smart Insights (4 cols) */}
        <div className="col-span-4 space-y-4 overflow-y-auto">
          {/* AI Recommendation Panel - Based on reference images 1 & 2 */}
          <Card className={cn(
            'clinical-card border-2',
            aiResult && aiResult.draftESI <= 2 && 'border-esi-2/50'
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Smart Insights
                </CardTitle>
                {aiResult && (
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                    CONFIDENCE: {aiResult.confidence}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Bot className="h-12 w-12 text-primary animate-pulse" />
                  <p className="text-sm mt-4">AI Analysis in Progress...</p>
                  <Loader2 className="h-4 w-4 animate-spin mt-2" />
                </div>
              ) : aiResult && (
                <>
                  {/* AI Recommendation Box */}
                  <div className={cn(
                    'p-4 rounded-lg',
                    aiResult.draftESI === 1 && 'bg-esi-1-bg border border-esi-1/30',
                    aiResult.draftESI === 2 && 'bg-esi-2-bg border border-esi-2/30',
                    aiResult.draftESI === 3 && 'bg-esi-3-bg border border-esi-3/30',
                    aiResult.draftESI >= 4 && 'bg-muted/30 border border-border',
                  )}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                      AI RECOMMENDATION
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className={cn(
                          'text-4xl font-bold font-vitals',
                          aiResult.draftESI === 1 && 'text-esi-1',
                          aiResult.draftESI === 2 && 'text-esi-2',
                          aiResult.draftESI === 3 && 'text-esi-3',
                        )}>
                          ESI LEVEL {aiResult.draftESI}
                        </h2>
                        <p className="text-xs mt-1">
                          {ESI_LABELS[aiResult.draftESI].label}: {ESI_LABELS[aiResult.draftESI].description}
                        </p>
                      </div>
                      {aiResult.draftESI <= 2 && (
                        <AlertTriangle className="h-8 w-8 text-esi-2" />
                      )}
                    </div>
                  </div>

                  {/* Confirm/Override Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      className="h-10 gap-2 bg-primary hover:bg-primary/90"
                      onClick={() => !isOverriding && handleConfirm()}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-10 gap-2"
                      onClick={() => setIsOverriding(!isOverriding)}
                    >
                      <Edit3 className="h-4 w-4" />
                      Override
                    </Button>
                  </div>

                  {/* Override Section */}
                  {isOverriding && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs uppercase">Override Rationale</Label>
                        <Badge variant="outline" className="text-[9px] text-esi-1 border-esi-1/30">
                          REQUIRED
                        </Badge>
                      </div>
                      <Select value={overrideRationale} onValueChange={(v) => setOverrideRationale(v as OverrideRationale)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select reason for override..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(OVERRIDE_RATIONALE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea 
                        placeholder="Optional clinical note for override..."
                        value={overrideNotes}
                        onChange={(e) => setOverrideNotes(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                      <ESILevelSelector value={selectedESI!} onChange={handleESIChange} />
                    </div>
                  )}

                  {/* SBAR Summary - Compact Grid */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                      REASONING SUMMARY (SBAR)
                    </p>
                    <SBARDisplay sbar={aiResult.sbar} layout="compact" />
                  </div>

                  {/* Rationale Logic */}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      RATIONALE LOGIC
                    </p>
                    {aiResult.influencingFactors.slice(0, 3).map((factor, i) => (
                      <div 
                        key={i}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg text-xs',
                          factor.impact === 'increases' && 'bg-esi-2-bg/50',
                          factor.impact === 'neutral' && 'bg-muted/30',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {factor.impact === 'increases' && <span className="text-esi-1">!</span>}
                          <span>{factor.factor}</span>
                        </div>
                        <Badge variant="outline" className="text-[9px]">
                          {factor.category === 'vital' ? 'High Weight' : factor.category}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {/* Suggested Destination */}
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                      SUGGESTED DESTINATION
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Main ED - Zone B</span>
                      <Badge className="bg-esi-2 text-foreground text-[9px]">Wait: 22m</Badge>
                    </div>
                  </div>

                  {/* Print Button */}
                  <Button variant="outline" className="w-full gap-2">
                    <Printer className="h-4 w-4" />
                    Print Triage Summary
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Triage Assessment</DialogTitle>
            <DialogDescription>
              This will finalize the ESI level and begin patient routing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="font-medium">Final ESI Level</span>
              {selectedESI && <ESIBadge level={selectedESI} size="lg" showLabel />}
            </div>
            {isOverriding && overrideRationale && (
              <div className="text-sm text-muted-foreground">
                <p><strong>Override Reason:</strong> {OVERRIDE_RATIONALE_LABELS[overrideRationale]}</p>
                {overrideNotes && <p className="mt-1"><strong>Notes:</strong> {overrideNotes}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isSubmitting ? 'Submitting...' : 'Confirm & Route'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
