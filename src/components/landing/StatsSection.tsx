const stats = [
  {
    value: '90.2',
    unit: '%',
    label: 'ESI 2 ACKNOWLEDGMENT',
    sublabel: 'REAL-TIME TELEMETRY',
    color: 'text-emerald-500',
  },
  {
    value: '100',
    unit: '%',
    label: 'ESCALATION ACCURACY',
    sublabel: 'ZERO MISS TARGETS',
    color: 'text-primary',
  },
  {
    value: '0.00',
    unit: '',
    label: 'FALSE INTERRUPTIONS',
    sublabel: 'OPTIMIZED SIGNAL',
    color: 'text-primary',
  },
  {
    value: '84.5',
    unit: '%',
    label: 'CLINICAL CONSENSUS',
    sublabel: 'PEER REVIEWED DATA',
    color: 'text-emerald-500',
  },
];

export function StatsSection() {
  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Live Performance
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-foreground">
            Operational Efficacy
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-card rounded-xl border border-border p-6 text-center"
            >
              <div className={`font-mono text-3xl md:text-4xl font-bold ${stat.color}`}>
                {stat.value}
                <span className="text-lg">{stat.unit}</span>
              </div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-foreground">
                {stat.label}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {stat.sublabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
