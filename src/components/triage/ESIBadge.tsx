import { cn } from '@/lib/utils';
import { ESILevel, ESI_LABELS } from '@/types/triage';

interface ESIBadgeProps {
  level: ESILevel;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  variant?: 'default' | 'solid' | 'outline';
  className?: string;
}

export function ESIBadge({ 
  level, 
  size = 'md', 
  showLabel = false, 
  variant = 'default',
  className 
}: ESIBadgeProps) {
  const sizeClasses = {
    xs: 'h-5 min-w-5 text-[10px] px-1.5',
    sm: 'h-6 min-w-6 text-xs px-2',
    md: 'h-7 min-w-7 text-sm px-2.5',
    lg: 'h-8 min-w-8 text-sm px-3',
    xl: 'h-10 min-w-10 text-base px-4',
  };

  const labelSizes = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-sm',
  };

  const badgeClass = {
    1: 'esi-badge-1',
    2: 'esi-badge-2',
    3: 'esi-badge-3',
    4: 'esi-badge-4',
    5: 'esi-badge-5',
  }[level];

  const solidColors = {
    1: 'bg-esi-1 text-white border-transparent',
    2: 'bg-esi-2 text-white border-transparent',
    3: 'bg-esi-3 text-black border-transparent',
    4: 'bg-esi-4 text-white border-transparent',
    5: 'bg-esi-5 text-white border-transparent',
  }[level];

  return (
    <div 
      className={cn(
        'esi-badge font-semibold',
        sizeClasses[size],
        variant === 'solid' ? solidColors : badgeClass,
        level === 1 && 'animate-pulse-critical',
        className
      )}
    >
      <span className="font-mono font-bold">ESI{level}</span>
      {showLabel && (
        <span className={cn('ml-1.5 font-medium', labelSizes[size])}>
          {ESI_LABELS[level].label}
        </span>
      )}
    </div>
  );
}

export function ESILevelSelector({ 
  value, 
  onChange, 
  disabled = false 
}: { 
  value: ESILevel; 
  onChange: (level: ESILevel) => void;
  disabled?: boolean;
}) {
  const levels: ESILevel[] = [1, 2, 3, 4, 5];

  return (
    <div className="flex gap-2 flex-wrap">
      {levels.map((level) => (
        <button
          key={level}
          type="button"
          disabled={disabled}
          onClick={() => onChange(level)}
          className={cn(
            'flex flex-col items-center rounded-xl border-2 p-3 transition-all duration-200',
            'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
            value === level 
              ? 'border-primary shadow-glow-primary bg-primary/5' 
              : 'border-border bg-card hover:border-muted-foreground/30',
            disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
          )}
        >
          <ESIBadge level={level} size="md" />
          <span className="mt-2 text-xs font-medium text-muted-foreground">
            {ESI_LABELS[level].label}
          </span>
        </button>
      ))}
    </div>
  );
}

// Large circular ESI display for AI recommendation panels
export function ESICircle({ 
  level, 
  size = 'md',
  showRisk = true,
  className 
}: { 
  level: ESILevel; 
  size?: 'sm' | 'md' | 'lg';
  showRisk?: boolean;
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const numberSizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl',
  };

  const riskLabels = {
    1: 'CRITICAL',
    2: 'HIGH RISK',
    3: 'URGENT',
    4: 'LOW RISK',
    5: 'NON-URGENT',
  };

  const colors = {
    1: 'border-esi-1 text-esi-1 shadow-glow-critical',
    2: 'border-esi-2 text-esi-2 shadow-glow-warning',
    3: 'border-esi-3 text-esi-3',
    4: 'border-esi-4 text-esi-4',
    5: 'border-esi-5 text-esi-5',
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div 
        className={cn(
          'rounded-full border-4 flex flex-col items-center justify-center',
          sizeClasses[size],
          colors[level],
          level <= 2 && 'animate-pulse-critical'
        )}
      >
        <span className={cn('font-mono font-bold', numberSizes[size])}>
          {level}
        </span>
      </div>
      {showRisk && (
        <span className={cn(
          'text-xs font-semibold tracking-wide uppercase',
          level === 1 && 'text-esi-1',
          level === 2 && 'text-esi-2',
          level === 3 && 'text-esi-3',
          level === 4 && 'text-esi-4',
          level === 5 && 'text-esi-5',
        )}>
          {riskLabels[level]}
        </span>
      )}
    </div>
  );
}
