import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ESIBadge } from '@/components/triage/ESIBadge';
import { ESILevel } from '@/types/triage';
import { useAuditLogs, useAuditLogStats } from '@/integrations/supabase/hooks/useAuditLogs';
import type { Database } from '@/integrations/supabase/types';
import { 
  Search, 
  Calendar,
  Download,
  Filter,
  FileText,
  CheckCircle2,
  Edit3,
  AlertTriangle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { toast } from 'sonner';

type AuditAction = Database['public']['Enums']['audit_action'];

const eventTypeConfig: Record<AuditAction, { 
  label: string; 
  icon: typeof FileText; 
  color: string 
}> = {
  'case_created': { 
    label: 'Case Created', 
    icon: FileText, 
    color: 'bg-primary/10 text-primary border-primary/20' 
  },
  'ai_triage_completed': { 
    label: 'AI Draft', 
    icon: FileText, 
    color: 'bg-primary/10 text-primary border-primary/20' 
  },
  'triage_validated': { 
    label: 'Validation', 
    icon: CheckCircle2, 
    color: 'bg-confidence-high/10 text-confidence-high border-confidence-high/20' 
  },
  'triage_overridden': { 
    label: 'Override', 
    icon: Edit3, 
    color: 'bg-esi-2/10 text-esi-2 border-esi-2/20' 
  },
  'case_assigned': { 
    label: 'Assignment', 
    icon: CheckCircle2, 
    color: 'bg-status-active/10 text-status-active border-status-active/20' 
  },
  'case_acknowledged': { 
    label: 'Acknowledgment', 
    icon: CheckCircle2, 
    color: 'bg-status-active/10 text-status-active border-status-active/20' 
  },
  'escalation_triggered': { 
    label: 'Escalation', 
    icon: AlertTriangle, 
    color: 'bg-esi-1/10 text-esi-1 border-esi-1/20' 
  },
  'escalation_resolved': { 
    label: 'Escalation Resolved', 
    icon: CheckCircle2, 
    color: 'bg-confidence-high/10 text-confidence-high border-confidence-high/20' 
  },
  'status_changed': { 
    label: 'Status Changed', 
    icon: Clock, 
    color: 'bg-muted text-muted-foreground border-muted' 
  },
};

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState('all');

  const { data: logs, isLoading, refetch, isRefetching } = useAuditLogs();
  const { data: stats, isLoading: statsLoading } = useAuditLogStats();

  // Filter logs based on all criteria including date range
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    return logs
      .filter(log => {
        // Event type filter
        if (eventTypeFilter !== 'all' && log.action !== eventTypeFilter) return false;
        
        // Date range filter
        const logDate = parseISO(log.created_at);
        if (dateRange === 'today' && !isToday(logDate)) return false;
        if (dateRange === 'week' && !isThisWeek(logDate)) return false;
        if (dateRange === 'month' && !isThisMonth(logDate)) return false;
        
        // Search filter
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
          (log.patient_name?.toLowerCase().includes(searchLower)) ||
          (log.patient_mrn?.toLowerCase().includes(searchLower)) ||
          (log.action?.toLowerCase().includes(searchLower)) ||
          (typeof log.details === 'object' && JSON.stringify(log.details).toLowerCase().includes(searchLower))
        );
      });
  }, [logs, searchQuery, eventTypeFilter, dateRange]);

  const handleExport = () => {
    if (!filteredLogs.length) {
      toast.error('No logs to export');
      return;
    }

    // Generate CSV with real data from database
    const headers = ['Timestamp', 'Event', 'Patient', 'MRN', 'ESI', 'User ID', 'Details'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        format(parseISO(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.action,
        log.patient_name || 'N/A',
        log.patient_mrn || 'N/A',
        log.esi_level || 'N/A',
        log.user_id || 'System',
        typeof log.details === 'object' ? JSON.stringify(log.details).replace(/,/g, ';').replace(/"/g, "'") : 'N/A'
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
    
    toast.success(`Exported ${filteredLogs.length} audit log entries`);
  };

  const getDetailsText = (details: unknown): string => {
    if (!details) return '';
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
      const d = details as Record<string, unknown>;
      if (d.notes) return String(d.notes);
      if (d.rationale) return String(d.rationale);
      if (d.reason) return String(d.reason);
      return JSON.stringify(details);
    }
    return '';
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Complete record of AI drafts, validations, overrides, and escalations
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
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="clinical-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Events</p>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold font-vitals mt-1">{stats?.total || 0}</p>
            )}
          </CardContent>
        </Card>
        <Card className="clinical-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">AI Confirmations</p>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold font-vitals mt-1 text-confidence-high">
                {stats?.validations || 0}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="clinical-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Override Rate</p>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold font-vitals mt-1 text-esi-2">{stats?.overrideRate || '0.0'}%</p>
            )}
          </CardContent>
        </Card>
        <Card className="clinical-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Escalations</p>
            {statsLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold font-vitals mt-1 text-esi-1">{stats?.escalations || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="clinical-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search audit logs"
              />
            </div>

            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[180px]" aria-label="Filter by event type">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="case_created">Case Created</SelectItem>
                <SelectItem value="ai_triage_completed">AI Drafts</SelectItem>
                <SelectItem value="triage_validated">Validations</SelectItem>
                <SelectItem value="triage_overridden">Overrides</SelectItem>
                <SelectItem value="escalation_triggered">Escalations</SelectItem>
                <SelectItem value="case_acknowledged">Acknowledgments</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]" aria-label="Filter by date range">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
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
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>ESI</TableHead>
                  <TableHead className="hidden lg:table-cell max-w-md">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <p className="text-muted-foreground">
                        {searchQuery || eventTypeFilter !== 'all' || dateRange !== 'all'
                          ? 'No logs match your filters'
                          : 'No audit logs available'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const config = eventTypeConfig[log.action] || eventTypeConfig['status_changed'];
                    const Icon = config.icon;
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{format(parseISO(log.created_at), 'MMM d, h:mm a')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('gap-1.5', config.color)}>
                            <Icon className="h-3 w-3" />
                            <span className="hidden sm:inline">{config.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.patient_name ? (
                            <div>
                              <p className="font-medium text-sm">{log.patient_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{log.patient_mrn}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.esi_level ? (
                            <ESIBadge level={log.esi_level as ESILevel} size="sm" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-md hidden lg:table-cell">
                          <p className="text-sm text-muted-foreground truncate">
                            {getDetailsText(log.details)}
                          </p>
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
    </div>
  );
}
