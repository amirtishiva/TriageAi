import {
  Navbar,
  HeroSection,
  WorkflowSection,
  StatsSection,
  TrustSection,
  Footer,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <WorkflowSection />
        <StatsSection />
        <TrustSection />
      </main>
      <Footer />
    </div>
  );
}
