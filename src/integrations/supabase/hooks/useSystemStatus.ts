import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SystemStatus {
    isOnline: boolean;
    latency: number | null;
    lastChecked: Date;
    realtimeStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
}

export function useSystemStatus() {
    const [status, setStatus] = useState<SystemStatus>({
        isOnline: true,
        latency: null,
        lastChecked: new Date(),
        realtimeStatus: 'CONNECTING',
    });

    useEffect(() => {
        let channel: RealtimeChannel;
        let pingInterval: NodeJS.Timeout;

        // Monitor Realtime Connection
        channel = supabase.channel('system_monitor');
        channel.subscribe((status) => {
            setStatus(prev => ({
                ...prev,
                realtimeStatus: status === 'SUBSCRIBED' ? 'CONNECTED' :
                    status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'DISCONNECTED' :
                        'CONNECTING'
            }));
        });

        // Latency Ping check
        const checkConnection = async () => {
            const start = performance.now();
            try {
                const { error } = await supabase.from('audit_logs').select('count', { count: 'exact', head: true });
                if (error) throw error;

                const end = performance.now();
                const latency = Math.round(end - start);

                setStatus(prev => ({
                    ...prev,
                    isOnline: true,
                    latency,
                    lastChecked: new Date(),
                }));
            } catch (err) {
                console.error('Connection check failed:', err);
                setStatus(prev => ({
                    ...prev,
                    isOnline: false,
                    latency: null,
                    lastChecked: new Date(),
                }));
            }
        };

        // Initial check
        checkConnection();

        // Periodic check every 30s
        pingInterval = setInterval(checkConnection, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pingInterval);
        };
    }, []);

    return status;
}
