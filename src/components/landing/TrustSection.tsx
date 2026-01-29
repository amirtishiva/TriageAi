import { User, Lightbulb, Layers } from 'lucide-react';

const features = [
  {
    icon: User,
    title: 'Human-in-the-Loop',
    description:
      'Built on a "Provider-First" philosophy. AI never acts autonomously; every decision requires a licensed provider\'s validation.',
  },
  {
    icon: Lightbulb,
    title: 'Explainable Logic',
    description:
      'Transparent decision paths for every triage event, citing specific clinical indicators and vital parameters.',
  },
  {
    icon: Layers,
    title: 'SaMD Alignment',
    description:
      'Conforms to Software as a Medical Device quality standards and regulatory frameworks for decision support systems.',
  },
];

const badges = [
  { label: 'HIPAA COMPLIANT', icon: '🛡️' },
  { label: 'SMART on FHIR', icon: '📋' },
  { label: 'SOC2 TYPE II', icon: '🔒' },
  { label: 'HITRUST', icon: '🏥' },
];

export function TrustSection() {
  return (
    <section id="safety" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Enterprise Trust
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-foreground">
            Regulated Safety Framework
          </h2>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {features.map((feature) => (
            <div key={feature.title} className="text-center md:text-left">
              {/* Icon */}
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground mb-4">
                <feature.icon className="h-6 w-6" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Compliance Badges */}
        <div
          id="compliance"
          className="flex flex-wrap justify-center gap-8 pt-8 border-t border-border"
        >
          {badges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <span className="text-lg">{badge.icon}</span>
              <span className="text-xs font-medium uppercase tracking-wide">
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
