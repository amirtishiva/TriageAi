import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  File
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VitalSigns } from '@/types/triage';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

export default function PatientIntakePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'demographics' | 'vitals' | 'complaint' | 'documents'>('demographics');
  const [isSearching, setIsSearching] = useState(false);
  const [patientFound, setPatientFound] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
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

  const handleMRNSearch = () => {
    if (!formData.mrn) return;
    setIsSearching(true);
    
    // Simulate search
    setTimeout(() => {
      setIsSearching(false);
      if (formData.mrn === 'MRN-2024-002') {
        setPatientFound(true);
        setFormData(prev => ({
          ...prev,
          firstName: 'Sarah',
          lastName: 'Johnson',
          dateOfBirth: '1991-05-15',
          gender: 'female',
          allergies: '',
          medications: 'Albuterol inhaler, Fluticasone',
          medicalHistory: 'Asthma - severe persistent',
        }));
      }
    }, 1000);
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

  const handleStartTriage = () => {
    // In a real app, this would save the patient and navigate to triage
    navigate('/triage/new-patient');
  };

  const steps = [
    { id: 'demographics', label: 'Demographics', icon: User },
    { id: 'vitals', label: 'Vital Signs', icon: Heart },
    { id: 'complaint', label: 'Chief Complaint', icon: AlertTriangle },
    { id: 'documents', label: 'Documents', icon: FileUp },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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
              className="flex flex-col items-center gap-2 z-10"
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
                    onChange={(e) => setFormData(prev => ({ ...prev, mrn: e.target.value }))}
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
              </div>

              {/* Patient Info Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, gender: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Button onClick={() => setStep('vitals')}>
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
                  <Label>Heart Rate (bpm)</Label>
                  <Input
                    type="number"
                    value={vitals.heartRate || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, heartRate: +e.target.value }))}
                    placeholder="72"
                    className="font-vitals"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Systolic BP (mmHg)</Label>
                  <Input
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
                  <Label>Diastolic BP (mmHg)</Label>
                  <Input
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
                  <Label>Respiratory Rate (/min)</Label>
                  <Input
                    type="number"
                    value={vitals.respiratoryRate || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, respiratoryRate: +e.target.value }))}
                    placeholder="16"
                    className="font-vitals"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SpO2 (%)</Label>
                  <Input
                    type="number"
                    value={vitals.oxygenSaturation || ''}
                    onChange={(e) => setVitals(prev => ({ ...prev, oxygenSaturation: +e.target.value }))}
                    placeholder="98"
                    className="font-vitals"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature (°F)</Label>
                  <Input
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
                <Label>Pain Level (0-10)</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={vitals.painLevel}
                    onChange={(e) => setVitals(prev => ({ ...prev, painLevel: +e.target.value }))}
                    className="flex-1 h-2 rounded-full appearance-none bg-gradient-to-r from-confidence-high via-confidence-medium to-esi-1 cursor-pointer"
                  />
                  <span className="font-vitals text-2xl font-bold w-8 text-center">
                    {vitals.painLevel}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>No Pain</span>
                  <span>Worst Pain</span>
                </div>
              </div>

              {/* Preview */}
              {vitals.heartRate > 0 && (
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
                <Button onClick={() => setStep('complaint')}>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                  placeholder="Describe the patient's primary reason for visit, symptoms, and relevant history..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Include onset, duration, severity, and any associated symptoms
                </p>
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
                <Button onClick={() => setStep('documents')}>
                  Continue to Documents
                </Button>
              </div>
            </div>
          )}

          {/* Documents Step */}
          {step === 'documents' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
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
                <Button onClick={handleStartTriage} size="lg" className="gap-2">
                  Start AI Triage
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
