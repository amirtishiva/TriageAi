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
import { useAuth } from '@/contexts/AuthContext';
import { usePatient } from '@/integrations/supabase/hooks/usePatients';
import { useLatestVitals } from '@/integrations/supabase/hooks/useVitalSigns';
import { useAITriage, useValidateTriage, useTriageCases, usePatientDocuments } from '@/integrations/supabase/hooks';
import { supabase } from '@/integrations/supabase/client';
import {
  ESILevel,
  AITriageResult,
  OverrideRationale,
  OVERRIDE_RATIONALE_LABELS,
  ESI_LABELS,
  VitalSigns
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
  History,
  FileText,
  File,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TriageScreen() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { user } = useAuth();
  const { activateEmergencyMode, deactivateEmergencyMode, checkCriticalState } = useEmergency();

  // Fetch patient data from database
  const { data: patient, isLoading: isLoadingPatient } = usePatient(patientId);
  const { data: latestVitals } = useLatestVitals(patientId);
  const { data: documents } = usePatientDocuments(patientId);

  // AI Triage mutation
  const aiTriageMutation = useAITriage();
  const validateMutation = useValidateTriage();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisTimeout, setAnalysisTimeout] = useState(false);
  const [aiResult, setAIResult] = useState<AITriageResult | null>(null);
  const [triageCaseId, setTriageCaseId] = useState<string | null>(null);
  const [selectedESI, setSelectedESI] = useState<ESILevel | null>(null);
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideRationale, setOverrideRationale] = useState<OverrideRationale | ''>('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate age from date of birth
  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Convert database vitals to app format
  const formatVitals = (): VitalSigns | null => {
    if (!latestVitals) return null;
    return {
      heartRate: latestVitals.heart_rate || 0,
      bloodPressure: {
        systolic: latestVitals.systolic_bp || 0,
        diastolic: latestVitals.diastolic_bp || 0,
      },
      respiratoryRate: latestVitals.respiratory_rate || 0,
      temperature: Number(latestVitals.temperature) || 0,
      oxygenSaturation: latestVitals.oxygen_saturation || 0,
      painLevel: latestVitals.pain_level || 0,
      timestamp: new Date(latestVitals.recorded_at),
    };
  };

  // Fetch existing triage cases for this patient
  const { data: existingCases } = useTriageCases({ patientId, enabled: !!patientId });

  // Trigger AI analysis when patient data is loaded AND no existing case found
  useEffect(() => {
    // Find a case that has actually been analyzed (has AI results)
    const analyzedCase = existingCases && existingCases.length > 0
      ? existingCases.find(c => c.ai_draft_esi !== null)
      : null;

    // Find any case (even if just a shell from intake)
    const shellCase = existingCases && existingCases.length > 0 ? existingCases[0] : null;

    if (analyzedCase) {
      setTriageCaseId(analyzedCase.id);

      // Parse influencing factors from JSON
      let influencers: any[] = [];
      try {
        if (analyzedCase.ai_influencing_factors) {
          influencers = typeof analyzedCase.ai_influencing_factors === 'string'
            ? JSON.parse(analyzedCase.ai_influencing_factors)
            : analyzedCase.ai_influencing_factors;
        }
      } catch (e) {
        console.error('Error parsing influencing factors', e);
      }

      const getMappedRationale = (dbRationale: string | null): OverrideRationale | '' => {
        if (!dbRationale) return '';
        const map: Record<string, OverrideRationale> = {
          'clinical_judgment': 'clinical-judgment',
          'additional_findings': 'additional-findings',
          'patient_history': 'patient-history',
          'vital_change': 'vital-change',
          'symptom_evolution': 'symptom-evolution',
          'family_concern': 'family-concern',
          'other': 'other'
        };
        return map[dbRationale] || '';
      };

      const validatedEsiNum = analyzedCase.validated_esi ? Number(analyzedCase.validated_esi) : undefined;
      const draftEsiNum = analyzedCase.ai_draft_esi ? Number(analyzedCase.ai_draft_esi) : undefined;
      const finalDraftESI = (draftEsiNum || validatedEsiNum || 3);

      const result: AITriageResult = {
        draftESI: finalDraftESI as ESILevel,
        confidence: analyzedCase.ai_confidence || 0,
        sbar: {
          situation: analyzedCase.ai_sbar_situation || '',
          background: analyzedCase.ai_sbar_background || '',
          assessment: analyzedCase.ai_sbar_assessment || '',
          recommendation: analyzedCase.ai_sbar_recommendation || '',
        },
        extractedSymptoms: analyzedCase.ai_extracted_symptoms || [],
        extractedTimeline: analyzedCase.ai_extracted_timeline || '',
        comorbidities: analyzedCase.ai_comorbidities || [],
        influencingFactors: influencers.map((f: any) => ({
          factor: f.factor || '',
          category: (f.category as any) || 'other',
          impact: (f.impact as any) || 'neutral',
          weight: f.weight || 0,
        })),
        generatedAt: new Date(analyzedCase.ai_generated_at || analyzedCase.created_at),
      };

      setAIResult(result);
      setSelectedESI(((validatedEsiNum || finalDraftESI) as ESILevel));
      setIsAnalyzing(false);

      // If confirmed/overridden previously, check override state
      if (analyzedCase.is_override) {
        setIsOverriding(true);
        setOverrideRationale(getMappedRationale(analyzedCase.override_rationale));
        setOverrideNotes(analyzedCase.override_notes || '');
      }

      return;
    }

    // Only run new analysis if no ANALYZED case exists
    // If a shell case exists (from intake), we will update it.
    if (patient && patientId && !aiResult && !aiTriageMutation.isPending && !isAnalyzing && !analyzedCase) {
      console.log('Triggering AI Analysis for patient:', patientId);
      setIsAnalyzing(true);
      setAnalysisTimeout(false);

      const vitals = formatVitals();
      const age = calculateAge(patient.date_of_birth);

      aiTriageMutation.mutate({
        patientId,
        chiefComplaint: patient.chief_complaint,
        vitals: vitals ? {
          heartRate: vitals.heartRate,
          systolicBp: vitals.bloodPressure.systolic,
          diastolicBp: vitals.bloodPressure.diastolic,
          respiratoryRate: vitals.respiratoryRate,
          temperature: vitals.temperature,
          oxygenSaturation: vitals.oxygenSaturation,
          painLevel: vitals.painLevel,
        } : undefined,
        allergies: patient.allergies || undefined,
        medications: patient.medications || undefined,
        medicalHistory: patient.medical_history || undefined,
        age,
        gender: patient.gender,
      }, {
        onSuccess: (data) => {
          setTriageCaseId(data.triageCaseId);
          const result: AITriageResult = {
            draftESI: data.aiResult.draftESI as ESILevel,
            confidence: data.aiResult.confidence,
            sbar: data.aiResult.sbar,
            extractedSymptoms: data.aiResult.extractedSymptoms,
            extractedTimeline: data.aiResult.timeline,
            comorbidities: data.aiResult.comorbidities,
            influencingFactors: data.aiResult.influencingFactors.map(f => ({
              factor: f.factor,
              category: f.category as 'vital' | 'symptom' | 'history' | 'age' | 'other',
              impact: f.impact as 'increases' | 'decreases' | 'neutral',
              weight: f.weight,
            })),
            generatedAt: new Date(),
          };
          setAIResult(result);
          setSelectedESI(result.draftESI);
          setIsAnalyzing(false);

          if (checkCriticalState(result.draftESI)) {
            activateEmergencyMode(patientId);
          }
        },
        onError: (error) => {
          console.error('AI Triage error:', error);
          toast.error('AI analysis failed. Please try again.');
          setIsAnalyzing(false);
        },
      });
    }
  }, [patient, patientId, latestVitals, existingCases, aiResult, isAnalyzing]);

  // Timeout handler for analysis
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAnalyzing) {
      timer = setTimeout(() => {
        setAnalysisTimeout(true);
      }, 15000); // 15 seconds threshold for "stuck" UI
    } else {
      setAnalysisTimeout(false);
    }
    return () => clearTimeout(timer);
  }, [isAnalyzing]);

  const handleRetryAnalysis = () => {
    setAIResult(null);
    setIsAnalyzing(false);
    setAnalysisTimeout(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      deactivateEmergencyMode();
    };
  }, [deactivateEmergencyMode]);

  // Update emergency state when ESI changes
  useEffect(() => {
    if (selectedESI && patientId && checkCriticalState(selectedESI)) {
      activateEmergencyMode(patientId);
    } else {
      deactivateEmergencyMode();
    }
  }, [selectedESI, patientId, activateEmergencyMode, deactivateEmergencyMode, checkCriticalState]);

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
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleSubmit = async () => {
    if (!triageCaseId || !selectedESI) return;

    setIsSubmitting(true);

    try {
      await validateMutation.mutateAsync({
        triageCaseId,
        action: isOverriding ? 'override' : 'confirm',
        overrideESI: isOverriding ? selectedESI : undefined,
        overrideRationale: isOverriding ? overrideRationale : undefined,
        overrideNotes: overrideNotes || undefined,
      });

      toast.success('Triage validated successfully');
      deactivateEmergencyMode();
      navigate('/nurse/queue');
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate triage. Please try again.');
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  if (!patientId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-fade-in-up">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <Stethoscope className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">No Patient Selected</h2>
          <p className="text-muted-foreground">Select a patient from the queue to start triage.</p>
        </div>
        <Button onClick={() => navigate('/nurse/queue')}>
          Go to Patient Queue
        </Button>
      </div>
    );
  }

  if (isLoadingPatient) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Patient not found</p>
      </div>
    );
  }

  const vitals = formatVitals();
  const age = calculateAge(patient.date_of_birth);
  const isCritical = selectedESI ? checkCriticalState(selectedESI) : false;
  const arrivalTime = new Date(patient.arrival_time);

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
                    {patient.last_name}, {patient.first_name}
                  </h2>
                  {patient.is_returning && (
                    <Badge variant="outline">
                      <History className="h-3 w-3 mr-1" />
                      Returning
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>{age}yo {patient.gender}</span>
                  <span className="font-mono">{patient.mrn}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Arrived {Math.round((Date.now() - arrivalTime.getTime()) / 60000)} min ago
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
              {patient.chief_complaint}
            </p>
          </div>

          {/* Vitals */}
          {vitals && (
            <div className="mt-4">
              <Label className="text-sm mb-2 block">Current Vital Signs</Label>
              <VitalsDisplay vitals={vitals} />
            </div>
          )}

          {/* Documents Section */}
          {documents && documents.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <Label className="text-sm mb-3 block flex items-center gap-2">
                <File className="h-4 w-4" />
                Medical Documents & AI Analysis
              </Label>
              <div className="grid gap-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="bg-muted/30 rounded-lg p-3 border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                            {doc.file_path.split('/').pop()}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase">
                            {doc.file_type.split('/')[1]} • {doc.file_size ? Math.round(doc.file_size / 1024) + ' KB' : ''}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`https://lszmnsypyckjlrqjshxa.supabase.co/storage/v1/object/public/patient-documents/${doc.file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View File
                      </a>
                    </div>

                    {/* AI Analysis Result Display */}
                    {(doc as any).analysis_result && (
                      <div className="bg-background rounded p-2 text-xs border border-border mt-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-primary mb-1">
                          <Sparkles className="h-3 w-3" />
                          <span className="font-semibold">AI Findings</span>
                        </div>
                        {/* Safe access to analysis_result properties since it's Json type */}
                        {(doc.analysis_result as any).diagnosis && (
                          <p><span className="font-medium">Diagnosis:</span> {(doc.analysis_result as any).diagnosis}</p>
                        )}
                        {(doc.analysis_result as any).summary && (
                          <p><span className="font-medium">Summary:</span> {(doc.analysis_result as any).summary}</p>
                        )}
                        {(doc.analysis_result as any).findings && Array.isArray((doc.analysis_result as any).findings) && (
                          <div className="mt-1">
                            <p className="font-medium mb-0.5">Key Findings:</p>
                            <ul className="list-disc list-inside pl-1 text-muted-foreground">
                              {(doc.analysis_result as any).findings.map((f: string, i: number) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
                SBAR summary with ESI recommendation using Gemini AI...
              </p>
              <div className="flex flex-col items-center gap-4 mt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing patient data...
                </div>
                {analysisTimeout && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryAnalysis}
                    className="animate-fade-in"
                  >
                    <History className="h-4 w-4 mr-2" />
                    Retry Analysis
                  </Button>
                )}
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
                  Gemini AI
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
                <span>This patient will be routed to a physician immediately.</span>
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
