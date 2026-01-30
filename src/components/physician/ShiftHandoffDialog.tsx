import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackBoard } from '@/integrations/supabase/hooks/useTrackBoard';
import { supabase } from '@/integrations/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ClipboardList, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { ESIBadge } from '@/components/triage/ESIBadge';
import { ESILevel } from '@/types/triage';

interface ShiftHandoffDialogProps {
    trigger?: React.ReactNode;
}

export function ShiftHandoffDialog({ trigger }: ShiftHandoffDialogProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch my active patients
    const { data } = useTrackBoard();

    const myPatients = useMemo(() => {
        if (!data?.cases || !user) return [];
        return data.cases.filter(c => c.assignedTo === user.id && c.status !== 'discharged');
    }, [data, user]);

    // Initialize selected patients when dialog opens
    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen && myPatients.length > 0) {
            setSelectedPatientIds(myPatients.map(p => p.patientId));
        }
    };

    const togglePatient = (patientId: string) => {
        setSelectedPatientIds(prev =>
            prev.includes(patientId)
                ? prev.filter(id => id !== patientId)
                : [...prev, patientId]
        );
    };

    const generateAISummary = () => {
        const summary = `Shift Handoff Summary:\n\nActive Patients: ${selectedPatientIds.length}\nCritical Cases: ${myPatients.filter(p => selectedPatientIds.includes(p.patientId) && p.esiLevel <= 2).length}\n\nKey actions pending...`;
        setNotes(summary);
        toast.success('AI Draft generated');
    };

    const handleSubmit = async () => {
        if (!user) return;
        if (selectedPatientIds.length === 0) {
            toast.error('Select at least one patient to hand off');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await (supabase
                .from('shift_handoffs' as any)
                .insert({
                    sender_id: user.id,
                    patient_ids: selectedPatientIds,
                    notes: notes,
                }) as any);

            if (error) throw error;

            toast.success('Shift handoff recorded successfully');
            setOpen(false);
            setNotes('');
        } catch (error) {
            console.error('Handoff failed:', error);
            toast.error('Failed to submit handoff');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Shift Handoff
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Complete Shift Handoff</DialogTitle>
                    <DialogDescription>
                        Select patients to transfer to the incoming physician team.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Select Patients ({selectedPatientIds.length})</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() => setSelectedPatientIds(selectedPatientIds.length === myPatients.length ? [] : myPatients.map(p => p.patientId))}
                            >
                                {selectedPatientIds.length === myPatients.length ? 'Deselect All' : 'Select All'}
                            </Button>
                        </div>

                        <ScrollArea className="h-[200px] border rounded-md p-2">
                            {myPatients.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                                    No active patients assigned.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {myPatients.map(patient => (
                                        <div key={patient.id} className="flex items-start space-x-2 p-2 hover:bg-muted/50 rounded-md">
                                            <Checkbox
                                                id={`patient-${patient.id}`}
                                                checked={selectedPatientIds.includes(patient.patientId)}
                                                onCheckedChange={() => togglePatient(patient.patientId)}
                                            />
                                            <div className="grid gap-1.5 leading-none w-full">
                                                <label
                                                    htmlFor={`patient-${patient.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center justify-between"
                                                >
                                                    <span>{patient.patient?.lastName}, {patient.patient?.firstName}</span>
                                                    <ESIBadge level={patient.esiLevel as ESILevel} size="sm" />
                                                </label>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {patient.patient?.chiefComplaint}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Handoff Notes</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-xs text-purple-600 gap-1"
                                onClick={generateAISummary}
                            >
                                <Wand2 className="h-3 w-3" />
                                AI Auto-Summarize
                            </Button>
                        </div>
                        <Textarea
                            placeholder="Enter comprehensive handoff notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || selectedPatientIds.length === 0}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Handoff
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
