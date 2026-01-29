import { cn } from '@/lib/utils';
import { VitalSigns } from '@/types/triage';
import { Heart, Wind, Thermometer, Droplets, Activity, Gauge } from 'lucide-react';

interface VitalsDisplayProps {
  vitals: VitalSigns;
  layout?: 'grid' | 'inline' | 'compact';
  showLabels?: boolean;
}

interface VitalItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  layout: 'grid' | 'inline' | 'compact';
  showLabel?: boolean;
}

function VitalItem({ icon, label, value, unit, status, layout, showLabel = true }: VitalItemProps) {
  const statusClasses = {
    normal: 'vitals-normal',
    warning: 'vitals-warning',
    critical: 'vitals-critical',
  };

  const statusTextColor = {
    normal: 'text-vitals-normal',
    warning: 'text-vitals-warning',
    critical: 'text-vitals-critical',
  };

  if (layout === 'compact') {
    return (
      <div className={cn(
        'flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
        statusClasses[status]
      )}>
        <span className="opacity-70">{icon}</span>
        <span className="font-mono text-sm font-semibold">{value}</span>
        <span className="text-xs opacity-60">{unit}</span>
      </div>
    );
  }

  if (layout === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', statusClasses[status])}>
        <span className="opacity-70">{icon}</span>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-lg font-bold">{value}</span>
          <span className="text-xs opacity-60">{unit}</span>
        </div>
        {showLabel && (
          <span className="text-xs opacity-70 ml-1">{label}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('vitals-card rounded-xl', statusClasses[status])}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
        <span className="opacity-70">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn('font-mono text-2xl font-bold', statusTextColor[status])}>
          {value}
        </span>
        <span className="text-xs opacity-60">{unit}</span>
      </div>
    </div>
  );
}

function getVitalStatus(type: string, value: number): 'normal' | 'warning' | 'critical' {
  switch (type) {
    case 'hr':
      if (value < 50 || value > 120) return 'critical';
      if (value < 60 || value > 100) return 'warning';
      return 'normal';
    case 'systolic':
      if (value > 180 || value < 90) return 'critical';
      if (value > 140 || value < 100) return 'warning';
      return 'normal';
    case 'rr':
      if (value > 28 || value < 10) return 'critical';
      if (value > 22 || value < 12) return 'warning';
      return 'normal';
    case 'spo2':
      if (value < 90) return 'critical';
      if (value < 95) return 'warning';
      return 'normal';
    case 'temp':
      if (value > 103 || value < 95) return 'critical';
      if (value > 100.4 || value < 97) return 'warning';
      return 'normal';
    case 'pain':
      if (value >= 8) return 'critical';
      if (value >= 5) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
}

export function VitalsDisplay({ vitals, layout = 'grid', showLabels = true }: VitalsDisplayProps) {
  const iconClass = layout === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  const vitalsData = [
    {
      icon: <Heart className={iconClass} />,
      label: 'Heart Rate',
      value: vitals.heartRate,
      unit: 'BPM',
      status: getVitalStatus('hr', vitals.heartRate),
    },
    {
      icon: <Gauge className={iconClass} />,
      label: 'Blood Pressure',
      value: `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`,
      unit: 'mmHg',
      status: getVitalStatus('systolic', vitals.bloodPressure.systolic),
    },
    {
      icon: <Droplets className={iconClass} />,
      label: 'SpO2',
      value: vitals.oxygenSaturation,
      unit: '%',
      status: getVitalStatus('spo2', vitals.oxygenSaturation),
    },
    {
      icon: <Wind className={iconClass} />,
      label: 'Resp Rate',
      value: vitals.respiratoryRate,
      unit: 'RR',
      status: getVitalStatus('rr', vitals.respiratoryRate),
    },
    {
      icon: <Thermometer className={iconClass} />,
      label: 'Temperature',
      value: vitals.temperature.toFixed(1),
      unit: '°F',
      status: getVitalStatus('temp', vitals.temperature),
    },
    {
      icon: <Activity className={iconClass} />,
      label: 'Pain Level',
      value: vitals.painLevel,
      unit: '/10',
      status: getVitalStatus('pain', vitals.painLevel),
    },
  ];

  if (layout === 'compact') {
    return (
      <div className="flex flex-wrap gap-2">
        {vitalsData.map((vital) => (
          <VitalItem key={vital.label} {...vital} layout={layout} showLabel={showLabels} />
        ))}
      </div>
    );
  }

  if (layout === 'inline') {
    return (
      <div className="flex flex-wrap gap-3">
        {vitalsData.map((vital) => (
          <VitalItem key={vital.label} {...vital} layout={layout} showLabel={showLabels} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {vitalsData.map((vital) => (
        <VitalItem key={vital.label} {...vital} layout={layout} showLabel={showLabels} />
      ))}
    </div>
  );
}

// Compact horizontal vitals for headers
export function VitalsBar({ vitals }: { vitals: VitalSigns }) {
  const items = [
    { label: 'HR', value: vitals.heartRate, unit: '', status: getVitalStatus('hr', vitals.heartRate) },
    { label: 'BP', value: `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`, unit: '', status: getVitalStatus('systolic', vitals.bloodPressure.systolic) },
    { label: 'SpO2', value: vitals.oxygenSaturation, unit: '%', status: getVitalStatus('spo2', vitals.oxygenSaturation) },
    { label: 'RR', value: vitals.respiratoryRate, unit: '', status: getVitalStatus('rr', vitals.respiratoryRate) },
  ];

  const statusColor = {
    normal: 'text-vitals-normal',
    warning: 'text-vitals-warning',
    critical: 'text-vitals-critical',
  };

  return (
    <div className="flex items-center gap-4 text-sm">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs">{item.label}:</span>
          <span className={cn('font-mono font-semibold', statusColor[item.status])}>
            {item.value}{item.unit}
          </span>
          {i < items.length - 1 && <span className="text-border ml-2">•</span>}
        </div>
      ))}
    </div>
  );
}
