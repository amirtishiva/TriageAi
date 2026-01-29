import { Button } from '@/components/ui/button';

export function HeroSection() {
  const scrollToSection = (id: string) => {
    const element = document.querySelector(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto px-6 py-24 md:py-32">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-8">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              Live Clinical Processing
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
            Clinical Reliability
            <br />
            <span className="font-serif italic text-primary">by Design</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-muted-foreground max-w-xl">
            A high-performance AI triage platform for modern health systems.
            Precise routing, explainable logic, and provider-first control.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              onClick={() => scrollToSection('#safety')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
            >
              Safety Documentation
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToSection('#workflow')}
              className="px-8"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
