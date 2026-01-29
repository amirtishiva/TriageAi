import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              Live Clinical Processing
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground"
          >
            Clinical Reliability
            <br />
            <span className="font-serif italic text-primary">by Design</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-xl"
          >
            A high-performance AI triage platform for modern health systems.
            Precise routing, explainable logic, and provider-first control.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
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
          </motion.div>
        </div>
      </div>
    </section>
  );
}
