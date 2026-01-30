import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { usePhysicianSettings } from '@/integrations/supabase/hooks/usePhysicianSettings';
import {
  Bell,
  Clock,
  Shield,
  Server,
  CheckCircle2,
  AlertTriangle,
  Info,
  Database,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { settings, updateSetting, saveSettings, resetSettings, hasChanges } = usePhysicianSettings();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveSettings();
    setIsSaving(false);

    if (success) {
      toast.success('Settings saved successfully');
    } else {
      toast.error('Failed to save settings');
    }
  };

  const handleReset = () => {
    resetSettings();
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure system preferences and integrations
        </p>
      </div>

      {/* System Status */}
      <Card className="clinical-card border-confidence-high/30 bg-confidence-high/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-confidence-high/10">
                <CheckCircle2 className="h-5 w-5 text-confidence-high" />
              </div>
              <div>
                <p className="font-medium">All Systems Operational</p>
                <p className="text-sm text-muted-foreground">Backend connection active • AI models healthy</p>
              </div>
            </div>
            <Badge className="bg-confidence-high">Online</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="clinical-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alert Configuration
          </CardTitle>
          <CardDescription>
            Configure when and how alerts are triggered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-alerts">ESI Level 1-2 Push Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Send immediate push notifications for critical cases
              </p>
            </div>
            <Switch
              id="push-alerts"
              checked={settings.pushAlertsEnabled}
              onCheckedChange={(checked) => updateSetting('pushAlertsEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="silent-routing">ESI Level 3-5 Silent Routing</Label>
              <p className="text-sm text-muted-foreground">
                Route lower acuity cases to track board without alerts
              </p>
            </div>
            <Switch
              id="silent-routing"
              checked={settings.silentRoutingEnabled}
              onCheckedChange={(checked) => updateSetting('silentRoutingEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-alerts">Sound Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Play audio notification for critical alerts
              </p>
            </div>
            <Switch
              id="sound-alerts"
              checked={settings.soundAlertsEnabled}
              onCheckedChange={(checked) => updateSetting('soundAlertsEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Escalation Settings */}
      <Card className="clinical-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Escalation Timeouts
          </CardTitle>
          <CardDescription>
            Configure automatic escalation timers for unacknowledged cases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="esi1-timeout">ESI Level 1 Timeout</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="esi1-timeout"
                  type="number"
                  value={settings.esi1Timeout}
                  onChange={(e) => updateSetting('esi1Timeout', +e.target.value)}
                  className="w-20 font-vitals"
                  min={1}
                  max={10}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="esi2-timeout">ESI Level 2 Timeout</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="esi2-timeout"
                  type="number"
                  value={settings.esi2Timeout}
                  onChange={(e) => updateSetting('esi2Timeout', +e.target.value)}
                  className="w-20 font-vitals"
                  min={1}
                  max={15}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Unacknowledged cases will automatically escalate to the next provider
              in the chain after the timeout period expires.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Model Settings */}
      <Card className="clinical-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            AI Model Configuration
          </CardTitle>
          <CardDescription>
            Configure AI triage model behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-drafting">Enable AI Drafting</Label>
              <p className="text-sm text-muted-foreground">
                Allow AI to generate draft ESI recommendations
              </p>
            </div>
            <Switch
              id="ai-drafting"
              checked={settings.aiDraftingEnabled}
              onCheckedChange={(checked) => updateSetting('aiDraftingEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="confidence-indicators">Show Confidence Indicators</Label>
              <p className="text-sm text-muted-foreground">
                Display AI confidence levels and influencing factors
              </p>
            </div>
            <Switch
              id="confidence-indicators"
              checked={settings.showConfidenceIndicators}
              onCheckedChange={(checked) => updateSetting('showConfidenceIndicators', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sbar-summaries">Generate SBAR Summaries</Label>
              <p className="text-sm text-muted-foreground">
                Automatically generate structured handoff summaries
              </p>
            </div>
            <Switch
              id="sbar-summaries"
              checked={settings.generateSBARSummaries}
              onCheckedChange={(checked) => updateSetting('generateSBARSummaries', checked)}
            />
          </div>

          <div className="p-3 bg-esi-2-bg border border-esi-2/20 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-esi-2 mt-0.5 shrink-0" />
            <p className="text-sm">
              <strong>Human-in-the-loop required:</strong> AI cannot finalize triage decisions.
              Nurse validation is mandatory for all cases.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card className="clinical-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Integration Status
          </CardTitle>
          <CardDescription>
            Backend and external system connections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Database</p>
                <p className="text-xs text-muted-foreground">Triage AI Cloud PostgreSQL</p>
              </div>
            </div>
            <Badge className="bg-confidence-high">Connected</Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Real-time Updates</p>
                <p className="text-xs text-muted-foreground">WebSocket Connection</p>
              </div>
            </div>
            <Badge className="bg-confidence-high">Active</Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Clinical AI Model</p>
                <p className="text-xs text-muted-foreground">Gemini 2.0 Flash</p>
              </div>
            </div>
            <Badge className="bg-confidence-high">Healthy</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button
          size="lg"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  );
}
