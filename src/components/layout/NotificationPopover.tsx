import { useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, X, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { RealtimeAlert } from '@/integrations/supabase/hooks/useRealtimeAlerts';

interface NotificationPopoverProps {
    alerts: RealtimeAlert[];
    onDismiss: (id: string) => void;
    count: number;
}

export function NotificationPopover({ alerts, onDismiss, count }: NotificationPopoverProps) {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const handleCreateCase = (patientId: string) => {
        setOpen(false);
        navigate(`/physician?patientId=${patientId}`);
    };

    const getAlertData = (alert: RealtimeAlert) => {
        let esiLevel = 0;
        let message = '';
        let patientId = '';
        let isCritical = false;

        if (alert.type === 'critical_case') {
            const p = alert.payload as any; // Type assertion needed due to complex union
            esiLevel = p.esiLevel;
            message = `ESI ${p.esiLevel}: ${p.patient.chiefComplaint}`;
            patientId = p.patientId;
            isCritical = p.esiLevel <= 2;
        } else if (alert.type === 'escalation') {
            const p = alert.payload as any;
            esiLevel = Number(p.esiLevel) || 3;
            message = `Escalated to ${p.assignedRole}`;
            patientId = p.patientId;
            isCritical = true; // Escalations are critical
        }

        return { esiLevel, message, patientId, isCritical };
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className="relative rounded-full p-2 hover:bg-muted transition-colors outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`Notifications: ${count} critical alerts`}
                >
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {count > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-esi-1 text-[10px] font-bold text-white animate-pulse">
                            {count}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h4 className="font-semibold">Notifications</h4>
                    {count > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {count} Critical
                        </span>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground p-4 text-center">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No new notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {alerts.map((alert) => {
                                const { esiLevel, message, patientId, isCritical } = getAlertData(alert);

                                return (
                                    <div key={alert.id} className="p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "mt-1 h-2 w-2 rounded-full shrink-0",
                                                isCritical ? "bg-esi-1" : "bg-esi-3"
                                            )} />
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium leading-none">
                                                    {alert.type === 'escalation' ? 'Escalation Alert' : 'Critical Case'}
                                                </p>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {message}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDismiss(alert.id);
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                                <span className="sr-only">Dismiss</span>
                                            </Button>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full text-xs h-7"
                                                onClick={() => handleCreateCase(patientId)}
                                            >
                                                View Patient
                                                <ChevronRight className="h-3 w-3 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
