import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface PhysicianSettings {
  pushAlertsEnabled: boolean;
  silentRoutingEnabled: boolean;
  soundAlertsEnabled: boolean;
  esi1Timeout: number;
  esi2Timeout: number;
  aiDraftingEnabled: boolean;
  showConfidenceIndicators: boolean;
  generateSBARSummaries: boolean;
}

const DEFAULT_SETTINGS: PhysicianSettings = {
  pushAlertsEnabled: true,
  silentRoutingEnabled: true,
  soundAlertsEnabled: true,
  esi1Timeout: 2,
  esi2Timeout: 5,
  aiDraftingEnabled: true,
  showConfidenceIndicators: true,
  generateSBARSummaries: true,
};

// Functions to map between snake_case (DB) and camelCase (App)
const mapToApp = (dbSettings: any): PhysicianSettings => ({
  pushAlertsEnabled: dbSettings.push_alerts_enabled ?? DEFAULT_SETTINGS.pushAlertsEnabled,
  silentRoutingEnabled: dbSettings.silent_routing_enabled ?? DEFAULT_SETTINGS.silentRoutingEnabled,
  soundAlertsEnabled: dbSettings.sound_alerts_enabled ?? DEFAULT_SETTINGS.soundAlertsEnabled,
  esi1Timeout: dbSettings.esi1_timeout ?? DEFAULT_SETTINGS.esi1Timeout,
  esi2Timeout: dbSettings.esi2_timeout ?? DEFAULT_SETTINGS.esi2Timeout,
  aiDraftingEnabled: dbSettings.ai_drafting_enabled ?? DEFAULT_SETTINGS.aiDraftingEnabled,
  showConfidenceIndicators: dbSettings.show_confidence_indicators ?? DEFAULT_SETTINGS.showConfidenceIndicators,
  generateSBARSummaries: dbSettings.generate_sbar_summaries ?? DEFAULT_SETTINGS.generateSBARSummaries,
});

const mapToDb = (settings: PhysicianSettings, userId: string) => ({
  user_id: userId,
  push_alerts_enabled: settings.pushAlertsEnabled,
  silent_routing_enabled: settings.silentRoutingEnabled,
  sound_alerts_enabled: settings.soundAlertsEnabled,
  esi1_timeout: settings.esi1Timeout,
  esi2_timeout: settings.esi2Timeout,
  ai_drafting_enabled: settings.aiDraftingEnabled,
  show_confidence_indicators: settings.showConfidenceIndicators,
  generate_sbar_summaries: settings.generateSBARSummaries,
});

export function usePhysicianSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<PhysicianSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings
  const { data: dbSettings, isSuccess } = useQuery({
    queryKey: ['physician-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase
        .from('physician_settings' as any)
        .select('*')
        .eq('user_id', user.id)
        .single()) as any;

      if (error && error.code !== 'PGRST116') { // PGRST116 is not found
        console.error('Error fetching settings:', error);
      }

      return data;
    },
    enabled: !!user?.id,
  });

  // Init local state when DB data arrives
  useEffect(() => {
    if (isSuccess && dbSettings) {
      const mapped = mapToApp(dbSettings);
      setLocalSettings(mapped);
    } else if (isSuccess && !dbSettings) {
      // No settings found, use defaults
      setLocalSettings(DEFAULT_SETTINGS);
    }
  }, [dbSettings, isSuccess]);

  // Check for changes
  useEffect(() => {
    if (!dbSettings) {
      setHasChanges(JSON.stringify(localSettings) !== JSON.stringify(DEFAULT_SETTINGS));
    } else {
      const original = mapToApp(dbSettings);
      setHasChanges(JSON.stringify(localSettings) !== JSON.stringify(original));
    }
  }, [localSettings, dbSettings]);

  // Mutation to save settings
  const mutation = useMutation({
    mutationFn: async (newSettings: PhysicianSettings) => {
      if (!user?.id) throw new Error('No user');

      const dbPayload = mapToDb(newSettings, user.id);

      const { error } = await (supabase
        .from('physician_settings' as any)
        .upsert(dbPayload)) as any;

      if (error) throw error;
      return newSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['physician-settings', user?.id], mapToDb(data, user!.id)); // cache invalidation helper
      setHasChanges(false);
      // toast handled in component
    },
    onError: (error) => {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  });

  const updateSetting = useCallback(<K extends keyof PhysicianSettings>(
    key: K,
    value: PhysicianSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      await mutation.mutateAsync(localSettings);
      return true;
    } catch {
      return false;
    }
  }, [mutation, localSettings]);

  const resetSettings = useCallback(() => {
    setLocalSettings(DEFAULT_SETTINGS);
    // Don't auto-save on reset, let user click save
  }, []);

  return {
    settings: localSettings,
    updateSetting,
    saveSettings,
    resetSettings,
    hasChanges,
  };
}
