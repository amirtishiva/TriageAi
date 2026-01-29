import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { VitalsDisplay } from '@/components/triage/VitalsDisplay';
import { 
  ArrowLeft, 
  User, 
  Heart, 
  FileUp, 
  Search, 
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  File,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VitalSigns } from '@/types/triage';
import { toast } from 'sonner';
import { useCreatePatient, usePatients } from '@/integrations/supabase/hooks';
import { useRecordVitals } from '@/integrations/supabase/hooks/useVitalSigns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  chiefComplaint?: string;
}

export default function PatientIntakePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createPatient = useCreatePatient();
  const recordVitals = useRecordVitals();
  
  const [step, setStep] = useState<'demographics' | 'vitals' | 'complaint' | 'documents'>('demographics');
  const [isSearching, setIsSearching] = useState(false);
  const [patientFound, setPatientFound] = useState(false);
  const [patientNotFound, setPatientNotFound] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    mrn: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    chiefComplaint: '',
    allergies: '',
    medications: '',
    medicalHistory: '',
  });

  const [vitals, setVitals] = useState<VitalSigns>({
    heartRate: 0,
    bloodPressure: { systolic: 0, diastolic: 0 },
    respiratoryRate: 0,
    temperature: 0,
    oxygenSaturation: 0,
    painLevel: 0,
    timestamp: new Date(),
  });

  // Validation functions
  const validateDemographics = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateComplaint = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.chiefComplaint.trim()) {
      newErrors.chiefComplaint = 'Chief complaint is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleMRNSearch = async () => {
    if (!formData.mrn) return;
    setIsSearching(true);
    setPatientNotFound(false);
    setPatientFound(false);
    setExistingPatientId(null);
    
    try {
      const { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('mrn', formData.mrn)
        .maybeSingle();
      
      if (error) throw error;
      
      if (patient) {
        setPatientFound(true);
        setPatientNotFound(false);
        setExistingPatientId(patient.id);
        setFormData(prev => ({
          ...prev,
          firstName: patient.first_name,
          lastName: patient.last_name,
          dateOfBirth: patient.date_of_birth,
          gender: patient.gender,
          allergies: patient.allergies?.join(', ') || '',
          medications: patient.medications?.join(', ') || '',
          medicalHistory: patient.medical_history?.join(', ') || '',
        }));
        setErrors({});
      } else {
        setPatientNotFound(true);
        setPatientFound(false);
      }
    } catch (error) {
      console.error('Error searching patient:', error);
      toast.error('Failed to search for patient');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles: UploadedFile[] = Array.from(files).map((file, i) => ({
      id: `file-${Date.now()}-${i}`,
      name: file.name,
      type: file.type,
      size: file.size,
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleContinueToDemographics = () => {
    if (validateDemographics()) {
      setStep('vitals');
    }
  };

  const handleContinueToComplaint = () => {
    setStep('complaint');
  };

  const handleContinueToDocuments = () => {
    if (validateComplaint()) {
      setStep('documents');
    }
  };

  const generateMRN = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MRN-${timestamp}-${random}`;
  };

  const handleStartTriage = async () => {
    if (!user) {
      toast.error('You must be logged in to create a patient');
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let patientId = existingPatientId;
      
      // Create new patient if not found by MRN
      if (!patientId) {
        const mrn = formData.mrn || generateMRN();
        
        const newPatient = await createPatient.mutateAsync({
          mrn,
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender as 'male' | 'female' | 'other',
          chief_complaint: formData.chiefComplaint,
          allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : null,
          medications: formData.medications ? formData.medications.split(',').map(m => m.trim()) : null,
          medical_history: formData.medicalHistory ? formData.medicalHistory.split(',').map(h => h.trim()) : null,
          status: 'in_triage',
          is_returning: patientFound,
        });
        
        patientId = newPatient.id;
      } else {
        // Update existing patient with new chief complaint
        await supabase
          .from('patients')
          .update({
            chief_complaint: formData.chiefComplaint,
            status: 'in_triage',
            is_returning: true,
          })
          .eq('id', patientId);
      }

      // Record vitals if any were entered
      const hasAnyVital = vitals.heartRate > 0 || 
        vitals.bloodPressure.systolic > 0 || 
        vitals.bloodPressure.diastolic > 0 ||
        vitals.respiratoryRate > 0 ||
        vitals.temperature > 0 ||
        vitals.oxygenSaturation > 0 ||
        vitals.painLevel > 0;

      if (hasAnyVital && patientId) {
        await recordVitals.mutateAsync({
          patient_id: patientId,
          heart_rate: vitals.heartRate > 0 ? vitals.heartRate : null,
          systolic_bp: vitals.bloodPressure.systolic > 0 ? vitals.bloodPressure.systolic : null,
          diastolic_bp: vitals.bloodPressure.diastolic > 0 ? vitals.bloodPressure.diastolic : null,
          respiratory_rate: vitals.respiratoryRate > 0 ? vitals.respiratoryRate : null,
          temperature: vitals.temperature > 0 ? vitals.temperature : null,
          oxygen_saturation: vitals.oxygenSaturation > 0 ? vitals.oxygenSaturation : null,
          pain_level: vitals.painLevel,
          recorded_by: user.id,
        });
      }

      // Create initial triage case
      const { error: triageError } = await supabase
        .from('triage_cases')
        .insert({
          patient_id: patientId,
          status: 'in_triage',
        });

      if (triageError) {
        console.error('Error creating triage case:', triageError);
      }

      toast.success('Patient registered successfully');
      navigate(`/nurse/triage/${patientId}`);
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error('Failed to register patient. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 'demographics', label: 'Demographics', icon: User },
    { id: 'vitals', label: 'Vital Signs', icon: Heart },
    { id: 'complaint', label: 'Chief Complaint', icon: AlertTriangle },
    { id: 'documents', label: 'Documents', icon: FileUp },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  // Check if any vital has been entered
  const hasAnyVital = vitals.heartRate > 0 || 
    vitals.bloodPressure.systolic > 0 || 
    vitals.bloodPressure.diastolic > 0 ||
    vitals.respiratoryRate > 0 ||
    vitals.temperature > 0 ||
    vitals.oxygenSaturation > 0 ||
    vitals.painLevel > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
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
          <h1 className="text-2xl font-bold">New Patient Intake</h1>
          <p className="text-muted-foreground">Register patient and capture initial information</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary -z-10 transition-all duration-500"
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((s, i) => {
          const isActive = s.id === step;
          const isComplete = i < currentStepIndex;
          
          return (
            <button
              key={s.id}
              onClick={() => i <= currentStepIndex && setStep(s.id as typeof step)}
              className="flex flex-col items-center gap-2 z-10 focus-ring rounded-lg p-1"
              aria-label={`Step ${i + 1}: ${s.label}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                isComplete && 'bg-primary text-primary-foreground',
                isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                !isActive && !isComplete && 'bg-muted text-muted-foreground'
              )}>
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </div>
              <span className={cn(
                'text-xs font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="clinical-card">
        <CardContent className="p-6">
          {/* Demographics Step */}
          {step === 'demographics' && (
            <div className="space-y-6">
              {/* MRN Search */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium mb-2 block">
                  Search Existing Patient (Optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter MRN..."
                    value={formData.mrn}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, mrn: e.target.value }));
                      setPatientNotFound(false);
                      setPatientFound(false);
                      setExistingPatientId(null);
                    }}
                    className="max-w-xs"
                  />
                  <Button 
                    variant="secondary" 
                    onClick={handleMRNSearch}
                    disabled={isSearching || !formData.mrn}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2">Search</span>
                  </Button>
                </div>
                {patientFound && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-confidence-high">
                    <CheckCircle2 className="h-4 w-4" />
                    Patient found - data auto-populated
                  </div>
                )}
                {patientNotFound && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    No patient found with this MRN. Please enter details manually.
                  </div>
                )}
              </div>

              {/* Patient Info Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, firstName: e.target.value }));
                      if (errors.firstName) setErrors(prev => ({ ...prev, firstName: undefined }));
                    }}
                    placeholder="Enter first name"
                    className={cn(errors.firstName && "border-destructive")}
                    aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                  />
                  {errors.firstName && (
                    <p id="firstName-error" className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, lastName: e.target.value }));
                      if (errors.lastName) setErrors(prev => ({ ...prev, lastName: undefined }));
                    }}
                    placeholder="Enter last name"
                    className={cn(errors.lastName && "border-destructive")}
                    aria-invalid={!!errors.lastName}
                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                  />
                  {errors.lastName && (
                    <p id="lastName-error" className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }));
                      if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: undefined }));
                    }}
                    className={cn("font-vitals", errors.dateOfBirth && "border-destructive")}
                    aria-invalid={!!errors.dateOfBirth}
                    aria-describedby={errors.dateOfBirth ? "dob-error" : undefined}
                  />
                  {errors.dateOfBirth && (
                    <p id="dob-error" className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(v) => {
                      setFormData(prev => ({ ...prev, gender: v }));
                      if (errors.gender) setErrors(prev => ({ ...prev, gender: undefined }));
                    }}
                  >
                    <SelectTrigger 
                      id="gender"
                      className={cn(errors.gender && "border-destructive")}
                      aria-invalid={!!errors.gender}
                      aria-describedby={errors.gender ? "gender-error" : undefined}
                    >
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p id="gender-error" className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.gender}
                    </p>
                  )}
                </div>
              </div>

              {/* Allergies */}
              <div className="space-y-2">
                <Label htmlFor="allergies">Known Allergies</Label>
                <Input
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
                  placeholder="e.g., Penicillin, Sulfa drugs (or NKDA)"
                />
              </div>

              {/* Navigation */}
              <div className="flex justify-end">
                <Button onClick={handleContinueToDemographics}>
                  Continue to Vitals
                </Button>
              </div>
            </div>
          )}

          {/* Vitals Step */}
          {step === 'vitals' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    value={vitals.heartRate || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, heartRate: +e.target.value }))}
                    placeholder="72"
                    className="font-vitals"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systolic">Systolic BP (mmHg)</Label>
                  <Input
                    id="systolic"
                    type="number"
                    value={vitals.bloodPressure.systolic || ''}
                    onChange={(e) => setVitals(prev => ({ 
                      ...prev, 
                      bloodPressure: { ...prev.bloodPressure, systolic: +e.target.value }
                    }))}
                    placeholder="120"
                    className="font-vitals"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diastolic">Diastolic BP (mmHg)</Label>
                  <Input
                    id="diastolic"
                    type="number"
                    value={vitals.bloodPressure.diastolic || ''}
                    onChange={(e) => setVitals(prev => ({ 
                      ...prev, 
                      bloodPressure: { ...prev.bloodPressure, diastolic: +e.target.value }
                    }))}
                    placeholder="80"
                    className="font-vitals"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="respRate">Respiratory Rate (/min)</Label>
                  <Input
                    id="respRate"
                    type="number"
                    value={vitals.respiratoryRate || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, respiratoryRate: +e.target.value }))}
                    placeholder="16"
                    className="font-vitals"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spo2">SpO2 (%)</Label>
                  <Input
                    id="spo2"
                    type="number"
                    value={vitals.oxygenSaturation || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, oxygenSaturation: +e.target.value }))}
                    placeholder="98"
                    className="font-vitals"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temp">Temperature (°F)</Label>
                  <Input
                    id="temp"
                    type="number"
                    step="0.1"
                    value={vitals.temperature || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, temperature: +e.target.value }))}
                    placeholder="98.6"
                    className="font-vitals"
                  />
                </div>
              </div>

              {/* Pain Level Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Pain Level (0-10)</Label>
                  <span className="font-vitals text-2xl font-bold">
                    {vitals.painLevel}
                  </span>
                </div>
                <Slider
                  value={[vitals.painLevel]}
                  onValueChange={([value]) => setVitals(prev => ({ ...prev, painLevel: value }))}
                  max={10}
                  step={1}
                  className="w-full"
                  aria-label="Pain level"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>No Pain</span>
                  <span>Worst Pain</span>
                </div>
              </div>

              {/* Preview */}
              {hasAnyVital && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <Label className="text-sm mb-3 block">Vitals Preview</Label>
                  <VitalsDisplay vitals={vitals} />
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('demographics')}>
                  Back
                </Button>
                <Button onClick={handleContinueToComplaint}>
                  Continue to Chief Complaint
                </Button>
              </div>
            </div>
          )}

          {/* Chief Complaint Step */}
          {step === 'complaint' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="chiefComplaint">Chief Complaint *</Label>
                <Textarea
                  id="chiefComplaint"
                  value={formData.chiefComplaint}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }));
                    if (errors.chiefComplaint) setErrors(prev => ({ ...prev, chiefComplaint: undefined }));
                  }}
                  placeholder="Describe the patient's primary reason for visit, symptoms, and relevant history..."
                  rows={4}
                  className={cn(errors.chiefComplaint && "border-destructive")}
                  aria-invalid={!!errors.chiefComplaint}
                  aria-describedby={errors.chiefComplaint ? "complaint-error" : undefined}
                />
                {errors.chiefComplaint ? (
                  <p id="complaint-error" className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.chiefComplaint}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Include onset, duration, severity, and any associated symptoms
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="medications">Current Medications</Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => setFormData(prev => ({ ...prev, medications: e.target.value }))}
                  placeholder="List current medications, dosages, and frequency..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicalHistory">Relevant Medical History</Label>
                <Textarea
                  id="medicalHistory"
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData(prev => ({ ...prev, medicalHistory: e.target.value }))}
                  placeholder="Previous conditions, surgeries, chronic illnesses..."
                  rows={2}
                />
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('vitals')}>
                  Back
                </Button>
                <Button onClick={handleContinueToDocuments}>
                  Continue to Documents
                </Button>
              </div>
            </div>
          )}

          {/* Documents Step */}
          {step === 'documents' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center focus-within:border-primary transition-colors">
                <FileUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Upload Medical Documents</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Lab reports, discharge summaries, referrals, imaging results
                </p>
                <label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    aria-label="Upload files"
                  />
                  <Button variant="secondary" asChild>
                    <span>Choose Files</span>
                  </Button>
                </label>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Documents</Label>
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div 
                        key={file.id} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => removeFile(file.id)}
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Documents will be analyzed by AI to extract relevant clinical information for triage assessment.
              </p>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('complaint')}>
                  Back
                </Button>
                <Button 
                  onClick={handleStartTriage} 
                  size="lg" 
                  className="gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Start AI Triage
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
