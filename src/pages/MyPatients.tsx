import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackBoard } from '@/integrations/supabase/hooks/useTrackBoard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ESIBadge } from '@/components/triage/ESIBadge';
import {
    Search,
    RefreshCw,
    Clock,
    User,
    Activity,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ESILevel } from '@/types/triage';

export default function MyPatients() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const { data, isLoading, refetch, isRefetching } = useTrackBoard();

    // Filter for only patients assigned to the current user
    const myPatients = useMemo(() => {
        if (!data?.cases || !user) return [];

        return data.cases.filter(c => {
            // Must be assigned to me
            if (c.assignedTo !== user.id) return false;

            // Filter out discharged patients
            if (c.status === 'discharged') return false;

            // Apply search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    c.patient?.firstName?.toLowerCase().includes(query) ||
                    c.patient?.lastName?.toLowerCase().includes(query) ||
                    c.patient?.mrn?.toLowerCase().includes(query) ||
                    c.patient?.chiefComplaint?.toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [data, user, searchQuery]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">My Patients</h1>
                    <p className="text-muted-foreground">
                        {myPatients.length} active patient{myPatients.length !== 1 ? 's' : ''} assigned to you
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isRefetching}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button onClick={() => navigate('/physician')}>
                        View All Patients
                    </Button>
                </div>
            </div>

            {/* Search */}
            <Card className="clinical-card">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, MRN, or complaint..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Patients Table */}
            <Card className="clinical-card">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Loading patients...
                        </div>
                    ) : myPatients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="bg-muted/50 p-4 rounded-full mb-4">
                                <User className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium">No assigned patients</h3>
                            <p className="text-muted-foreground mt-1 max-w-sm">
                                You don't have any active patients assigned to you right now.
                                Visit the Track Board to pick up new cases.
                            </p>
                            <Button className="mt-4" onClick={() => navigate('/physician')}>
                                Go to Track Board
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>ESI</TableHead>
                                    <TableHead>Complaint</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {myPatients.map((c) => {
                                    return (
                                        <TableRow key={c.id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {c.patient?.lastName}, {c.patient?.firstName}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {c.patient?.mrn}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {c.esiLevel ? (
                                                    <ESIBadge level={c.esiLevel as ESILevel} size="sm" />
                                                ) : (
                                                    <Badge variant="outline">Pending</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate">
                                                {c.patient?.chiefComplaint}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={c.status === 'in_treatment' ? 'default' : 'secondary'} className="capitalize">
                                                    {c.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {formatDistanceToNow(new Date(c.createdAt))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => navigate(`/physician?patientId=${c.patient?.id}`)}
                                                >
                                                    Open Chart
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>
        </div>
    );
}
