import { ClipboardList, CheckCircle2, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    number: '1',
    title: 'Intake',
    description: 'Real-time symptom analysis with automated report drafting.',
    icon: ClipboardList,
  },
  {
    number: '2',
    title: 'Validation',
    description: 'Provider-led verification with one-click decision support.',
    icon: CheckCircle2,
    featured: true,
  },
  {
    number: '3',
    title: 'Routing',
    description: 'Automated ESI-based routing to optimal hospital resources.',
    icon: GitBranch,
  },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Precision Workflow
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-foreground">
            Streamlined Clinical Intelligence
          </h2>
        </div>

        {/* Workflow Steps */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step) => (
            <div
              key={step.number}
              className={cn(
                'flex flex-col items-center text-center p-6 rounded-2xl transition-all',
                step.featured
                  ? 'bg-card border border-border shadow-lg'
                  : 'bg-transparent'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-xl mb-6',
                  step.featured
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                <step.icon className="h-6 w-6" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step.number}. {step.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {/* Dots indicator for featured */}
              {step.featured && (
                <div className="flex gap-1 mt-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
