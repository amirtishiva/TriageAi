import { AnimatedSection } from './AnimatedSection';

export function Footer() {
  return (
    <footer id="documentation" className="py-8 bg-muted/30 border-t border-border">
      <div className="container mx-auto px-6 text-center">
        <AnimatedSection>
          <p className="text-xs text-muted-foreground">
            © 2024 TRIAGEAI HEALTH SYSTEMS INC. | CLINICAL DECISION SUPPORT ONLY |
            PROVIDER ASSUMES FINAL RESPONSIBILITY
          </p>
        </AnimatedSection>
      </div>
    </footer>
  );
}
